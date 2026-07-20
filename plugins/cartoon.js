const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Memory Session Store for Number Replies
if (!global.slcSession) global.slcSession = {};

// ════════════════════════════════════════════════════════
// SHARED NUMBER REPLY HANDLER (prefix nathuwa call karanna puluwan)
// Main bot file eke "`global.handleCartoonReply(msg, sender, socket, reply)`" call karanna.
// ════════════════════════════════════════════════════════
global.handleCartoonReply = async ({ socket, msg, sender, reply, numStr }) => {

    // Reply ekak da kiyala check karanava
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo
                      || msg.message?.imageMessage?.contextInfo
                      || msg.message?.videoMessage?.contextInfo;

    if (!contextInfo || !contextInfo.stanzaId) return false; // reply ekak neme — ignore

    const repliedMsgId = contextInfo.stanzaId;
    const session = global.slcSession[repliedMsgId];

    if (!session) return false; // apege bot eke message ekak neme — ignore

    // Kaalaya pawichchi unad kiyala balananwa
    if (Date.now() > session.expiresAt) {
        delete global.slcSession[repliedMsgId];
        await reply("❌ *මෙම පණිවිඩයේ කාලය (විනාඩි 5) අවසන් වී ඇත. කරුණාකර නැවත .cartoon භාවිතයෙන් Search කරන්න.*");
        return true;
    }

    const index = parseInt(numStr) - 1;
    if (isNaN(index) || index < 0 || index >= session.items.length) {
        await reply("❌ *කරුණාකර ලිස්ට් එකේ ඇති නිවැරදි අංකයක් ලබා දෙන්න.*");
        return true;
    }

    const selectedItem = session.items[index];

    // ── SEARCH LIST → DETAILS ──
    if (session.type === 'search') {
        try {
            const API_KEY = "zan_FIAO7Ayh_eo1vllkep6";
            const BASE_API = "https://api.zanta-mini.store/api/slcartoons";

            await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });

            const urlParam = encodeURIComponent(selectedItem.url);
            const dlRes = await axios.get(`${BASE_API}/dl?apiKey=${API_KEY}&text=${urlParam}`);

            if (!dlRes.data.results) throw new Error("තොරතුරු ලබාගත නොහැක.");

            const details = dlRes.data.results;

            let capText = `*🎬 SADEW-MINI CARTOON DETAILS*\n\n`;
            capText += `📌 *Title:* ${selectedItem.title}\n`;
            capText += `🏷️ *Type:* ${details.type}\n`;
            if (details.total_episodes) capText += `📺 *Total Episodes:* ${details.total_episodes}\n`;
            capText += `\n*📥 DOWNLOAD LINKS:*\n\n`;

            const epItems = [];
            let epCounter = 1;

            if (details.episodes && details.episodes.length > 0) {
                details.episodes.forEach((ep) => {
                    if (ep.stream_url) {
                        capText += `*${epCounter}.* ${ep.title}\n`;
                        epItems.push({ url: ep.stream_url, title: `${selectedItem.title} - ${ep.title}`, quality: "HD" });
                        epCounter++;
                    }
                });
            } else if (details.download_links && details.download_links.length > 0) {
                details.download_links.forEach((dl) => {
                    if (dl.final_link && !dl.final_link.includes('t.me')) {
                        capText += `*${epCounter}.* Download (${dl.info || "Direct"})\n`;
                        epItems.push({ url: dl.final_link, title: selectedItem.title, quality: dl.info || "Direct" });
                        epCounter++;
                    }
                });
            }

            capText += `\n> *ඔබට අවශ්ය Episode එකෙහි අංකය මෙම පණිවිඩයට Reply කරන්න.* 🔢\n> ⏳ _විනාඩි 5ක් ඇතුළත Reply කරන්න._`;

            const msgOpts = { caption: capText, footer: "👑 SADEW-MINI 👑" };
            if (selectedItem.image) msgOpts.image = { url: selectedItem.image };

            const sentEpMsg = await socket.sendMessage(sender, msgOpts, { quoted: msg });
            await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

            global.slcSession[sentEpMsg.key.id] = {
                type: 'episodes',
                items: epItems,
                expiresAt: Date.now() + 5 * 60 * 1000
            };
            setTimeout(() => { delete global.slcSession[sentEpMsg.key.id]; }, 5 * 60 * 1000);

        } catch (e) {
            console.error("Details Error:", e.message);
            await reply(`❌ *තොරතුරු ලබාගැනීමට නොහැකි විය!*`);
        }
        return true;
    }

    // ── EPISODE LIST → DOWNLOAD ──
    else if (session.type === 'episodes') {
        try {
            await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });
            await reply(`🔍 *Processing Download...*\n🎬 ${selectedItem.title}\n\n_Server eka download karala hitinava, kisi vela..._`);

            const safeTitle = selectedItem.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
            const finalFileName = `SadewMini_${safeTitle}.mp4`;
            const tempFilePath = path.join('/tmp', finalFileName); // /tmp use karanava — safer
            const writer = fs.createWriteStream(tempFilePath);

            const fileRes = await axios({
                method: 'GET',
                url: selectedItem.url,
                responseType: 'stream',
                timeout: 0,
                headers: { 'User-Agent': 'Mozilla/5.0' },
                maxRedirects: 10
            });

            fileRes.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            const stats = fs.statSync(tempFilePath);
            const actualSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

            if (stats.size > 2000 * 1024 * 1024) {
                fs.unlinkSync(tempFilePath);
                return await reply(`❌ *File is too large for WhatsApp!* (${actualSizeMB} MB)`);
            }

            await socket.sendMessage(sender, { react: { text: '⬆️', key: msg.key } });

            await socket.sendMessage(sender, {
                document: { url: `file://${tempFilePath}` },
                mimetype: 'video/mp4',
                fileName: finalFileName,
                caption: `*🎬 Title:* ${selectedItem.title}\n📦 *Size:* ${actualSizeMB} MB\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
            }, { quoted: msg });

            await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

        } catch (e) {
            console.error("Download Error:", e.message);
            await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
            await reply(`❌ *බාගත කිරීම අසාර්ථක විය!*`);
        }
        return true;
    }

    return false;
};

// ════════════════════════════════════════════════════════
// MODULE EXPORT — prefix ekak athi commands
// ════════════════════════════════════════════════════════
module.exports = {
    name: "cartoon",
    category: 1,
    description: "Search and download Sinhala cartoons via Number Reply",
    commands: ["cartoon"], // 🔥 Prefix commands — number ewa main handler eke handle karanava

    handler: async ({ socket, msg, sender, command, args, reply }) => {
        const API_KEY = "zan_FIAO7Ayh_eo1vllkep6";
        const BASE_API = "https://api.zanta-mini.store/api/slcartoons";

        // ==============================================================
        // MAIN COMMAND (.cartoon name) — SEARCH
        // ==============================================================
        if (command === "cartoon") {
            const query = args.join(' ').trim();
            if (!query) return reply("🎥 *කරුණාකර කාටූන් එකක නමක් ලබා දෙන්න!*\n💡 උදා: `.cartoon ben 10`");

            try {
                await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } });

                const searchUrl = `${BASE_API}/search?apiKey=${API_KEY}&text=${encodeURIComponent(query)}`;
                const { data } = await axios.get(searchUrl);

                if (!data.success || !data.results || data.results.length === 0) {
                    await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                    return reply("❌ *සමාවෙන්න, ඔබ සෙවූ කාටූනය සොයාගත නොහැකි විය!*");
                }

                const results = data.results.slice(0, 15);
                const firstImage = results[0].thumbnail;

                let listText = `*🔍 SADEW-MINI CARTOON SEARCH*\n\n`;
                const searchItems = [];

                results.forEach((m, i) => {
                    listText += `*${i + 1}.* ${m.title}\n`;
                    listText += `🌟 *Rating:* ${m.rating} | 🎬 *Quality:* ${m.quality}\n\n`;
                    searchItems.push({ url: m.url, title: m.title, image: m.thumbnail });
                });

                listText += `> *ඔබට අවශ්ය කාටූනයෙහි අංකය (1, 2, 3...) prefix නැතිව Reply කරන්න.* 🔢\n> ⏳ _(මෙය විනාඩි 5කින් කල් ඉකුත් වේ)_`;

                const msgOpts = { caption: listText, footer: "👑 SADEW-MINI 👑" };
                if (firstImage) msgOpts.image = { url: firstImage };

                const sentSearchMsg = await socket.sendMessage(sender, msgOpts, { quoted: msg });
                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

                global.slcSession[sentSearchMsg.key.id] = {
                    type: 'search',
                    items: searchItems,
                    expiresAt: Date.now() + 5 * 60 * 1000
                };
                setTimeout(() => { delete global.slcSession[sentSearchMsg.key.id]; }, 5 * 60 * 1000);

            } catch (e) {
                console.error("Search Error:", e.message);
                reply(`❌ *සෙවුම් දෝෂයකි! (Error: ${e.message})*`);
            }
        }
    }
};
