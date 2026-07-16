const axios = require("axios");

module.exports = {
    name: "ss",
    category: 5, // Tools & Edits
    description: "📸 වෙබ් අඩවියක තිර රුවක් (Screenshot) ලබාගන්න",
    commands: ["ss", "screenshot", "webss"],

    handler: async ({ socket, msg, sender, command, args, reply }) => {
        
        // 1. Get the URL from args or quoted message
        let input = args.join(" ").trim();
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!input && quoted) {
            input = quoted.conversation || quoted.extendedTextMessage?.text || "";
        }

        // Basic URL extraction / validation
        const urlMatch = String(input).match(/https?:\/\/[^\s]+/i) || String(input).match(/[a-z0-9-\.]+\.[a-z]{2,}(\/[^\s]*)?/i);

        if (!urlMatch) {
            return reply(`📸 *Website Screenshot*\n\n*Usage:* .ss <website_url>\n*Example:* .ss google.com\n_(හෝ ලින්ක් එකක් ඇති Message එකකට Reply කරන්න)_`);
        }

        let url = urlMatch[0];
        if (!url.startsWith("http")) url = "https://" + url;

        try {
            await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });
            await reply(`📸 _Capturing screenshot of ${url}..._`);

            let imageBuffer;

            // API 1: ScreenshotAPI.net (Primary)
            try {
                const primaryApi = `https://shot.screenshotapi.net/screenshot?url=${encodeURIComponent(url)}&width=1280&height=800&output=image&file_type=png`;
                const res1 = await axios.get(primaryApi, {
                    responseType: 'arraybuffer',
                    timeout: 20000,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });

                if (res1.status === 200 && res1.data.length > 1000) {
                    imageBuffer = Buffer.from(res1.data);
                } else {
                    throw new Error("Primary API Failed");
                }
            } catch (err1) {
                console.log("[SADEW-MINI] SS Primary API failed, trying fallback...");
                
                // API 2: Microlink.io (Fallback)
                const fallbackApi = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false`;
                const res2 = await axios.get(fallbackApi, { timeout: 15000 });
                const screenshotUrl = res2.data?.data?.screenshot?.url;
                
                if (!screenshotUrl) throw new Error("Fallback API Failed");

                // Download the image from the fallback URL
                const imgRes = await axios.get(screenshotUrl, { responseType: 'arraybuffer', timeout: 15000 });
                imageBuffer = Buffer.from(imgRes.data);
            }

            const caption = `*↳ ❝ [📸 𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗦𝗰𝗿𝗲𝗲𝗻𝘀𝗵𝗼𝘁 📸] ¡! ❞*\n\n` +
                            `🌐 *URL:* ${url}\n\n` +
                            `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

            await socket.sendMessage(sender, {
                image: imageBuffer,
                caption: caption
            }, { quoted: msg });

            await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

        } catch (error) {
            console.error("Screenshot error:", error);
            await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
            
            reply(`❌ *Screenshot Failed!*\n\n_අදාළ වෙබ් අඩවියට ප්‍රවේශ විය නොහැක හෝ සේවාදායකයේ දෝෂයකි._`);
        }
    }
};
