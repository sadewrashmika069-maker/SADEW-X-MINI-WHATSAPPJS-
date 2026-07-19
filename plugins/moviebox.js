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
        // FINAL DOWNLOAD — Send as file via bot
        // ===========================
        else if (command === "mbdl") {
            const id = args[0];
            const movie = global.mbStore[id];
            if (!movie) return reply("❌ Link expired. නැවත search කරන්න");
            try {
                await socket.sendMessage(sender, { react: { text: "📥", key: msg.key } });
                reply(`⏳ *Downloading...*\n🎬 *${movie.title}*\n✨ *${movie.quality}* — ${movie.size}`);
                let downloaded = false;
                // Try each stored URL until one works
                for (const rawUrl of movie.urls) {
                    try {
                        console.log("Trying URL:", rawUrl);
                        const videoRes = await axios.get(rawUrl, {
                            httpsAgent,
                            responseType: "arraybuffer",
                            timeout: 120000, // 2 min for large files
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                                "Referer": "https://moviebox.ng/",
                                "Accept": "*/*"
                            },
                            maxRedirects: 10
                        });
                        const buffer = Buffer.from(videoRes.data);
                        const fileSizeMB = (buffer.length / 1024 / 1024).toFixed(2);
                        const fileName = `${movie.title.replace(/[^\w\s]/gi, "")}_${movie.quality}.mp4`;
                        // If file > 500MB, just send direct link
                        if (buffer.length > 500 * 1024 * 1024) {
                            await socket.sendMessage(sender, {
                                text: `*🎬 ${movie.title}*\n✨ ${movie.quality}\n📦 ${fileSizeMB} MB\n\n🔗 Direct Link (File too large to send directly):\n${rawUrl}`
                            }, { quoted: msg });
                            downloaded = true;
                            break;
                        }
                        // Send as document (preserves quality, no WhatsApp re-encode)
                        await socket.sendMessage(sender, {
                            document: buffer,
                            mimetype: "video/mp4",
                            fileName: fileName,
                            caption: `*🎬 SADEW-MINI MOVIEBOX*\n\n🎥 *Title:* ${movie.title}\n✨ *Quality:* ${movie.quality}\n📦 *Size:* ${fileSizeMB} MB\n\n> *Sadew-Mini By Sadew Rashmika*`
                        }, { quoted: msg });
                        await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });
                        downloaded = true;
                        break; // success — stop trying
                    } catch (dlErr) {
                        console.log(`URL failed (${rawUrl}): ${dlErr.message}`);
                        // try next URL
                    }
                }
                if (!downloaded) {
                    // All URLs failed — send raw link as last resort
                    const fallbackUrl = movie.urls[0];
                    await socket.sendMessage(sender, {
                        text: `*🎬 ${movie.title}*\n✨ ${movie.quality}\n📦 ${movie.size}\n\n⚠️ Bot download failed. Direct link:\n${fallbackUrl}\n\n> Browser eka open karala download karanna.`
                    }, { quoted: msg });
                    await socket.sendMessage(sender, { react: { text: "⚠️", key: msg.key } });
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
