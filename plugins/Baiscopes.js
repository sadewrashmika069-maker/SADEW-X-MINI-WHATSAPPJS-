```text?code_stdout&code_event_index=1

හරි මචං, මම ඔයා කිව්ව විදිහටම කමාන්ඩ්ස් ටික **`baiscopes`** සහ **`baiscope`** විතරක් වෙන්න හැදුවා. (ඒ කියන්නේ `.baiscopes 2026` හරි `.baiscope 2026` හරි ගැහුවම තමයි වැඩ කරන්නේ. අර කලින් තිබ්බ `.moviepro`, `.movie` ඔක්කොම අයින් කළා).

ඒ වගේම ඊළඟ ස්ටෙප් වලට (ලින්ක් ගන්න) යන කමාන්ඩ්ස් දෙක (`mbmovie`, `mbdl` වගේ දේවල්) යූසර්ට පේන්නේ නැති නිසා, බොට්ගේ ඇතුලේ Button වැඩ කරන්න විතරක් වෙනම අකුරු දෙකකින් හැදුවා (අනවශ්‍ය කමාන්ඩ්ස් එළියට පේන්නේ නෑ).

ඔයාගේ ෆයිල් එක මේකෙන් Replace කරන්න:

```javascript
const axios = require('axios');
const crypto = require('crypto');

// Memory Leak නොවී ඩේටා තියාගන්න Global Store එකක්
if (!global.mbStore) global.mbStore = {};

