const axios = require("axios");
const FormData = require("form-data");
const { downloadContentFromMessage } = require('baileys');

module.exports = {
    name: "tourl",
    category: 5, // Tools & Edits Category එක
    description: "Converts replied media into a permanent URL link",
    commands: ["tourl", "url"],

    handler: async ({ socket, msg, sender, reply }) => {
        try {
            // 1. Quoted Message එකක් තියෙනවද කියලා බලනවා
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            if (!quotedMsg || (!quotedMsg.imageMessage && !quotedMsg.videoMessage && !quotedMsg.audioMessage && !quotedMsg.documentMessage)) {
                return await reply("❌ *කරුණාකර ෆොටෝ එකකට, වීඩියෝ එකකට හෝ ඕඩියෝ එකකට Reply කරලා .tourl ගහන්න!*");
            }

            await socket.sendMessage(sender, { react: { text: "🔗", key: msg.key } });

            // 2. Media එක Download කරගැනීම (Baileys ක්‍රමයට)
            let type = Object.keys(quotedMsg)[0];
            let mediaObj = quotedMsg[type];
            
            const stream = await downloadContentFromMessage(mediaObj, type.replace('Message', ''));
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            if (!buffer || buffer.length === 0) {
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                return await reply("❌ *මීඩියා එක ඩවුන්ලෝඩ් කරගැනීමේ ගැටලුවක් ඇතිවුණා!*");
            }

            // 3. File විස්තර හදාගැනීම
            const mime = mediaObj.mimetype || "image/jpeg";
            const ext = mime.split("/")[1] || "jpeg";
            const filename = `Sadew_Mini_${Date.now()}.${ext}`;

            let finalUrl = null;
            let usedServer = "";

            // 🚀 HOST 1: Uguu.se (Highly Reliable)
            try {
                usedServer = "Uguu.se";
                const bodyForm1 = new FormData();
                bodyForm1.append("files[]", buffer, { filename, contentType: mime });

                const res1 = await axios.post("https://uguu.se/api.php?d=upload-tool", bodyForm1, {
                    headers: bodyForm1.getHeaders()
                });

                if (res1.data && res1.data.includes("http")) {
                    finalUrl = res1.data.trim();
                }
            } catch (e) {
                console.log("[SADEW-MINI TOURL] Host 1 (Uguu) failed, switching to Host 2...");
            }

            // 🚀 HOST 2: Tmpfiles.org (Fallback)
            if (!finalUrl) {
                try {
                    usedServer = "Tmpfiles.org";
                    const bodyForm2 = new FormData();
                    bodyForm2.append("file", buffer, { filename, contentType: mime });

                    const res2 = await axios.post("https://tmpfiles.org/api/v1/upload", bodyForm2, {
                        headers: bodyForm2.getHeaders()
                    });

                    if (res2.data && res2.data.status === "success") {
                        // කෙලින්ම ඩවුන්ලෝඩ් කරගන්න පුළුවන් Direct Link එකක් බවට හරවනවා
                        finalUrl = res2.data.data.url.replace("https://tmpfiles.org/", "https://tmpfiles.org/dl/");
                    }
                } catch (e) {
                    throw new Error("Both hosting servers (Uguu & Tmpfiles) rejected the request.");
                }
            }

            // ✨ 4. සාර්ථකව ලින්ක් එක ලැබුණා නම් යවනවා
            if (finalUrl) {
                await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });
                
                let successMsg = `*🔗 YOUR URL IS READY!*\n\n`;
                successMsg += `*• Link:* ${finalUrl}\n`;
                successMsg += `*• Server:* \`${usedServer}\`\n`;
                successMsg += `*• Size:* ${(buffer.length / (1024 * 1024)).toFixed(2)} MB\n\n`;
                successMsg += `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;
                
                return await reply(successMsg);
            } else {
                throw new Error("Failed to generate URL from any provider.");
            }

        } catch (error) {
            console.error("Tourl Error:", error);
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
            
            let errorMsg = `❌ *Tourl System Error:*\n\`\`\`${error.message || error}\`\`\`\n\n`;
            errorMsg += `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;
            
            return await reply(errorMsg);
        }
    }
};
