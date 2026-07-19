const axios = require('axios');
const crypto = require('crypto');

// Memory Leak නොවී ඩේටා තියාගන්න Global Store එකක්
if (!global.mbStore) global.mbStore = {};

module.exports = {
    name: "baiscopes",
    category: 1,
    description: "Search and download movies with Sinhala Subtitles from Baiscopes",
    commands: ["baiscopes", "baiscope", "bsget", "bslink"],
    
    handler: async ({ socket, msg, sender, command, args, reply }) => {
        const apikey = "frontoffice9876@gmail.com:vajira-88173";
        const API_BASE = "https://vajiraofc-apis.vercel.app";

        // ==============================================================
        // 1. CHOOSE MOVIE (Baiscopes Search)
        // ==============================================================
        if (command === "baiscopes" || command === "baiscope") {
            const query = args.join(' ').trim();
            if (!query) {
                return reply("🎥 *කරුණාකර චිත්‍රපටයක නමක් ලබා දෙන්න!*\n💡 උදා: `.baiscopes 2026`");
            }

            try {
                await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } });

                const searchUrl = `${API_BASE}/api/baiscopes/search?apikey=${apikey}&q=${encodeURIComponent(query)}`;
                const res = await axios.get(searchUrl, { timeout: 15000 });
                
                const items = res.data?.results || res.data?.data || [];

                if (!items || items.length === 0) {
                    try { await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } }); } catch (_) {}
                    return reply("❌ *සමාවෙන්න, චිත්‍රපටයක් සොයාගත නොහැකි විය!*");
                }

                let listText = `*🔍 SADEW-MINI MOVIE SEARCH (BAISCOPES)*\n\n`;
                let buttons = [];

                items.slice(0, 5).forEach((m, i) => {
                    const title = m.title || 'Unknown Title';
                    const year = m.year || 'N/A';
                    
                    listText += `*${i + 1}.* ${title}\n`;
                    listText += `📅 Year: ${year} | ⭐ IMDb: ${m.imdbRate || 'N/A'}\n\n`;

                    // 🔥 Button Limit එක පනින්නේ නැති වෙන්න ලින්ක් එක Store කරනවා
                    const shortId = crypto.randomBytes(4).toString('hex');
                    global.mbStore[shortId] = { movieUrl: m.url };

                    setTimeout(() => {
                        if (global.mbStore[shortId]) delete global.mbStore[shortId];
                    }, 30 * 60 * 1000);

                    // Button ID එකට යවන්නේ පොඩි Short ID එකක් විතරයි
                    buttons.push({
                        buttonId: `.bsget ${shortId}`,
                        buttonText: { displayText: `🎬 ${title.substring(0, 18)}...` },
                        type: 1
                    });
                });

                listText += `> *ඔබට අවශ්‍ය නිර්මාණයට අදාළ අංකය පහතින් තෝරන්න.*`;

                const firstCover = items[0]?.image;
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
                console.error("Baiscopes Search Error:", e.message);
                try { await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } }); } catch (_) {}
                reply("❌ *API දෝෂයකි! පසුව නැවත උත්සාහ කරන්න.*");
            }
        }

        // ==============================================================
        // 2. CHOOSE QUALITY / GET LINKS (Baiscopes Details)
        // ==============================================================
        else if (command === "bsget") {
            const shortId = args[0];
            const storedData = global.mbStore[shortId];

            if (!storedData || !storedData.movieUrl) {
                return reply("❌ *මෙම ලින්ක් එක කල් ඉකුත් වී ඇත. කරුණාකර මුල සිට Search කරන්න.*");
            }

            try {
                await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });

                const detailUrl = `${API_BASE}/api/baiscopes/details?apikey=${apikey}&url=${encodeURIComponent(storedData.movieUrl)}`;
                const res = await axios.get(detailUrl, { timeout: 20000 });

                // 🔥 JSON එකේ තිබ්බ විදිහට downloads අල්ලගන්නවා
                const downloadLinks = res.data?.data?.downloads || res.data?.downloads || [];

                if (!downloadLinks || downloadLinks.length === 0) {
                    await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                    return reply("❌ *මෙම චිත්‍රපටය සඳහා Download Links දැනට නොමැත.*");
                }

                const movieTitle = res.data?.data?.title || res.data?.title || "Movie";
                const coverUrl = res.data?.data?.image || res.data?.image;

                let qList = `*🎬 SADEW-MINI MOVIE LINKS*\n\n📽️ *${movieTitle}*\n\n`;
                let buttons = [];

                downloadLinks.forEach((dl, i) => {
                    // JSON එකේ තියෙන Size එක සහ Quality එක
                    const fileSize = dl.size && dl.size !== 'N/A' ? dl.size : 'Unknown Size';
                    const fileQuality = dl.quality && dl.quality !== 'N/A' ? dl.quality : `Link ${i + 1}`;
                    const fileUrl = dl.url || dl.original_link;

                    if (!fileUrl) return;

                    qList += `*${i + 1}.* ${fileQuality} - ${fileSize}\n`;

                    const linkId = crypto.randomBytes(4).toString('hex');
                    global.mbStore[linkId] = {
                        url: fileUrl,
                        title: movieTitle,
                        size: fileSize
                    };

                    setTimeout(() => {
                        if (global.mbStore[linkId]) delete global.mbStore[linkId];
                    }, 30 * 60 * 1000);

                    buttons.push({
                        buttonId: `.bslink ${linkId}`,
                        buttonText: { displayText: `📥 Get ${fileQuality}` },
                        type: 1
                    });
                });

                qList += `\n> *ඔබට අවශ්‍ය Link එකට අදාළ අංකය තෝරන්න.*`;

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
                console.error("Baiscopes Details Error:", e.message);
                reply("❌ *තොරතුරු ලබාගැනීමට නොහැකි විය!*");
            }
        }

        // ==============================================================
        // 3. SEND DIRECT LINK (Baiscopes Download Link)
        // ==============================================================
        else if (command === "bslink") {
            const shortId = args[0];
            const movieData = global.mbStore[shortId];

            if (!movieData || !movieData.url) {
                return reply("❌ *මෙම ලින්ක් එක කල් ඉකුත් වී ඇත. කරුණාකර මුල සිට .baiscopes ලෙස Search කරන්න.*");
            }

            try {
                await socket.sendMessage(sender, { react: { text: '🔗', key: msg.key } });

                const caption = `*↳ ❝ [🎀 𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗠𝗼𝘃𝗶𝗲𝘀 (Baiscopes) 🎀] ¡! ❞*\n\n` +
                                `🎬 *Title:* ${movieData.title}\n` +
                                `📦 *Size:* ${movieData.size}\n\n` +
                                `✅ *කරුණාකර පහත ලින්ක් එක Click කර, එය ඔබගේ Browser එක හරහා Download කරගන්න.*\n\n` +
                                `🔗 *Download Link:*\n${movieData.url}\n\n` +
                                `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                await socket.sendMessage(sender, { text: caption }, { quoted: msg });
                
                delete global.mbStore[shortId];

            } catch (e) {
                console.error("Movie DL Error:", e.message);
                await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                reply(`❌ *Link එක ලබා ගැනීමේදී දෝෂයක් මතු විය.*`);
            }
        }
    }
};
