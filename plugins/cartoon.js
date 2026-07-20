const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Memory Session Store for Cartoons
if (!global.slcStore) global.slcStore = {};

module.exports = {
    name: "slcartoon",
    category: 1,
    description: "Search and download Sinhala cartoons from sinhalacartoons.com via Zanta API",
    commands: ["cartoon"],
    
    handler: async ({ socket, msg, sender, command, args, reply }) => {
        const API_KEY = "zan_FIAO7Ayh_eo1vllkep6";
        const BASE_API = "https://api.zanta-mini.store/api/slcartoons";

        // ==============================================================
        // 1. SEARCH CARTOON (.slc name)
        // ==============================================================
        if (command === "slcartoon" || command === "slc") {
            const query = args.join(' ').trim();
            if (!query) return reply("🎥 *කරුණාකර කාටූන් එකක නමක් ලබා දෙන්න!*\n💡 උදා: `.slc ben 10`");

            try {
                await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } });

                // Search API එකට කෝල් කිරීම
                const searchUrl = `${BASE_API}/search?apiKey=${API_KEY}&text=${encodeURIComponent(query)}`;
                const { data } = await axios.get(searchUrl);

                if (!data.success || !data.results || data.results.length === 0) {
                    await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                    return reply("❌ *සමාවෙන්න, ඔබ සෙවූ කාටූනය සොයාගත නොහැකි විය!*");
                }

                // රිසල්ට්ස් 10ක් විතරක් ගමු
                const results = data.results.slice(0, 10);
                
                // පළවෙනි රිසල්ට් එකේ ෆොටෝ එක
                const firstImage = results[0].thumbnail;

                let listText = `*🔍 SADEW-MINI CARTOON SEARCH*\n\n`;
                let buttons = [];

                results.forEach((m, i) => {
                    listText += `*${i + 1}.* ${m.title}\n`;
                    listText += `🌟 *Rating:* ${m.rating} | 🎬 *Quality:* ${m.quality}\n\n`;

                    const shortId = crypto.randomBytes(3).toString('hex');
                    // Details වලදී පෙන්වන්න ෆොටෝ එකත් සේව් කරගන්නවා
                    global.slcStore[shortId] = { movieUrl: m.url, title: m.title, image: m.thumbnail };

                    setTimeout(() => { if (global.slcStore[shortId]) delete global.slcStore[shortId]; }, 30 * 60 * 1000);

                    buttons.push({
                        buttonId: `.slget ${shortId}`,
                        buttonText: { displayText: `🎬 ${i + 1}. ${m.title.substring(0, 15)}...` },
                        type: 1
                    });
                });

                listText += `> *ඔබට අවශ්‍ය නිර්මාණයට අදාළ අංකය පහතින් තෝරන්න.*`;

                const msgOpts = {
                    caption: listText,
                    footer: "👑 SADEW-MINI 👑",
                    buttons: buttons,
                    headerType: 4
                };
                
                // පළවෙනි පින්තූරය ඇඩ් කිරීම
                if (firstImage) msgOpts.image = { url: firstImage };

                await socket.sendMessage(sender, msgOpts, { quoted: msg });
                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

            } catch (e) {
                console.error("Cartoon Search Error:", e.message);
                reply(`❌ *සෙවුම් දෝෂයකි! (Error: ${e.message})*`);
            }
        }

        // ==============================================================
        // 2. GET DETAILS & EPISODES (.slget)
        // ==============================================================
        else if (command === "slget") {
            const shortId = args[0];
            const storedData = global.slcStore[shortId];

            if (!storedData || !storedData.movieUrl) return reply("❌ *මෙම ලින්ක් එක කල් ඉකුත් වී ඇත. කරුණාකර නැවත Search කරන්න.*");

            try {
                await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });

                const urlParam = encodeURIComponent(storedData.movieUrl);
                
                // Download API එකට කෝල් කිරීම (මේකෙන් තමයි Episodes / Links එන්නේ)
                const dlRes = await axios.get(`${BASE_API}/dl?apiKey=${API_KEY}&text=${urlParam}`);
                if (!dlRes.data.results) throw new Error("තොරතුරු ලබාගත නොහැක.");
                
                const details = dlRes.data.results;
                
                let capText = `*🎬 SADEW-MINI CARTOON DETAILS*\n\n`;
                capText += `📌 *Title:* ${storedData.title}\n`;
                capText += `🏷️ *Type:* ${details.type}\n`;
                if (details.total_episodes) capText += `📺 *Total Episodes:* ${details.total_episodes}\n`;
                capText += `\n*📥 DOWNLOAD LINKS:*\n\n`;

                let buttons = [];

                // 1. මේක TV Series එකක් නම් Episodes ටික ලිස්ට් කරනවා
                if (details.episodes && details.episodes.length > 0) {
                    details.episodes.forEach((ep) => {
                        if (ep.stream_url) {
                            const linkId = crypto.randomBytes(3).toString('hex');
                            global.slcStore[linkId] = { 
                                url: ep.stream_url, 
                                title: `${storedData.title} - ${ep.title}`,
                                quality: "HD"
                            };
                            setTimeout(() => { if (global.slcStore[linkId]) delete global.slcStore[linkId]; }, 30 * 60 * 1000);

                            capText += `*${ep.title}* ➔ .sldl ${linkId}\n`;
                            
                            // Buttons වලට දාන්න පුළුවන් උපරිම 3යි, ඒත් අපි List එකට දාමු
                            if (buttons.length < 3) {
                                buttons.push({ buttonId: `.sldl ${linkId}`, buttonText: { displayText: `📥 ${ep.title}` }, type: 1 });
                            }
                        }
                    });
                } 
                // 2. නැත්නම් Direct Links ටික ගන්නවා
                else if (details.download_links && details.download_links.length > 0) {
                    details.download_links.forEach((dl, i) => {
                        if (dl.final_link && !dl.final_link.includes('t.me')) { // Telegram ලින්ක් අයින් කරනවා
                            const linkId = crypto.randomBytes(3).toString('hex');
                            global.slcStore[linkId] = { 
                                url: dl.final_link, 
                                title: storedData.title,
                                quality: dl.info || "Direct"
                            };
                            setTimeout(() => { if (global.slcStore[linkId]) delete global.slcStore[linkId]; }, 30 * 60 * 1000);

                            capText += `*Link ${i + 1} (${dl.info})* ➔ .sldl ${linkId}\n`;
                            
                            if (buttons.length < 3) {
                                buttons.push({ buttonId: `.sldl ${linkId}`, buttonText: { displayText: `📥 Download ${i+1}` }, type: 1 });
                            }
                        }
                    });
                }

                capText += `\n> *ඔබට අවශ්‍ය Episode එකෙහි Command එක (උදා: .sldl abc) Copy කර Reply කරන්න හෝ Button එක Click කරන්න.*`;

                const msgOpts = {
                    caption: capText,
                    footer: "👑 SADEW-MINI 👑",
                    headerType: 4
                };

                // අදාල කාටූන් එකේ පින්තූරය ඇඩ් කිරීම
                if (storedData.image) msgOpts.image = { url: storedData.image };
                if (buttons.length > 0) msgOpts.buttons = buttons;

                await socket.sendMessage(sender, msgOpts, { quoted: msg });
                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

            } catch (e) {
                console.error("Cartoon Details Error:", e.message);
                reply(`❌ *තොරතුරු ලබාගැනීමට නොහැකි විය! (Error: ${e.message})*`);
            }
        }

        // ==============================================================
        // 3. DIRECT DOWNLOAD & UPLOAD (RAM SAVER) (.sldl)
        // ==============================================================
        else if (command === "sldl") {
            const linkId = args[0];
            const dlData = global.slcStore[linkId];

            if (!dlData || !dlData.url) return reply("❌ *මෙම ලින්ක් එක කල් ඉකුත් වී ඇත.*");

            try {
                await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });
                await reply(`🔍 *Processing Download...*\n🎬 ${dlData.title}\n\n_Please wait, downloading to server..._`);

                const safeTitle = dlData.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
                const finalFileName = `SadewMini_${safeTitle}.mp4`;
                const tempFilePath = path.join(__dirname, finalFileName);
                const writer = fs.createWriteStream(tempFilePath);

                const fileRes = await axios({
                    method: 'GET', 
                    url: dlData.url, 
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

                // RAM Saver ක්‍රමයෙන් WhatsApp එකට අප්ලෝඩ් කරනවා
                await socket.sendMessage(sender, {
                    document: { url: tempFilePath },
                    mimetype: 'video/mp4',
                    fileName: finalFileName,
                    caption: `*🎬 Title:* ${dlData.title}\n📦 *Size:* ${actualSizeMB} MB\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
                }, { quoted: msg });

                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });
                
                if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

            } catch (e) {
                console.error("Cartoon Download Error:", e.message);
                await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                reply(`❌ *බාගත කිරීම අසාර්ථක විය! (Error: ${e.message})*\n🔗 Direct Link: ${dlData.url}`);
            }
        }
    }
};