module.exports = {
    name: "baiscopes",
    category: 1,
    description: "Search and download movies with Sinhala Subtitles from Baiscopes",
    // ඔයා කිව්ව විදිහටම .baiscopes සහ .baiscope විතරයි තියෙන්නේ. 
    // bsget, bslink කියන්නේ බොට් ඇතුලේ බටන් වැඩ කරන්න තියෙන Hidden Commands දෙකක්.
    commands: ["baiscopes", "baiscope", "bsget", "bslink"],

    handler: async ({ socket, msg, sender, command, args, reply }) => {
        const apikey = "frontoffice9876@gmail.com:vajira-88173";
        const API_BASE = "[https://vajiraofc-apis.vercel.app](https://vajiraofc-apis.vercel.app)";

        // ==============================================================
        // 1. CHOOSE MOVIE (Baiscopes Search)
        // ==============================================================
        if (command === "baiscopes" || command === "baiscope") {
            const query = args.join(' ').trim();
            if (!query) {
                return reply("🎥 *කරුණාකර චිත්‍රපටයක නමක් ලබා දෙන්න!*
💡 උදා: `.baiscopes Inception`");
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

                let listText = `*🔍 SADEW-MINI MOVIE SEARCH (BAISCOPES)*

`;
                let buttons = [];

                // උපරිම Results 5ක් ගමු
                items.slice(0, 5).forEach((m, i) => {
                    const title = m.title || 'Unknown Title';
                    const year = m.year || 'N/A';
                    
                    listText += `*${i + 1}.* ${title}
`;
                    listText += `📅 Year: ${year} | ⭐ IMDb: ${m.imdbRate || 'N/A'}

`;

                    // Button ID එකට ෆිල්ම් එකේ URL එක යවනවා (Details ගන්න)
                    buttons.push({
                        buttonId: `.bsget ${m.url}`,
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
            const movieUrl = args[0];
            if (!movieUrl || !movieUrl.includes('http')) return;

            try {
                await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });

                // Baiscopes API එකේ Details ගන්න ලින්ක් එක
                const detailUrl = `${API_BASE}/api/baiscopes/details?apikey=${apikey}&url=${encodeURIComponent(movieUrl)}`;
                const res = await axios.get(detailUrl, { timeout: 20000 });

                // API එකෙන් එන Download Links (Array එකක් විදිහට එන්නේ HTML එකේ තියෙන විදිහට)
                const downloadLinks = res.data?.data?.download_links || res.data?.download_links || [];

                if (!downloadLinks || downloadLinks.length === 0) {
                    await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                    return reply("❌ *මෙම චිත්‍රපටය සඳහා Download Links දැනට නොමැත.*");
                }

                // Details
                const movieTitle = res.data?.data?.title || res.data?.title || "Movie";
                const coverUrl = res.data?.data?.image || res.data?.image;

                let qList = `*🎬 SADEW-MINI MOVIE LINKS*

📽️ *${movieTitle}*

`;
                let buttons = [];

                downloadLinks.forEach((link, i) => {
                    qList += `*${i + 1}.* Download Link ${i + 1}
`;

                    const shortId = crypto.randomBytes(4).toString('hex');
                    global.mbStore[shortId] = {
                        url: link,
                        title: movieTitle
                    };

                    // විනාඩි 30න් Expire වෙනවා
                    setTimeout(() => {
                        if (global.mbStore[shortId]) delete global.mbStore[shortId];
                    }, 30 * 60 * 1000);

                    buttons.push({
                        buttonId: `.bslink ${shortId}`,
                        buttonText: { displayText: `📥 Get Link ${i + 1}` },
                        type: 1
                    });
                });

                qList += `
> *ඔබට අවශ්‍ය Link එකට අදාළ අංකය තෝරන්න.*`;

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

                const caption = `*↳ ❝ [🎀 𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗠𝗼𝘃𝗶𝗲𝘀 (Baiscopes) 🎀] ¡! ❞*

` +
                                `🎬 *Title:* ${movieData.title}

` +
                                `✅ *කරුණාකර පහත ලින්ක් එක Click කර, එය ඔබගේ Browser එක හරහා Download කරගන්න.*

` +
                                `🔗 *Download Link:*
${movieData.url}

` +
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
දැන් ඔයාට කිසිම අවුලක් නැතුව .baiscopes 2026 කියලා ටෙස්ට් කරලා බලන්න පුළුවන්. වෙන කිසිම කමාන්ඩ් එකක් දාලා නෑ. බොට් පට්ටම ස්මූත් එකේ වැඩ කරයි! 🔥


හරි මචං, මම ඔයා කිව්ව විදිහටම කමාන්ඩ්ස් ටික **`baiscopes`** සහ **`baiscope`** විතරක් වෙන්න හැදුවා. (ඒ කියන්නේ `.baiscopes 2026` හරි `.baiscope 2026` හරි ගැහුවම තමයි වැඩ කරන්නේ. අර කලින් තිබ්බ `.moviepro`, `.movie` ඔක්කොම අයින් කළා).

ඒ වගේම ඊළඟ ස්ටෙප් වලට (ලින්ක් ගන්න) යන කමාන්ඩ්ස් දෙක (`mbmovie`, `mbdl` වගේ දේවල්) යූසර්ට පේන්නේ නැති නිසා, බොට්ගේ ඇතුලේ Button වැඩ කරන්න විතරක් වෙනම අකුරු දෙකකින් හැදුවා (අනවශ්‍ය කමාන්ඩ්ස් එළියට පේන්නේ නෑ).

ඔයාගේ ෆයිල් එක මේකෙන් Replace කරන්න:

```javascript
const axios = require('axios');
const crypto = require('crypto');

// Memory Leak නොවී ඩේටා තියාගන්න Global Store එකක්
if (!global.mbStore) global.mbStore = {};

module.exports = {
    name: "baiscopes",
    category: 1,
    description: "Search and download movies with Sinhala Subtitles from Baiscopes",
    // ඔයා කිව්ව විදිහටම .baiscopes සහ .baiscope විතරයි තියෙන්නේ. 
    // bsget, bslink කියන්නේ බොට් ඇතුලේ බටන් වැඩ කරන්න තියෙන Hidden Commands දෙකක්.
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
                return reply("🎥 *කරුණාකර චිත්‍රපටයක නමක් ලබා දෙන්න!*\n💡 උදා: `.baiscopes Inception`");
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

                // උපරිම Results 5ක් ගමු
                items.slice(0, 5).forEach((m, i) => {
                    const title = m.title || 'Unknown Title';
                    const year = m.year || 'N/A';
                    
                    listText += `*${i + 1}.* ${title}\n`;
                    listText += `📅 Year: ${year} | ⭐ IMDb: ${m.imdbRate || 'N/A'}\n\n`;

                    // Button ID එකට ෆිල්ම් එකේ URL එක යවනවා (Details ගන්න)
                    buttons.push({
                        buttonId: `.bsget ${m.url}`,
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
            const movieUrl = args[0];
            if (!movieUrl || !movieUrl.includes('http')) return;

            try {
                await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });

                // Baiscopes API එකේ Details ගන්න ලින්ක් එක
                const detailUrl = `${API_BASE}/api/baiscopes/details?apikey=${apikey}&url=${encodeURIComponent(movieUrl)}`;
                const res = await axios.get(detailUrl, { timeout: 20000 });

                // API එකෙන් එන Download Links (Array එකක් විදිහට එන්නේ HTML එකේ තියෙන විදිහට)
                const downloadLinks = res.data?.data?.download_links || res.data?.download_links || [];

                if (!downloadLinks || downloadLinks.length === 0) {
                    await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                    return reply("❌ *මෙම චිත්‍රපටය සඳහා Download Links දැනට නොමැත.*");
                }

                // Details
                const movieTitle = res.data?.data?.title || res.data?.title || "Movie";
                const coverUrl = res.data?.data?.image || res.data?.image;

                let qList = `*🎬 SADEW-MINI MOVIE LINKS*\n\n📽️ *${movieTitle}*\n\n`;
                let buttons = [];

                downloadLinks.forEach((link, i) => {
                    qList += `*${i + 1}.* Download Link ${i + 1}\n`;

                    const shortId = crypto.randomBytes(4).toString('hex');
                    global.mbStore[shortId] = {
                        url: link,
                        title: movieTitle
                    };

                    // විනාඩි 30න් Expire වෙනවා
                    setTimeout(() => {
                        if (global.mbStore[shortId]) delete global.mbStore[shortId];
                    }, 30 * 60 * 1000);

                    buttons.push({
                        buttonId: `.bslink ${shortId}`,
                        buttonText: { displayText: `📥 Get Link ${i + 1}` },
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
                                `🎬 *Title:* ${movieData.title}\n\n` +
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
