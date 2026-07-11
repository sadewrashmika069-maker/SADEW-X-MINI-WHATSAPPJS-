const axios = require("axios");

module.exports = {
    name: "mod_downloader_buttons",
    category: "download",
    description: "🎮 Search and download MOD APK games using buttons",
    commands: ["mod", "mod_dl"], // 🛑 mod_dl කියලා අලුත් කමාන්ඩ් එකකුත් දැම්මා button එකට

    handler: async ({ socket, msg, sender, command, args }) => {
        const API_KEY = "zan_FIAO7Ayh_eo1vllkep6";
        const API_BASE = "https://api.zanta-mini.store/api/modapk";

        // ==========================================
        // 🔥 1. SEARCH COMMAND (.mod)
        // ==========================================
        if (command === "mod") {
            const query = args.join(" ").trim();

            if (!query) {
                return await socket.sendMessage(sender, {
                    text: `🎮 *MOD APK Downloader*\n\n*භාවිතය:*\n• .mod <game name>\n\n*උදාහරණ:*\n.mod subway surfers\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
                }, { quoted: msg });
            }

            await socket.sendMessage(sender, { react: { text: "🔍", key: msg.key } });
            await socket.sendPresenceUpdate('composing', sender);

            try {
                let searchRes = await axios.get(`${API_BASE}/search?apiKey=${API_KEY}&url=${encodeURIComponent(query)}`, { timeout: 15000 });
                
                if (!searchRes.data?.success || !searchRes.data?.result?.length) {
                    await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                    return await socket.sendMessage(sender, { text: `❌ *"${query}" සඳහා ප්‍රතිඵල හමුවූයේ නැත!*` }, { quoted: msg });
                }

                // 🛑 WhatsApp Button Limit එක 3ක් නිසා මුල් රිසල්ට්ස් 3 විතරක් ගන්නවා
                let results = searchRes.data.result.slice(0, 3); 
                
                let listMsg = `🎮 *MOD APK Results*\n🔍 *Search:* ${query}\n\n`;
                
                // Buttons ටික හදනවා
                const buttons = results.map((game, i) => {
                    listMsg += `*${i+1}.* ${game.title}\n👤 ${game.developer || "Unknown"} | ⭐ ${game.rating || "N/A"}\n\n`;
                    
                    // Button එක එබුවම යන්න ඕන Command එක (Title එක දිග වැඩි නම් කපනවා)
                    return {
                        buttonId: `.mod_dl ${game.url} || ${game.title}`,
                        buttonText: { displayText: `📥 ${game.title.substring(0, 16)}...` },
                        type: 1
                    };
                });
                
                listMsg += `> 💡 *ඔබට අවශ්‍ය Game එක පහත Button වලින් තෝරන්න.*\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                // Button මැසේජ් එක යවනවා
                await socket.sendMessage(sender, {
                    text: listMsg,
                    footer: '👑 SADEW-MINI 👑',
                    buttons: buttons,
                    headerType: 1
                }, { quoted: msg });

                await socket.sendMessage(sender, { react: { text: "📑", key: msg.key } });

            } catch (err) {
                console.error("Search error:", err);
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                await socket.sendMessage(sender, { text: `❌ *Search failed:*\n_${err.message}_` }, { quoted: msg });
            }
        }

        // ==========================================
        // 🔥 2. DOWNLOAD COMMAND (.mod_dl) 👈 Button එක එබුවම වැඩ කරන්නේ මේක
        // ==========================================
        else if (command === "mod_dl") {
            const inputData = args.join(" ").trim();
            if (!inputData.includes('||')) return;

            // Button එකෙන් එන ඩේටා ටික වෙන් කරගන්නවා
            const parts = inputData.split(' || ');
            const gameUrl = encodeURIComponent(parts[0].trim());
            const gameTitle = parts[1].trim();

            await socket.sendMessage(sender, { react: { text: "⏳", key: msg.key } });
            await socket.sendPresenceUpdate('composing', sender);
            await socket.sendMessage(sender, { 
                text: `📥 *Downloading ${gameTitle}...*\n_මෙයට සුළු වේලාවක් ගත විය හැක, රැඳී සිටින්න._` 
            }, { quoted: msg });

            try {
                let dlRes = await axios.get(`${API_BASE}/dl?apiKey=${API_KEY}&url=${gameUrl}`, { timeout: 15000 });
                if (!dlRes.data?.success || !dlRes.data?.download_url) throw new Error("No download link");

                let apkRes = await axios.get(dlRes.data.download_url, {
                    responseType: 'arraybuffer',
                    timeout: 90000, 
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });

                let buffer = Buffer.from(apkRes.data);
                let sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
                if (buffer.length < 500000) throw new Error("File too small");

                let fileName = `${gameTitle.replace(/[^a-z0-9]/gi, '_')}.apk`;
                let caption = `🎮 *${gameTitle}* [MOD]\n📦 *Size:* ${sizeMB} MB\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                await socket.sendMessage(sender, {
                    document: buffer,
                    mimetype: "application/vnd.android.package-archive",
                    fileName: fileName,
                    caption: caption
                }, { quoted: msg });

                await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

            } catch (downloadErr) {
                console.error("Mod DL Error:", downloadErr);
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                await socket.sendMessage(sender, { text: `❌ *Download failed:*\n_${downloadErr.message}_` }, { quoted: msg });
            }
        }
    }
};
