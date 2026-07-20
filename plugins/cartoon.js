const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Memory Session Store for Cartoon Links
if (!global.ctStore) global.ctStore = {};

module.exports = {
    name: "cartoon",
    category: 1,
    description: "Search and download cartoons from cartoons.lk via API",
    commands: ["cartoon", "ctget", "ctdl"],
    
    handler: async ({ socket, msg, sender, command, args, reply }) => {
        const API_KEY = "frontoffice9876@gmail.com:vajira-88173";
        const BASE_API = "https://vajiraofc-apis.vercel.app/api/cartoonlk";

        // ==============================================================
        // 1. SEARCH CARTOON (.cartoon name)
        // ==============================================================
        if (command === "cartoon") {
            const query = args.join(' ').trim();
            if (!query) return reply("🎥 *කරුණාකර කාටූන් එකක නමක් ලබා දෙන්න!*\n💡 උදා: `.cartoon spy kids`");

            try {
                await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } });

                const searchUrl = `${BASE_API}/search?apikey=${API_KEY}&q=${encodeURIComponent(query)}`;
                const { data } = await axios.get(searchUrl);

                if (!data.success || !data.results || data.results.length === 0) {
                    await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                    return reply("❌ *සමාවෙන්න, ඔබ සෙවූ කාටූනය සොයාගත නොහැකි විය!*");
                }

                const results = data.results.slice(0, 5);
                let firstImage = "";

                try {
                    const firstUrlParam = encodeURIComponent(results[0].url);
                    const firstDetail = await axios.get(`${BASE_API}/details?apikey=${API_KEY}&url=${firstUrlParam}`);
                    if (firstDetail.data.success && firstDetail.data.data.image) {
                        firstImage = firstDetail.data.data.image;
                    }
                } catch (imgErr) {
                    console.log("Image fetch error: ", imgErr.message);
                }

                let listText = `*🔍 SADEW-MINI CARTOON SEARCH*\n\n`;
                let buttons = [];

                results.forEach((m, i) => {
                    listText += `*${i + 1}.* ${m.title}\n\n`;

                    const shortId = crypto.randomBytes(4).toString('hex');
                    global.ctStore[shortId] = { movieUrl: m.url, title: m.title };

                    setTimeout(() => { if (global.ctStore[shortId]) delete global.ctStore[shortId]; }, 30 * 60 * 1000);

                    buttons.push({
                        buttonId: `.ctget ${shortId}`,
                        buttonText: { displayText: `🎬 ${m.title.substring(0, 18)}...` },
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
                
                if (firstImage) msgOpts.image = { url: firstImage };

                await socket.sendMessage(sender, msgOpts, { quoted: msg });
                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

            } catch (e) {
                console.error("Cartoon Search Error:", e.message);
                reply(`❌ *සෙවුම් දෝෂයකි! (Error: ${e.message})*`);
            }
        }

        // ==============================================================
        // 2. GET DETAILS & QUALITY SELECTOR (.ctget)
        // ==============================================================
        else if (command === "ctget") {
            const shortId = args[0];
            const storedData = global.ctStore[shortId];

            if (!storedData || !storedData.movieUrl) return reply("❌ *මෙම ලින්ක් එක කල් ඉකුත් වී ඇත. කරුණාකර නැවත Search කරන්න.*");

            try {
                await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });

                const urlParam = encodeURIComponent(storedData.movieUrl);
                
                const detailRes = await axios.get(`${BASE_API}/details?apikey=${API_KEY}&url=${urlParam}`);
                if (!detailRes.data.success) throw new Error("Details ලබාගත නොහැක.");
                const details = detailRes.data.data;

                const dlRes = await axios.get(`${BASE_API}/download?apikey=${API_KEY}&url=${urlParam}`);
                if (!dlRes.data.success) throw new Error("Download Link ලබාගත නොහැක.");
                const downloadUrl = dlRes.data.data.download_url;

                const linkId = crypto.randomBytes(4).toString('hex');
                global.ctStore[linkId] = { 
                    url: downloadUrl, 
                    title: details.title,
                    size: details.size,
                    quality: details.quality
                };

                setTimeout(() => { if (global.ctStore[linkId]) delete global.ctStore[linkId]; }, 30 * 60 * 1000);

                let capText = `*🎬 SADEW-MINI CARTOON DETAILS*\n\n`;
                capText += `📌 *Title:* ${details.title}\n`;
                capText += `🌟 *Quality:* ${details.quality}\n`;
                capText += `📦 *Size:* ${details.size}\n`;
                capText += `👁️ *Views:* ${details.views}\n\n`;
                capText += `> *පහතින් ඇති Button එක Click කර Download කරගන්න.*`;

                const buttons = [{
                    buttonId: `.ctdl ${linkId}`,
                    buttonText: { displayText: `📥 Download (${details.quality})` },
                    type: 1
                }];

                const msgOpts = {
                    caption: capText,
                    footer: "👑 SADEW-MINI 👑",
                    buttons: buttons,
                    headerType: 4
                };

                if (details.image) msgOpts.image = { url: details.image };

                await socket.sendMessage(sender, msgOpts, { quoted: msg });
                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

            } catch (e) {
                console.error("Cartoon Details Error:", e.message);
                reply(`❌ *තොරතුරු ලබාගැනීමට නොහැකි විය! (Error: ${e.message})*`);
            }
        }

        // ==============================================================
        // 3. DIRECT DOWNLOAD & UPLOAD (Bypass Hotlink + RAM Saver) (.ctdl)
        // ==============================================================
        else if (command === "ctdl") {
            const linkId = args[0];
            const dlData = global.ctStore[linkId];

            if (!dlData || !dlData.url) return reply("❌ *මෙම ලින්ක් එක කල් ඉකුත් වී ඇත.*");

            try {
                await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });
                await reply(`🔍 *Processing Download...*\n🎬 ${dlData.title}\n📦 ${dlData.size}\n\n_Please wait, downloading to server..._`);

                const safeTitle = dlData.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
                const finalFileName = `SadewMini_${safeTitle}.mp4`;
                const tempFilePath = path.join(__dirname, finalFileName);
                const writer = fs.createWriteStream(tempFilePath);

                // 🔥 මෙන්න මේ Headers ටික දැම්මම තමයි 403 Forbidden එක එන්නේ නැතුව ෆයිල් එක දෙන්නේ!
                const fileRes = await axios({
                    method: 'GET', 
                    url: dlData.url, 
                    responseType: 'stream', 
                    timeout: 0, 
                    headers: { 
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Referer': 'https://cartoons.lk/', // අනිවාර්යයි!
                        'Accept': '*/*'
                    }, 
                    maxRedirects: 10
                });

                fileRes.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                const stats = fs.statSync(tempFilePath);
                
                if (stats.size > 2000 * 1024 * 1024) {
                    fs.unlinkSync(tempFilePath);
                    return reply(`❌ *File is too large for WhatsApp!*`);
                }

                await socket.sendMessage(sender, { react: { text: '⬆️', key: msg.key } });

                // සර්වර් එකේ තියෙන ෆයිල් එක RAM එක පුරවන්නේ නැතුව WhatsApp එකට යවනවා
                await socket.sendMessage(sender, {
                    document: { url: tempFilePath },
                    mimetype: 'video/mp4',
                    fileName: finalFileName,
                    caption: `*🎬 Title:* ${dlData.title}\n📦 *Size:* ${dlData.size}\n🌟 *Quality:* ${dlData.quality}\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
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
