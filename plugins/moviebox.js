const axios = require('axios');
const crypto = require('crypto');

// Memory Leak නොවී ඩේටා තියාගන්න Global Store එකක්
if (!global.mbStore) global.mbStore = {};

module.exports = {
    name: "moviebox",
    category: 1, // Download Menu
    description: "Search and download movies from MovieBox Pro",
    // මෙතන තියෙන mbmovie සහ mbdl කියන්නේ බටන් ක්ලික් කරාම ඇතුලෙන් රන් වෙන හැංගිච්ච කමාන්ඩ්ස්
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

                // උපරිම Movies 5ක් විතරක් ගමු (බටන් ලිමිට් එක පනින්නේ නැති වෙන්න)
                items.slice(0, 5).forEach((m, i) => {
                    const year = m.releaseDate ? m.releaseDate.split('-')[0] : 'N/A';
                    listText += `*${i + 1}.* ${m.title} (${year})\n`;
                    listText += `⭐ IMDb: ${m.imdbRatingValue || 'N/A'} | 🎭 ${m.genre || 'N/A'}\n\n`;

                    // බටන් එක ඇතුලට .mbmovie කමාන්ඩ් එක යවනවා
                    buttons.push({
                        buttonId: `.mbmovie ${m.subjectId}|${m.detailPath}`,
                        buttonText: { displayText: `🎬 ${m.title}` },
                        type: 1
                    });
                });

                listText += `> *ඔබට අවශ්‍ය චිත්‍රපටයට අදාළ අංකය පහතින් තෝරන්න.*`;

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
        // 2. CHOOSE QUALITY (චිත්‍රපටයේ Quality තේරීම)
        // ==============================================================
        else if (command === "mbmovie") {
            const data = args.join(' ').split('|');
            if (data.length !== 2) return; // වැරදි කමාන්ඩ් වලින් බේරෙන්න

            const subjectId = data[0];
            const detailPath = data[1];

            try {
                await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });

                const dlUrl = `https://vajiraofc-apis.vercel.app/api/movieboxdl?apikey=${apikey}&subjectId=${subjectId}&detailPath=${detailPath}&season=0&episode=0`;
                const res = await axios.get(dlUrl, { timeout: 20000 });

                let downloads = [];
                if (res.data?.data?.downloads?.data?.downloads) {
                    downloads = res.data.data.downloads.data.downloads;
                } else if (Array.isArray(res.data?.data?.downloads)) {
                    downloads = res.data.data.downloads;
                }

                if (!downloads || downloads.length === 0) {
                    await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                    return reply("❌ *මෙම චිත්‍රපටය සඳහා Download Links දැනට නොමැත.*");
                }

                const movieTitle = res.data?.data?.details?.subject?.title || "Movie";
                const coverUrl = res.data?.data?.details?.subject?.cover?.url;

                let qList = `*🎬 SADEW-MINI MOVIE QUALITY*\n\n📽️ *${movieTitle}*\n\n`;
                let buttons = [];

                downloads.slice(0, 4).forEach((dl, i) => {
                    const qlty = dl.resolution || dl.quality || 'HD';
                    const size = dl.size || 'Unknown Size';
                    qList += `*${i + 1}.* ${qlty}p - ${size}\n`;

                    // URL එක කෙලින්ම යැව්වොත් Button ID Limit පනින නිසා Temporary ID එකක් හදනවා
                    const shortId = crypto.randomBytes(4).toString('hex');
                    global.mbStore[shortId] = {
                        url: dl.url || dl.link,
                        title: movieTitle,
                        quality: qlty
                    };

                    // විනාඩි 30කින් මේ ලින්ක් එක Auto මකලා දානවා (RAM එක පිරෙන එක නවත්තන්න)
                    setTimeout(() => {
                        if (global.mbStore[shortId]) delete global.mbStore[shortId];
                    }, 30 * 60 * 1000);

                    buttons.push({
                        buttonId: `.mbdl ${shortId}`,
                        buttonText: { displayText: `🎥 ${qlty}p (${size})` },
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
        // 3. DOWNLOAD MOVIE (චිත්‍රපටය WhatsApp වෙත එවීම)
        // ==============================================================
        else if (command === "mbdl") {
            const shortId = args[0];
            const movieData = global.mbStore[shortId];

            if (!movieData || !movieData.url) {
                return reply("❌ *මෙම ලින්ක් එක කල් ඉකුත් වී ඇත. කරුණාකර මුල සිට .moviepro ලෙස Search කරන්න.*");
            }

            try {
                await socket.sendMessage(sender, { react: { text: '📥', key: msg.key } });
                await reply(`📥 *${movieData.title}* (${movieData.quality}p) බාගත වෙමින් පවතී... කරුණාකර රැඳී සිටින්න. ⏳`);

                const caption = `*↳ ❝ [🎀 𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗠𝗼𝘃𝗶𝗲𝗕𝗼𝘅 🎀] ¡! ❞*\n\n` +
                                `🎬 *Title:* ${movieData.title}\n` +
                                `✨ *Quality:* ${movieData.quality}p\n\n` +
                                `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                const cleanFileName = movieData.title.replace(/[^a-zA-Z0-9]/g, '_');

                await socket.sendMessage(sender, {
                    document: { url: movieData.url },
                    mimetype: "video/mp4",
                    fileName: `SadewMini_${cleanFileName}_${movieData.quality}p.mp4`,
                    caption: caption
                }, { quoted: msg });

                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });
                
                // යැව්වට පස්සේ Memory එකෙන් අයින් කරනවා
                delete global.mbStore[shortId];

            } catch (e) {
                console.error("MovieBox DL Error:", e.message);
                await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                reply(`❌ *Download Error:* ෆයිල් එක විශාල වැඩි විය හැක හෝ සේවාදායකයේ ගැටලුවකි.`);
            }
        }
    }
};