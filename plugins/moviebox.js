const axios = require("axios");
const crypto = require("crypto");
const https = require("https");

if (!global.mbStore) global.mbStore = {};

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

module.exports = {
    name: "moviebox",
    category: 1,
    description: "Search MovieBox movies",
    commands: ["moviepro", "moviebox", "mbmovie", "mbdl"],

    handler: async ({ socket, msg, sender, command, args, reply }) => {

        const apikey = "frontoffice9876@gmail.com:vajira-88173";

        // ===========================
        // SEARCH MOVIE
        // ===========================
        if (command === "moviepro" || command === "moviebox") {

            const query = args.join(" ").trim();
            if (!query) return reply("🎬 *Movie name එකක් දෙන්න*\n\nExample:\n.moviepro Avatar");

            try {
                await socket.sendMessage(sender, { react: { text: "🔍", key: msg.key } });

                const url = `https://vajiraofc-apis.vercel.app/api/movieboxs?apikey=${apikey}&query=${encodeURIComponent(query)}&page=1&perPage=5`;
                const res = await axios.get(url, { timeout: 15000 });
                const items = res.data?.data?.items || [];

                if (!items.length) return reply("❌ Movie එක හමු වුනේ නැහැ");

                let text = `*🔍 SADEW-MINI MOVIEBOX*\n\n`;
                let buttons = [];

                items.forEach((m, i) => {
                    let type = m.subjectType == 2 ? "📺 Series" : "🎬 Movie";
                    let year = m.releaseDate ? m.releaseDate.split("-")[0] : "N/A";
                    text += `*${i + 1}.* ${m.title} (${year})\n⭐ ${m.imdbRatingValue || "N/A"}\n\n`;
                    buttons.push({
                        buttonId: `.mbmovie ${m.subjectType}|${m.subjectId}|${m.detailPath}`,
                        buttonText: { displayText: `${type} ${i + 1}` },
                        type: 1
                    });
                });

                await socket.sendMessage(sender, {
                    image: { url: items[0]?.cover?.url },
                    caption: text,
                    footer: "👑 SADEW-MINI 👑",
                    buttons: buttons,
                    headerType: 4
                }, { quoted: msg });

            } catch (e) {
                console.log("Search Error:", e.message);
                reply("❌ Search error: " + e.message);
            }
        }

        // ===========================
        // QUALITY SELECT
        // ===========================
        else if (command === "mbmovie") {

            const data = args.join(" ").split("|");
            if (data.length !== 3) return;

            const subjectType = data[0];
            const subjectId = data[1];
            const detailPath = data[2];

            let season = subjectType === "2" ? 1 : 0;
            let episode = subjectType === "2" ? 1 : 0;

            try {
                await socket.sendMessage(sender, { react: { text: "⏳", key: msg.key } });

                const url = `https://vajiraofc-apis.vercel.app/api/movieboxdl?apikey=${apikey}&subjectId=${subjectId}&detailPath=${detailPath}&season=${season}&episode=${episode}`;
                const res = await axios.get(url, { timeout: 20000 });
                const downloads = res.data?.data?.downloads?.data?.downloads || [];

                if (!downloads.length) return reply("❌ Download links නැහැ");

                const title = res.data?.data?.details?.subject?.title || "Movie";

                let txt = `*🎬 SADEW-MINI QUALITY*\n\n*${title}*\n\n`;
                let buttons = [];

                downloads.slice(0, 8).forEach((dl) => {
                    const quality = dl.quality || (dl.resolution ? `${dl.resolution}p` : "HD");
                    const size = dl.size ? (parseInt(dl.size) / 1024 / 1024).toFixed(1) + " MB" : "Unknown";

                    // Store ALL possible URL fields so we can try them in order
                    const id = crypto.randomBytes(4).toString("hex");
                    global.mbStore[id] = {
                        urls: [
                            dl.directUrl,
                            dl.url,
                            dl.downloadUrl,
                            dl.streamUrl
                        ].filter(Boolean), // remove nulls/undefineds
                        title: title,
                        quality: quality,
                        size: size
                    };

                    setTimeout(() => { delete global.mbStore[id]; }, 1800000);

                    txt += `🎥 *${quality}* — ${size}\n`;
                    buttons.push({
                        buttonId: `.mbdl ${id}`,
                        buttonText: { displayText: `⬇️ Download ${quality}` },
                        type: 1
                    });
                });

                await socket.sendMessage(sender, {
                    text: txt,
                    footer: "👑 SADEW-MINI",
                    buttons: buttons,
                    headerType: 1
                }, { quoted: msg });

            } catch (e) {
                console.log("Quality Error:", e.message);
                reply("❌ Quality error: " + e.message);
            }
        }

        // ===========================
        // FINAL DOWNLOAD — 3-Strategy approach to beat CDN 403
        // ===========================
        else if (command === "mbdl") {

            const id = args[0];
            const movie = global.mbStore[id];

            if (!movie) return reply("❌ Link expired. නැවත search කරන්න");

            try {
                await socket.sendMessage(sender, { react: { text: "📥", key: msg.key } });
                reply(`⏳ *Downloading...*\n🎬 *${movie.title}*\n✨ *${movie.quality}* — ${movie.size}`);

                const rawUrl = movie.urls[0];
                const fileName = `${movie.title.replace(/[^\w\s]/gi, "")}_${movie.quality}.mp4`;
                const caption = `*🎬 SADEW-MINI MOVIEBOX*\n\n🎥 *Title:* ${movie.title}\n✨ *Quality:* ${movie.quality}\n📦 *Size:* ${movie.size}\n\n> *Sadew-Mini By Sadew Rashmika*`;
                let downloaded = false;

                // ── STRATEGY 1: Let WhatsApp servers do the fetch (Baileys URL-based) ──
                // WhatsApp CDN IPs are usually not blocked by movie CDNs
                if (!downloaded) {
                    try {
                        console.log("[STRATEGY 1] Baileys URL-based send:", rawUrl);
                        await socket.sendMessage(sender, {
                            document: { url: rawUrl },
                            mimetype: "video/mp4",
                            fileName: fileName,
                            caption: caption
                        }, { quoted: msg });
                        downloaded = true;
                        console.log("[STRATEGY 1] SUCCESS");
                    } catch (e1) {
                        console.log("[STRATEGY 1] FAILED:", e1.message);
                    }
                }

                // ── STRATEGY 2: Buffer fetch with full MovieBox app headers ──
                // hakunaymatata.com CDN needs the original app Referer/Origin/Token
                if (!downloaded) {
                    for (const tryUrl of movie.urls) {
                        try {
                            console.log("[STRATEGY 2] Buffer fetch:", tryUrl);

                            // Extract sign & t params from URL to rebuild headers
                            const urlObj = new URL(tryUrl);
                            const sign = urlObj.searchParams.get("sign") || "";
                            const t = urlObj.searchParams.get("t") || "";

                            const videoRes = await axios.get(tryUrl, {
                                httpsAgent,
                                responseType: "arraybuffer",
                                timeout: 120000,
                                headers: {
                                    // Exact headers the MovieBox app sends
                                    "User-Agent": "MovieBox/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
                                    "Referer": "https://www.moviebox.ng/",
                                    "Origin": "https://www.moviebox.ng",
                                    "Accept": "video/webm,video/mp4,video/*;q=0.9,*/*;q=0.8",
                                    "Accept-Language": "en-US,en;q=0.5",
                                    "Connection": "keep-alive",
                                    "Range": "bytes=0-", // streaming-style request
                                    ...(sign && { "X-Sign": sign }),
                                    ...(t && { "X-Timestamp": t })
                                },
                                maxRedirects: 10
                            });

                            const buffer = Buffer.from(videoRes.data);
                            const fileSizeMB = (buffer.length / 1024 / 1024).toFixed(2);

                            if (buffer.length > 500 * 1024 * 1024) {
                                // Too large — fallback to link
                                break;
                            }

                            await socket.sendMessage(sender, {
                                document: buffer,
                                mimetype: "video/mp4",
                                fileName: fileName,
                                caption: caption
                            }, { quoted: msg });

                            downloaded = true;
                            console.log("[STRATEGY 2] SUCCESS");
                            break;

                        } catch (e2) {
                            console.log(`[STRATEGY 2] FAILED (${tryUrl}):`, e2.message);
                        }
                    }
                }

                // ── STRATEGY 3: Send signed URL as clickable message ──
                // CDN URL has time-limited signature, user can open in browser
                if (!downloaded) {
                    console.log("[STRATEGY 3] Sending direct URL to user");
                    await socket.sendMessage(sender, {
                        text: `*🎬 SADEW-MINI MOVIEBOX*\n\n🎥 *Title:* ${movie.title}\n✨ *Quality:* ${movie.quality}\n📦 *Size:* ${movie.size}\n\n⚠️ *Bot CDN block hit. Browser eke download karanna:*\n\n🔗 ${rawUrl}\n\n> *(Link expire veyi — ඉක්මනට download karanna)*`
                    }, { quoted: msg });
                    await socket.sendMessage(sender, { react: { text: "🔗", key: msg.key } });
                } else {
                    await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });
                }

                delete global.mbStore[id];

            } catch (e) {
                console.log("Link Error:", e.message);
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                reply("❌ Link error: " + e.message);
            }
        }
    }
};
