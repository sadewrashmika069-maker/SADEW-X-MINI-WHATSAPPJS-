const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Memory Session Store
if (!global.mbStore) global.mbStore = {};

function extractFileId(url) {
    let match = url.match(/\/file\/d\/([^\/]+)/);
    if (match) return match[1];
    match = url.match(/[?&]id=([^&]+)/);
    if (match) return match[1];
    match = url.match(/\/d\/([^\/]+)/);
    if (match) return match[1];
    return null;
}

function getLinkType(url) {
    if (!url) return "Unknown";
    url = url.toLowerCase();
    if (url.includes('drive.google.com') || url.includes('drive.usercontent.google.com')) return "GDrive";
    if (url.includes('t.me')) return "Telegram";
    if (url.includes('pixeldrain.com')) return "Pixeldrain";
    if (url.includes('.workers.dev') || url.match(/\.(mp4|mkv|avi|zip|rar)$/i)) return "Direct";
    return "Web Link";
}

module.exports = {
    name: "col3neg",
    category: 1,
    description: "Search and download movies from Col3neg without API",
    commands: ["col3neg", "col3", "c3get", "c3link"],
    
    handler: async ({ socket, msg, sender, command, args, reply }) => {
        const BASE_URL = "https://col3neg.com"; 

        // ==============================================================
        // 1. SEARCH MOVIE (corsproxy.io)
        // ==============================================================
        if (command === "col3neg" || command === "col3") {
            const query = args.join(' ').trim();
            if (!query) return reply("🎥 *කරුණාකර චිත්‍රපටයක නමක් ලබා දෙන්න!*\n💡 උදා: `.col3neg avatar`");

            try {
                await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } });

                const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(query)}`;
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(searchUrl)}`;
                
                const response = await axios.get(proxyUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                    timeout: 25000
                });

                const htmlCode = response.data; 
                if (!htmlCode || typeof htmlCode !== 'string') throw new Error("Proxy එකෙන් HTML ලබාගැනීමට නොහැකි විය.");

                const $ = cheerio.load(htmlCode);
                const results = [];

                $('.item, .video').each((i, el) => {
                    if (i >= 5) return; 
                    
                    const title = $(el).find('.item-content b a, .video-content b a').text().trim();
                    const link = $(el).find('.item-content b a, .video-content b a').attr('href');
                    let image = $(el).find('.item-header img, .video-header img').attr('src');

                    if (image && image.includes('video-thumb.png')) {
                        const styleStr = $(el).find('.item-header img, .video-header img').attr('style');
                        if (styleStr) {
                            const match = styleStr.match(/url\(['"]?(.*?)['"]?\)/);
                            if (match) image = match[1];
                        }
                    }

                    if (title && link) {
                        results.push({ title, link, image });
                    }
                });

                if (results.length === 0) {
                    await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                    return reply("❌ *සමාවෙන්න, චිත්‍රපටයක් සොයාගත නොහැකි විය!*");
                }

                let listText = `*🔍 SADEW-MINI COL3NEG SEARCH*\n\n`;
                let buttons = [];

                results.forEach((m, i) => {
                    listText += `*${i + 1}.* ${m.title}\n\n`;
                    const shortId = crypto.randomBytes(4).toString('hex');
                    global.mbStore[shortId] = { movieUrl: m.link, title: m.title, image: m.image };
                    setTimeout(() => { if (global.mbStore[shortId]) delete global.mbStore[shortId]; }, 30 * 60 * 1000);

                    buttons.push({
                        buttonId: `.c3get ${shortId}`,
                        buttonText: { displayText: `🎬 ${m.title.substring(0, 18)}...` },
                        type: 1
                    });
                });

                listText += `> *ඔබට අවශ්‍ය නිර්මාණයට අදාළ අංකය පහතින් තෝරන්න.*`;

                const msgOpts = { caption: listText, footer: "👑 SADEW-MINI 👑", buttons: buttons, headerType: 4 };
                if (results[0].image && results[0].image.startsWith('http')) msgOpts.image = { url: results[0].image };

                await socket.sendMessage(sender, msgOpts, { quoted: msg });
                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

            } catch (e) {
                console.error("Col3neg Search Error:", e.message);
                reply(`❌ *සෙවුම් දෝෂයකි! (Error: ${e.message})*`);
            }
        }

        // ==============================================================
        // 2. SCRAPE DOWNLOAD LINKS (corsproxy.io)
        // ==============================================================
        else if (command === "c3get") {
            const shortId = args[0];
            const storedData = global.mbStore[shortId];

            if (!storedData || !storedData.movieUrl) return reply("❌ *මෙම ලින්ක් එක කල් ඉකුත් වී ඇත.*");

            try {
                await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });

                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(storedData.movieUrl)}`;
                const response = await axios.get(proxyUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                    timeout: 25000
                });

                const htmlCode = response.data;
                if (!htmlCode || typeof htmlCode !== 'string') throw new Error("Proxy එකෙන් HTML ලබාගැනීමට නොහැකි විය.");

                const $ = cheerio.load(htmlCode);
                const downloadLinks = [];
                
                $('a').each((i, el) => {
                    const text = $(el).text().trim().toLowerCase();
                    const href = $(el).attr('href');
                    
                    if (href && (text.includes('download') || text.includes('720p') || text.includes('1080p') || href.includes('drive.google'))) {
                        if (!downloadLinks.some(dl => dl.url === href)) {
                            downloadLinks.push({ quality: text !== '' ? text : `Link ${downloadLinks.length + 1}`, url: href });
                        }
                    }
                });

                $('iframe').each((i, el) => {
                    const src = $(el).attr('src');
                    if (src && (src.includes('youtube.com') || src.includes('drive.google'))) {
                         if (!downloadLinks.some(dl => dl.url === src)) {
                             downloadLinks.push({ quality: "Stream / Video Link", url: src });
                         }
                    }
                });

                if (downloadLinks.length === 0) {
                    await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                    return reply("❌ *මෙම චිත්‍රපටය සඳහා Download Links සොයාගත නොහැකි විය.*");
                }

                let qList = `*🎬 SADEW-MINI MOVIE LINKS*\n\n📽️ *${storedData.title}*\n\n`;
                let buttons = [];

                downloadLinks.slice(0, 5).forEach((dl, i) => { 
                    const linkType = getLinkType(dl.url);
                    const fileQuality = dl.quality.substring(0, 20); 

                    qList += `*${i + 1}.* ${fileQuality} [${linkType}]\n`;
                    const linkId = crypto.randomBytes(4).toString('hex');
                    global.mbStore[linkId] = { url: dl.url, title: storedData.title, size: "Unknown Size" };
                    setTimeout(() => { if (global.mbStore[linkId]) delete global.mbStore[linkId]; }, 30 * 60 * 1000);

                    buttons.push({ buttonId: `.c3link ${linkId}`, buttonText: { displayText: `📥 ${i + 1}. ${linkType}` }, type: 1 });
                });

                qList += `\n> *ඔබට අවශ්‍ය Link එකට අදාළ අංකය තෝරන්න.*`;

                const msgOpts = { caption: qList, footer: "👑 SADEW-MINI 👑", buttons: buttons, headerType: 4 };
                if (storedData.image && storedData.image.startsWith('http')) msgOpts.image = { url: storedData.image };

                await socket.sendMessage(sender, msgOpts, { quoted: msg });
                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

            } catch (e) {
                console.error("Col3neg Details Error:", e.message);
                reply(`❌ *තොරතුරු ලබාගැනීමට නොහැකි විය! (Error: ${e.message})*`);
            }
        }

        // ==============================================================
        // 3. AUTO DOWNLOAD & UPLOAD (RAM SAVER)
        // ==============================================================
        else if (command === "c3link") {
            const shortId = args[0];
            const movieData = global.mbStore[shortId];

            if (!movieData || !movieData.url) return reply("❌ *මෙම ලින්ක් එක කල් ඉකුත් වී ඇත.*");

            const url = movieData.url;
            const fileId = extractFileId(url);

            if (fileId) {
                try {
                    await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });
                    await reply(`🔍 *Processing Movie (GDrive)...*\n🎬 ${movieData.title}`);

                    const API_TOKEN = "VK4fry";
                    const API_BASE_WS = "https://whiteshadow-x-api.onrender.com/api/download/gdrive";
                    const standardUrl = `https://drive.google.com/file/d/${fileId}/view`;
                    const apiUrl = `${API_BASE_WS}?url=${encodeURIComponent(standardUrl)}&apitoken=${API_TOKEN}`;

                    const response = await axios.get(apiUrl, { timeout: 20000 });
                    const data = response.data;

                    if (!data || data.success !== true) throw new Error("API Error");

                    let downloadUrl = data.downloadUrl || data.url || data.result?.downloadUrl;
                    const fileName = data.fileName || data.filename || `Movie_${fileId}.mp4`;
                    
                    if (!downloadUrl) throw new Error("No URL received");

                    let mimetype = fileName.toLowerCase().endsWith('.mkv') ? 'video/x-matroska' : 'video/mp4';
                    const finalFileName = `SadewMini_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                    const tempFilePath = path.join(__dirname, finalFileName);
                    const writer = fs.createWriteStream(tempFilePath);

                    const fileRes = await axios({
                        method: 'GET', url: downloadUrl, responseType: 'stream', timeout: 0, 
                        headers: { 'User-Agent': 'Mozilla/5.0' }, maxRedirects: 5
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
                        return reply(`❌ *File is too large!*\n📦 Size: ${actualSizeMB} MB`);
                    }

                    await socket.sendMessage(sender, { react: { text: '⬆️', key: msg.key } });

                    await socket.sendMessage(sender, {
                        document: { url: tempFilePath },
                        mimetype: mimetype,
                        fileName: finalFileName,
                        caption: `*🎬 Title:* ${movieData.title}\n📦 *Size:* ${actualSizeMB} MB\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
                    }, { quoted: msg });

                    await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });
                    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

                } catch (error) {
                    await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                    reply(`❌ *අසාර්ථක විය.*\n🔗 ${url}`);
                }
            } 
            else if ( (url.includes('.workers.dev') || url.match(/\.(mp4|mkv|avi|zip|rar)$/i)) && !url.includes('t.me') && !url.includes('pixeldrain.com') ) {
                try {
                    await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });
                    await reply(`🔍 *Processing Direct Link...*\n🎬 ${movieData.title}`);

                    let decodedUrl = decodeURIComponent(url);
                    let fileNameExt = decodedUrl.split('/').pop().split('?')[0];
                    if (!fileNameExt || !fileNameExt.includes('.')) fileNameExt = `${movieData.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;

                    let mimetype = fileNameExt.toLowerCase().endsWith('.mkv') ? 'video/x-matroska' : 'video/mp4';
                    const finalFileName = `SadewMini_${fileNameExt.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                    const tempFilePath = path.join(__dirname, finalFileName);
                    const writer = fs.createWriteStream(tempFilePath);

                    const fileRes = await axios({
                        method: 'GET', url: url, responseType: 'stream', timeout: 0, 
                        headers: { 'User-Agent': 'Mozilla/5.0' }, maxRedirects: 10
                    });

                    fileRes.data.pipe(writer);

                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });

                    const stats = fs.statSync(tempFilePath);
                    const actualSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

                    await socket.sendMessage(sender, { react: { text: '⬆️', key: msg.key } });

                    await socket.sendMessage(sender, {
                        document: { url: tempFilePath },
                        mimetype: mimetype,
                        fileName: finalFileName,
                        caption: `*🎬 Title:* ${movieData.title}\n📦 *Size:* ${actualSizeMB} MB\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
                    }, { quoted: msg });

                    await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });
                    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

                } catch (e) {
                    await socket.sendMessage(sender, { text: `✅ *කරුණාකර පහත ලින්ක් එක Click කර බාගන්න.*\n🔗 ${url}` }, { quoted: msg });
                }
            }
            else {
                await socket.sendMessage(sender, { text: `🎬 *${movieData.title}*\n✅ *මෙම ලින්ක් එක සෘජුවම බාගත නොහැකි බැවින්, කරුණාකර එය Browser එක හරහා ලබාගන්න.*\n\n🔗 *Download Link:*\n${url}` }, { quoted: msg });
            }
        }
    }
};
