const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Memory Leak නොවී ඩේටා තියාගන්න Global Store එකක්
if (!global.mbStore) global.mbStore = {};

module.exports = {
    name: "moviebox",
    category: 1,
    description: "Search and download movies from MovieBox Pro",
    commands: ["moviepro", "mbmovie", "mbdl"],

    handler: async ({ socket, msg, sender, command, args, reply }) => {
        const apikey = "frontoffice9876@gmail.com:vajira-88173";

        // ==============================================================
        // 1. CHOOSE MOVIE (චිත්‍රපටය Search කිරීම)
        // ==============================================================
        if (command === "moviepro" || command === "moviebox") {
            const query = args.join(' ').trim();
            if (!query) {
                return reply("🎥 *කරුණාකර චිත්‍රපටයක නමක් ලබා දෙන්න!*\n💡 උදා: `.moviepro Inception`");
            }

            try {
                await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } });

                const searchUrl = `https://vajiraofc-apis.vercel.app/api/movieboxs?apikey=${apikey}&query=${encodeURIComponent(query)}&page=1&perPage=5`;
                const res = await axios.get(searchUrl, { timeout: 15000 });
                const items = res.data?.data?.items || [];

                if (!items || items.length === 0) {
                    try { await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } }); } catch (_) {}
                    return reply("❌ *සමාවෙන්න, චිත්‍රපටයක් සොයාගත නොහැකි විය!*");
                }

                let listText = `*🔍 SADEW-MINI MOVIEBOX SEARCH*\n\n`;
                let buttons = [];

                items.slice(0, 5).forEach((m, i) => {
                    const year = m.releaseDate ? m.releaseDate.split('-')[0] : 'N/A';
                    const typeIcon = m.subjectType === 2 ? '📺 Series' : '🎬 Movie'; 
                    
                    listText += `*${i + 1}.* ${m.title} (${year}) [${typeIcon}]\n`;
                    listText += `⭐ IMDb: ${m.imdbRatingValue || 'N/A'} | 🎭 ${m.genre || 'N/A'}\n\n`;

                    buttons.push({
                        buttonId: `.mbmovie ${m.subjectType}|${m.subjectId}|${m.detailPath}`,
                        buttonText: { displayText: `${typeIcon}: ${m.title}` },
                        type: 1
                    });
                });

                listText += `> *ඔබට අවශ්‍ය නිර්මාණයට අදාළ අංකය පහතින් තෝරන්න.*`;

                const firstCover = items[0]?.cover?.url;
                const msgOpts = {
                    caption: listText,
                    footer: "👑 SADEW-MINI 👑",
                    buttons: buttons,
                    headerType: 4
                };
                
                if (firstCover) msgOpts.image = { url: firstCover };

                await socket.sendMessage(sender, msgOpts, { quoted: msg });
                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

            } catch (e) {
                console.error("MovieBox Search Error:", e.message);
                try { await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } }); } catch (_) {}
                reply("❌ *API දෝෂයකි! පසුව නැවත උත්සාහ කරන්න.*");
            }
        }

        // ==============================================================
        // 2. CHOOSE QUALITY (Quality තේරීම + CONSOLE LOG)
        // ==============================================================
        else if (command === "mbmovie") {
            const data = args.join(' ').split('|');
            if (data.length !== 3) return; 

            const subjectType = data[0]; 
            const subjectId = data[1];
            const detailPath = data[2];

            let season = subjectType === '2' ? 1 : 0;
            let episode = subjectType === '2' ? 1 : 0;

            try {
                await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });

                const dlUrl = `https://vajiraofc-apis.vercel.app/api/movieboxdl?apikey=${apikey}&subjectId=${subjectId}&detailPath=${detailPath}&season=${season}&episode=${episode}`;
                const res = await axios.get(dlUrl, { timeout: 20000 });

                let downloads = res.data?.data?.downloads?.data?.downloads || [];

                if (!downloads || downloads.length === 0) {
                    await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                    return reply("❌ *මෙම චිත්‍රපටය සඳහා Download Links දැනට නොමැත.*\n\n_මෙය VIP/Premium චිත්‍රපටයක් වීම හෝ මෙය TV Series එකක් වීම මීට හේතුව විය හැක._");
                }

                // 🔥 මෙන්න Console Log එක! මේ Output එක අනිවාර්යයෙන් එවන්න 🔥
                console.log("\n\n====== MOVIEBOX API DOWNLOADS OBJECT ======");
                console.log(JSON.stringify(downloads[0], null, 2));
                console.log("===========================================\n\n");

                const movieTitle = res.data?.data?.details?.subject?.title || "Movie";
                const coverUrl = res.data?.data?.details?.subject?.cover?.url;

                let qList = `*🎬 SADEW-MINI MOVIE QUALITY*\n\n📽️ *${movieTitle}*\n\n`;
                let buttons = [];

                downloads.slice(0, 10).forEach((dl, i) => {
                    // ඔයා කිව්ව Quality Fix එක දැම්මා
                    const qlty = dl.quality || dl.resolution || dl.name || dl.label || 'HD';
                    const sizeMB = dl.size ? (parseInt(dl.size) / (1024 * 1024)).toFixed(1) + ' MB' : 'Unknown Size';
                    
                    qList += `*${i + 1}.* ${qlty}p - ${sizeMB}\n`;

                    const shortId = crypto.randomBytes(4).toString('hex');
                    global.mbStore[shortId] = {
                        // දැනට dl.url එකටම Priority දුන්නා Test කරන්න
                        url: dl.url || dl.directUrl || dl.downloadUrl,
                        title: movieTitle,
                        quality: qlty,
                        size: sizeMB
                    };

                    setTimeout(() => {
                        if (global.mbStore[shortId]) delete global.mbStore[shortId];
                    }, 30 * 60 * 1000);

                    buttons.push({
                        buttonId: `.mbdl ${shortId}`,
                        buttonText: { displayText: `🎥 ${qlty}p (${sizeMB})` },
                        type: 1
                    });
                });

                qList += `\n> *ඔබට අවශ්‍ය Quality එකට අදාළ අංකය තෝරන්න.*`;

                const msgOpts = {
                    caption: qList,
                    footer: "👑 SADEW-MINI 👑",
                    buttons: buttons,
                    headerType: 4
                };

                if (coverUrl) msgOpts.image = { url: coverUrl };

                await socket.sendMessage(sender, msgOpts, { quoted: msg });
                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

            } catch (e) {
                console.error("MovieBox Quality Error:", e.message);
                reply("❌ *Download තොරතුරු ලබාගැනීමට නොහැකි විය!*");
            }
        }

        // ==============================================================
        // 3. DOWNLOAD MOVIE (File Download - Testing Headers)
        // ==============================================================
        else if (command === "mbdl") {
            const shortId = args[0];
            const movieData = global.mbStore[shortId];

            if (!movieData || !movieData.url) {
                return reply("❌ *මෙම ලින්ක් එක කල් ඉකුත් වී ඇත. කරුණාකර මුල සිට .moviepro ලෙස Search කරන්න.*");
            }

            let tempFilePath;

            try {
                await socket.sendMessage(sender, { react: { text: '📥', key: msg.key } });
                await reply(`📥 *${movieData.title}* (${movieData.quality}p) බාගත වෙමින් පවතී... මෙය තරමක් විශාල ෆයිල් එකක් නිසා සුළු වේලාවක් ගතවිය හැක. ⏳`);

                const cleanFileName = movieData.title.replace(/[^a-zA-Z0-9]/g, '_');
                const tempFileName = `SadewMini_${cleanFileName}_${movieData.quality}p.mp4`;
                tempFilePath = path.join(__dirname, tempFileName);

                // 🔥 ඔයා දීපු අලුත් Headers ටික දැම්මා
                const response = await axios({
                    method: 'GET',
                    url: movieData.url,
                    responseType: 'stream',
                    timeout: 0,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                        'Accept': 'video/mp4,*/*',
                        'Referer': 'https://movieboxpro.app/'
                    }
                });

                const writer = fs.createWriteStream(tempFilePath);
                response.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                const caption = `*↳ ❝ [🎀 𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗠𝗼𝘃𝗶𝗲𝗕𝗼𝘅 🎀] ¡! ❞*\n\n` +
                                `🎬 *Title:* ${movieData.title}\n` +
                                `✨ *Quality:* ${movieData.quality}p\n\n` +
                                `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                // 🔥 Baileys වලට Stream එකක් විදිහට දෙනවා Memory Issue එන්නේ නැති වෙන්න
                await socket.sendMessage(sender, {
                    document: { stream: fs.createReadStream(tempFilePath) }, 
                    mimetype: "video/mp4",
                    fileName: tempFileName,
                    caption: caption
                }, { quoted: msg });

                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });
                
                if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
                delete global.mbStore[shortId];

            } catch (e) {
                console.error("MovieBox DL Error:", e.message);
                await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                
                // Fallback: ලින්ක් එක යවනවා
                const fallbackCaption = `❌ *Download Error (Server Blocked)*\n\n` +
                                        `සේවාදායකයේ (MovieBox) අවහිර කිරීමක් නිසා ෆයිල් එක කෙලින්ම WhatsApp වෙත එවිය නොහැක.\n\n` +
                                        `✅ *නමුත් ඔබට පහත ලින්ක් එකෙන් එය ඔබගේ Browser එක හරහා Download කරගත හැක:*\n\n` +
                                        `🎬 *${movieData.title} (${movieData.quality}p - ${movieData.size})*\n\n` +
                                        `🔗 *Link:* ${movieData.url}\n\n` +
                                        `_(මෙම ලින්ක් එක පැය කිහිපයක් සඳහා පමණක් වලංගු වේ)_`;

                await socket.sendMessage(sender, { text: fallbackCaption }, { quoted: msg });
                
                if (tempFilePath && fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
            }
        }
    }
};
