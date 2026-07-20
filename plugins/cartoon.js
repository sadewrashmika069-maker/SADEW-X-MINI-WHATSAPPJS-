const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Memory Session Store for Number Replies
if (!global.slcSession) global.slcSession = {};

// 1 ඉඳන් 50 වෙනකන් ඉලක්කම් ටික හදාගන්නවා (කමාන්ඩ්ස් විදිහට අල්ලන්න)
const numberCommands = Array.from({ length: 50 }, (_, i) => (i + 1).toString());

module.exports = {
    name: "cartoon",
    category: 1,
    description: "Search and download Sinhala cartoons via Number Reply",
    commands: ["cartoon", ...numberCommands], // 🔥 ඉලක්කම් ටික ආයෙත් දැම්මා!
    
    handler: async ({ socket, msg, sender, command, args, reply, body }) => {
        const API_KEY = "zan_FIAO7Ayh_eo1vllkep6";
        const BASE_API = "https://api.zanta-mini.store/api/slcartoons";

        // 🔥 Prefix එක්ක ආවත්, නැතුව ආවත් මැසේජ් එකේ තියෙන ඇත්තම අකුරු/ඉලක්කම් ටික ගන්නවා
        let rawText = "";
        if (msg.message?.extendedTextMessage?.text) {
            rawText = msg.message.extendedTextMessage.text;
        } else if (msg.message?.conversation) {
            rawText = msg.message.conversation;
        } else if (body) {
            rawText = body;
        } else if (command) {
            rawText = command;
        }
        
        // Prefix එකක් (. , / !) තිබ්බොත් ඒක අයින් කරලා තනිකරම ඉලක්කම විතරක් ගන්නවා
        rawText = rawText.trim().replace(/^[.#/!]/, '');

        // ==============================================================
        // 1. NUMBER REPLY HANDLER (ඉලක්කමක් විතරක් Reply කළාම)
        // ==============================================================
        if (/^\d+$/.test(rawText)) {
            const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
            
            if (contextInfo && contextInfo.stanzaId) {
                const repliedMsgId = contextInfo.stanzaId;
                const session = global.slcSession[repliedMsgId];

                // ඒ Reply කරලා තියෙන්නේ අපේ බොට්ගේ ලිස්ට් එකකට නම් විතරක් වැඩ කරනවා
                if (session) {
                    // විනාඩි 5 පැනලද කියලා බලනවා
                    if (Date.now() > session.expiresAt) {
                        delete global.slcSession[repliedMsgId];
                        return reply("❌ *මෙම පණිවිඩයේ කාලය (විනාඩි 5) අවසන් වී ඇත. කරුණාකර නැවත .cartoon භාවිතයෙන් Search කරන්න.*");
                    }

                    const index = parseInt(rawText) - 1;
                    if (index < 0 || index >= session.items.length) {
                        return reply("❌ *කරුණාකර ලිස්ට් එකේ ඇති නිවැරදි අංකයක් ලබා දෙන්න.*");
                    }

                    const selectedItem = session.items[index];

                    // --- 1.1 SEARCH LIST එකට අංකයක් රිප්ලයි කළාම (DETAILS ගැනීම) ---
                    if (session.type === 'search') {
                        try {
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
                                        epItems.push({ 
                                            url: ep.stream_url, 
                                            title: `${selectedItem.title} - ${ep.title}`, 
                                            quality: "HD" 
                                        });
                                        epCounter++;
                                    }
                                });
                            } else if (details.download_links && details.download_links.length > 0) {
                                details.download_links.forEach((dl) => {
                                    if (dl.final_link && !dl.final_link.includes('t.me')) { 
                                        capText += `*${epCounter}.* Download (${dl.info || "Direct"})\n`;
                                        epItems.push({ 
                                            url: dl.final_link, 
                                            title: selectedItem.title, 
                                            quality: dl.info || "Direct" 
                                        });
                                        epCounter++;
                                    }
                                });
                            }

                            capText += `\n> *ඔබට අවශ්‍ය Episode එකෙහි අංකය මෙම පණිවිඩයට Reply කරන්න.* 🔢\n> ⏳ _විනාඩි 5ක් ඇතුළත ඕනෑම අංකයක් කීප වතාවක් වුවද Reply කළ හැක._`;

                            const msgOpts = { caption: capText, footer: "👑 SADEW-MINI 👑" };
                            if (selectedItem.image) msgOpts.image = { url: selectedItem.image };

                            const sentEpMsg = await socket.sendMessage(sender, msgOpts, { quoted: msg });
                            await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

                            global.slcSession[sentEpMsg.key.id] = {
                                type: 'episodes',
                                items: epItems,
                                expiresAt: Date.now() + 5 * 60 * 1000
                            };

                            setTimeout(() => {
                                if (global.slcSession[sentEpMsg.key.id]) delete global.slcSession[sentEpMsg.key.id];
                            }, 5 * 60 * 1000);

                        } catch (e) {
                            console.error("Details Error:", e.message);
                            reply(`❌ *තොරතුරු ලබාගැනීමට නොහැකි විය!*`);
                        }
                        return; 
                    }
                    
                    // --- 1.2 EPISODE LIST එකට අංකයක් රිප්ලයි කළාම (DOWNLOAD කිරීම) ---
                    else if (session.type === 'episodes') {
                        try {
                            await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });
                            await reply(`🔍 *Processing Download...*\n🎬 ${selectedItem.title}\n\n_Please wait, downloading to server..._`);

                            const safeTitle = selectedItem.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
                            const finalFileName = `SadewMini_${safeTitle}.mp4`;
                            const tempFilePath = path.join(__dirname, finalFileName);
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
                                return reply(`❌ *File is too large for WhatsApp!* (${actualSizeMB} MB)`);
                            }

                            await socket.sendMessage(sender, { react: { text: '⬆️', key: msg.key } });

                            await socket.sendMessage(sender, {
                                document: { url: tempFilePath },
                                mimetype: 'video/mp4',
                                fileName: finalFileName,
                                caption: `*🎬 Title:* ${selectedItem.title}\n📦 *Size:* ${actualSizeMB} MB\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
                            }, { quoted: msg });

                            await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });
                            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

                        } catch (e) {
                            console.error("Download Error:", e.message);
                            await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                            reply(`❌ *බාගත කිරීම අසාර්ථක විය!*`);
                        }
                        return; 
                    }
                }
            }
        }

        // ==============================================================
        // 2. MAIN COMMAND (.cartoon name) - SEARCH කිරීම
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

                // උපරිම රිසල්ට්ස් 15ක් ගමු
                const results = data.results.slice(0, 15);
                const firstImage = results[0].thumbnail;

                let listText = `*🔍 SADEW-MINI CARTOON SEARCH*\n\n`;
                const searchItems = [];

                results.forEach((m, i) => {
                    listText += `*${i + 1}.* ${m.title}\n`;
                    listText += `🌟 *Rating:* ${m.rating} | 🎬 *Quality:* ${m.quality}\n\n`;

                    searchItems.push({
                        url: m.url,
                        title: m.title,
                        image: m.thumbnail
                    });
                });

                listText += `> *ඔබට අවශ්‍ය කාටූනයෙහි අංකය මෙම පණිවිඩයට Reply කරන්න.* 🔢\n> ⏳ _(මෙය විනාඩි 5කින් කල් ඉකුත් වේ)_`;

                const msgOpts = { caption: listText, footer: "👑 SADEW-MINI 👑" };
                if (firstImage) msgOpts.image = { url: firstImage };

                // Search මැසේජ් එක යවනවා
                const sentSearchMsg = await socket.sendMessage(sender, msgOpts, { quoted: msg });
                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

                // යවපු මැසේජ් එකේ ID එකට Search Session එක හදනවා
                global.slcSession[sentSearchMsg.key.id] = {
                    type: 'search',
                    items: searchItems,
                    expiresAt: Date.now() + 5 * 60 * 1000
                };

                // විනාඩි 5කින් මැසේජ් එකේ මතකය මකනවා
                setTimeout(() => {
                    if (global.slcSession[sentSearchMsg.key.id]) delete global.slcSession[sentSearchMsg.key.id];
                }, 5 * 60 * 1000);

            } catch (e) {
                console.error("Search Error:", e.message);
                reply(`❌ *සෙවුම් දෝෂයකි! (Error: ${e.message})*`);
            }
        }
    }
};
