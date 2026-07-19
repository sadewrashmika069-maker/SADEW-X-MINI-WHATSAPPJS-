const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Memory Leak නොවී ඩේටා තියාගන්න Global Store එකක්
if (!global.mbStore) global.mbStore = {};

module.exports = {
    name: "movie",
    category: 1,
    description: "Search and download movies with Sinhala Subtitles (Via SinhalaSub)",
    // කමාන්ඩ්ස් ටික පරණ විදිහටම තිබ්බා ඔයාට ලේසි වෙන්න
    commands: ["moviepro", "mbmovie", "mbdl", "movie"],

    handler: async ({ socket, msg, sender, command, args, reply }) => {
        const apikey = "frontoffice9876@gmail.com:vajira-88173";
        const API_BASE = "https://vajiraofc-apis.vercel.app";

        // ==============================================================
        // 1. CHOOSE MOVIE (SinhalaSub Search)
        // ==============================================================
        if (command === "moviepro" || command === "movie" || command === "moviebox") {
            const query = args.join(' ').trim();
            if (!query) {
                return reply("🎥 *කරුණාකර චිත්‍රපටයක නමක් ලබා දෙන්න!*\n💡 උදා: `.movie Inception`");
            }

            try {
                await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } });

                const searchUrl = `${API_BASE}/api/sinhalasub/search?apikey=${apikey}&q=${encodeURIComponent(query)}`;
                const res = await axios.get(searchUrl, { timeout: 15000 });
                
                // SinhalaSub API එකෙන් එන Results
                const items = res.data?.result || res.data?.data || [];

                if (!items || items.length === 0) {
                    try { await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } }); } catch (_) {}
                    return reply("❌ *සමාවෙන්න, චිත්‍රපටයක් සොයාගත නොහැකි විය!*");
                }

                let listText = `*🔍 SADEW-MINI MOVIE SEARCH (SINHALASUB)*\n\n`;
                let buttons = [];

                // උපරිම Results 5ක් ගමු
                items.slice(0, 5).forEach((m, i) => {
                    const title = m.title || m.name || 'Unknown Title';
                    listText += `*${i + 1}.* ${title}\n`;
                    listText += `🔗 ${m.link || m.url}\n\n`;

                    // Button ID එකට ෆිල්ම් එකේ URL එක යවනවා
                    buttons.push({
                        buttonId: `.mbmovie ${m.link || m.url}`,
                        buttonText: { displayText: `🎬 ${title.substring(0, 18)}...` },
                        type: 1
                    });
                });

                listText += `> *ඔබට අවශ්‍ය නිර්මාණයට අදාළ අංකය පහතින් තෝරන්න.*`;

                // පලවෙනි ෆිල්ම් එකේ පින්තූරය තියෙනවා නම් දානවා
                const firstCover = items[0]?.image || items[0]?.thumbnail;
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
                console.error("SinhalaSub Search Error:", e.message);
                try { await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } }); } catch (_) {}
                reply("❌ *API දෝෂයකි! පසුව නැවත උත්සාහ කරන්න.*");
            }
        }

        // ==============================================================
        // 2. CHOOSE QUALITY (SinhalaSub Details)
        // ==============================================================
        else if (command === "mbmovie") {
            const movieUrl = args[0];
            if (!movieUrl || !movieUrl.includes('http')) return;

            try {
                await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });

                const detailUrl = `${API_BASE}/api/sinhalasub/details?apikey=${apikey}&url=${encodeURIComponent(movieUrl)}`;
                const res = await axios.get(detailUrl, { timeout: 20000 });

                const downloads = res.data?.downloads || res.data?.data?.downloads || [];

                if (!downloads || downloads.length === 0) {
                    await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                    return reply("❌ *මෙම චිත්‍රපටය සඳහා Download Links දැනට නොමැත.*");
                }

                const movieTitle = res.data?.title || res.data?.data?.title || "Movie";
                const coverUrl = res.data?.image || res.data?.data?.image;

                let qList = `*🎬 SADEW-MINI MOVIE QUALITY*\n\n📽️ *${movieTitle}*\n\n`;
                let buttons = [];

                downloads.slice(0, 10).forEach((dl, i) => {
                    const qlty = dl.quality || 'HD';
                    const size = dl.size || 'N/A';
                    const dlLink = dl.link || dl.url;

                    if (dlLink) {
                        qList += `*${i + 1}.* ${qlty} - ${size}\n`;

                        const shortId = crypto.randomBytes(4).toString('hex');
                        global.mbStore[shortId] = {
                            url: dlLink,
                            title: movieTitle,
                            quality: qlty,
                            size: size
                        };

                        setTimeout(() => {
                            if (global.mbStore[shortId]) delete global.mbStore[shortId];
                        }, 30 * 60 * 1000);

                        buttons.push({
                            buttonId: `.mbdl ${shortId}`,
                            buttonText: { displayText: `🎥 ${qlty} (${size})` },
                            type: 1
                        });
                    }
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
                console.error("SinhalaSub Quality Error:", e.message);
                reply("❌ *Download තොරතුරු ලබාගැනීමට නොහැකි විය!*");
            }
        }

        // ==============================================================
        // 3. DOWNLOAD MOVIE (Direct Link to User)
        // ==============================================================
        else if (command === "mbdl") {
            const shortId = args[0];
            const movieData = global.mbStore[shortId];

            if (!movieData || !movieData.url) {
                return reply("❌ *මෙම ලින්ක් එක කල් ඉකුත් වී ඇත. කරුණාකර මුල සිට .movie ලෙස Search කරන්න.*");
            }

            try {
                await socket.sendMessage(sender, { react: { text: '🔗', key: msg.key } });

                // මේ ලින්ක් සිංහල සබ් සයිට් වලින් එන නිසා ලොකු අවහිර කිරීම් නෑ.
                // ලොකු ෆයිල් නිසා කෙලින්ම Direct Link එක යූසර්ට දෙන එක තමයි ගොඩක්ම සාර්ථක.
                const caption = `*↳ ❝ [🎀 𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗠𝗼𝘃𝗶𝗲𝘀 (Sinhala Sub) 🎀] ¡! ❞*\n\n` +
                                `🎬 *Title:* ${movieData.title}\n` +
                                `✨ *Quality:* ${movieData.quality}\n` +
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
