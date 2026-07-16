const axios = require("axios");
const crypto = require("crypto");

const API_KEY = "zan_FIAO7Ayh_eo1vllkep6";
const API_BASE = "https://api.zanta-mini.store/api/sinhalasub";

// ඩේටා තාවකාලිකව රඳවා ගැනීමට Cache එකක් (Button IDs කෙටිව තබා ගැනීමට)
global.sadewMovieCache = global.sadewMovieCache || {};

module.exports = {
    name: "movie",
    category: 1, // Download Menu
    description: "🎬 සිංහල උපසිරැසි චිත්‍රපට Button හරහා ලබාගන්න",
    commands: ["movie", "cinema", "films", "moviedl", "movieget"],

    handler: async ({ socket, msg, sender, command, args, reply }) => {
        const cmd = command.replace(/^\./, '').toLowerCase();
        const query = args.join(" ").trim();

        // ════════ 1. SEARCH MOVIE ════════
        if (cmd === "movie" || cmd === "cinema" || cmd === "films") {
            if (!query) {
                return reply(`🎬 *සිංහල චිත්‍රපට සෙවුම*\n\n*Usage:* .movie <movie name>\n*Example:* .movie kishkindha`);
            }

            try {
                await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } });
                await reply(`🔎 _සොයමින් "${query}"..._`);

                const searchUrl = `${API_BASE}/search?apiKey=${API_KEY}&text=${encodeURIComponent(query)}`;
                const { data } = await axios.get(searchUrl, { timeout: 15000 });

                if (!data?.success || !data?.results?.length) {
                    await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                    return reply(`❌ *"${query}" සඳහා ප්‍රතිඵල හමු නොවිණි.*`);
                }

                // WhatsApp Buttons වල උපරිම සීමාව 3ක් වන බැවින් පළමු ප්‍රතිඵල 3 පමණක් ගනිමු.
                const results = data.results.slice(0, 3);
                
                let buttons = [];
                let listMsg = `*↳ ❝ [🎬 𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗠𝗼𝘃𝗶𝗲𝘀 🎬] ¡! ❞*\n\n` +
                              `🔍 *Search:* ${query}\n` +
                              `📊 *Results Found:* ${data.results.length}\n\n` +
                              `> *පහතින් ඔබට අවශ්‍ය චිත්‍රපටය තෝරන්න:*`;

                results.forEach((movie) => {
                    // Button ID දිග වැඩිවීම වළක්වා ගැනීමට Cache කිරීම
                    let cacheId = crypto.randomBytes(3).toString("hex");
                    global.sadewMovieCache[cacheId] = { url: movie.url, title: movie.title };

                    buttons.push({
                        buttonId: `.moviedl ${cacheId}`,
                        // Button Text එක දිග වැඩි වුවහොත් කපා හැරීම (Max 20 chars)
                        buttonText: { displayText: `🎬 ${movie.title.substring(0, 18)}...` },
                        type: 1
                    });
                });

                await socket.sendMessage(sender, {
                    text: listMsg,
                    footer: '👑 SADEW-MINI 👑',
                    buttons: buttons,
                    headerType: 1
                }, { quoted: msg });

                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

            } catch (err) {
                console.error("Movie Search Error:", err);
                await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                reply(`❌ *සෙවීම අසාර්ථකයි!* කරුණාකර පසුව නැවත උත්සාහ කරන්න.`);
            }
        }

        // ════════ 2. FETCH QUALITIES ════════
        if (cmd === "moviedl") {
            const cacheId = args[0];
            const movieData = global.sadewMovieCache[cacheId];

            if (!movieData) {
                return reply(`❌ *සෙවුම් කාලය ඉකුත් වී ඇත. කරුණාකර චිත්‍රපටය නැවත මුල සිට Search කරන්න.*`);
            }

            try {
                await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });
                await reply(`📥 _බාගැනීම් විකල්ප සොයමින්: ${movieData.title}..._`);

                const dlUrl = `${API_BASE}/dl?apiKey=${API_KEY}&text=${encodeURIComponent(movieData.url)}`;
                const { data } = await axios.get(dlUrl, { timeout: 15000 });

                if (!data?.success || !data?.results?.links?.length) {
                    await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                    return reply(`❌ *"${movieData.title}" සඳහා බාගැනීම් සබැඳි හමු නොවිණි.*`);
                }

                const allLinks = data.results.links;
                const videoLinks = allLinks.filter(l => l.quality !== "Subtitles");
                
                const link720p = videoLinks.find(l => l.size === "HD 720p")?.direct_link;
                const link480p = videoLinks.find(l => l.size === "SD 480p")?.direct_link;

                if (!link720p && !link480p) {
                    await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                    return reply(`❌ *මෙම චිත්‍රපටය සඳහා 720p හෝ 480p Quality එකක් සේවාදායකයේ නොමැත.*`);
                }

                let qualMsg = `*↳ ❝ [🎬 𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗠𝗼𝘃𝗶𝗲𝘀 🎬] ¡! ❞*\n\n` +
                              `🎥 *Movie:* ${movieData.title}\n\n` +
                              `> *පහතින් ඔබට අවශ්‍ය Quality එක තෝරන්න:*`;

                let buttons = [];

                if (link720p) {
                    let dlId720 = crypto.randomBytes(4).toString("hex");
                    global.sadewMovieCache[dlId720] = { url: link720p, title: movieData.title, q: "720p" };
                    buttons.push({
                        buttonId: `.movieget ${dlId720}`, 
                        buttonText: { displayText: `🎥 720p (HD)` },
                        type: 1
                    });
                }

                if (link480p) {
                    let dlId480 = crypto.randomBytes(4).toString("hex");
                    global.sadewMovieCache[dlId480] = { url: link480p, title: movieData.title, q: "480p" };
                    buttons.push({
                        buttonId: `.movieget ${dlId480}`, 
                        buttonText: { displayText: `🎞️ 480p (SD)` },
                        type: 1
                    });
                }

                await socket.sendMessage(sender, {
                    text: qualMsg,
                    footer: '👑 SADEW-MINI 👑',
                    buttons: buttons,
                    headerType: 1
                }, { quoted: msg });

                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

            } catch (err) {
                console.error("Movie DL fetch error:", err);
                await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                reply(`❌ *බාගැනීම් විකල්ප ලබා ගැනීම අසාර්ථකයි!*`);
            }
        }

        // ════════ 3. SEND MOVIE DOCUMENT ════════
        if (cmd === "movieget") {
            const cacheId = args[0];
            const dlData = global.sadewMovieCache[cacheId];

            if (!dlData) {
                return reply(`❌ *සෙවුම් කාලය ඉකුත් වී ඇත. කරුණාකර නැවත මුල සිට Search කරන්න.*`);
            }

            try {
                await socket.sendMessage(sender, { react: { text: '⬇️', key: msg.key } });
                await reply(`⬇️ *Download Started!*\n\n🎬 *${dlData.title}*\n📺 *Quality:* ${dlData.q}\n\n_⏳ WhatsApp වෙත Upload වෙමින් පවතී. කරුණාකර රැඳී සිටින්න..._`);

                const cleanTitle = dlData.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);

                await socket.sendMessage(sender, {
                    document: { url: dlData.url },
                    mimetype: 'video/mp4',
                    fileName: `${cleanTitle} - ${dlData.q}.mp4`,
                    caption: `*↳ ❝ [🎬 𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗠𝗼𝘃𝗶𝗲𝘀 🎬] ¡! ❞*\n\n✅ *Download Complete*\n\n🎬 *Title:* ${dlData.title}\n📺 *Quality:* ${dlData.q}\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮*`
                }, { quoted: msg });

                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

            } catch (err) {
                console.error("Movie Upload error:", err);
                await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                reply(`❌ *Download Failed!* Server එක මගින් Upload කිරීම Block කර තිබිය හැක.`);
            }
        }
    }
};
