const axios = require("axios");
const FormData = require("form-data");
const { downloadContentFromMessage, getContentType } = require("@whiskeysockets/baileys");

module.exports = {
    name: "tourl_uploader",
    category: "utility",
    description: "Upload media (image/video/document) and get a direct URL.",
    commands: ["tourl", "url"],

    handler: async ({ socket, msg, sender, command, args }) => {
        try {
            // 🛑 Reply කරපු මැසේජ් එක අල්ලගන්නවා
            const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
            const quotedMsg = contextInfo?.quotedMessage;
            
            if (!quotedMsg) {
                return await socket.sendMessage(sender, { 
                    text: `❌ *Usage:* Please reply to an Image, Video, or Document and type .${command}\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*` 
                }, { quoted: msg });
            }

            // ViewOnce ද කියලා බලනවා
            const isViewOnce = quotedMsg.viewOnceMessage || quotedMsg.viewOnceMessageV2 || quotedMsg.viewOnceMessageV2Extension;
            let actualMessage = quotedMsg;
            
            if (isViewOnce) {
                actualMessage = quotedMsg.viewOnceMessage?.message || quotedMsg.viewOnceMessageV2?.message || quotedMsg.viewOnceMessageV2Extension?.message;
            }

            const type = getContentType(actualMessage);
            
            // 🛑 Media වර්ගය අඳුරගන්නවා
            const validTypes = {
                'imageMessage': 'image',
                'videoMessage': 'video',
                'documentMessage': 'document',
                'audioMessage': 'audio',
                'stickerMessage': 'sticker'
            };

            if (!validTypes[type]) {
                return await socket.sendMessage(sender, { text: `❌ *Invalid Media!* Please reply to a valid Image, Video, or Document.` }, { quoted: msg });
            }

            const mediaMsg = actualMessage[type];
            const dlType = validTypes[type];
            
            // File Extension එක හදාගන්නවා
            let mime = mediaMsg.mimetype || 'application/octet-stream';
            let ext = mime.split('/')[1]?.split(';')[0] || 'bin';
            if (ext === 'jpeg') ext = 'jpg';

            // ⏳ Processing Start
            await socket.sendMessage(sender, { react: { text: "⏳", key: msg.key } });
            await socket.sendMessage(sender, { text: "⏳ _Downloading and uploading to server..._" }, { quoted: msg });

            // 1. Download Media from WhatsApp
            const stream = await downloadContentFromMessage(mediaMsg, dlType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            if (!buffer.length) throw new Error("Downloaded buffer is empty.");

            // 2. Upload to Uguu.se
            const formData = new FormData();
            const filename = `SadewMini_${Date.now()}.${ext}`;
            
            // Uguu.se expects 'files[]' as the field name
            formData.append("files[]", buffer, { filename: filename, contentType: mime });

            const uploadRes = await axios.post("https://uguu.se/upload.php", formData, {
                headers: formData.getHeaders(),
                timeout: 30000, // ලොකු වීඩියෝ වලට වෙලා යන නිසා තත්පර 30ක් දුන්නා
            });

            // 3. Response එකෙන් URL එක අරන් යවනවා
            if (uploadRes.data && uploadRes.data.success && uploadRes.data.files && uploadRes.data.files[0].url) {
                const uploadedUrl = uploadRes.data.files[0].url;

                const replyText = `🔗 *Media Uploader (Uguu.se)*\n\n` +
                                  `📄 *File Name:* ${filename}\n` +
                                  `🌐 *Direct URL:*\n${uploadedUrl}\n\n` +
                                  `⏳ *Expires in:* 24 Hours\n\n` +
                                  `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                await socket.sendMessage(sender, { text: replyText }, { quoted: msg });
                await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });
            } else {
                throw new Error("Invalid response from Uguu.se server.");
            }

        } catch (error) {
            console.error("ToUrl Error:", error);
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
            await socket.sendMessage(sender, { text: `❌ *Upload Failed:*\n_${error.message}_` }, { quoted: msg });
        }
    }
};
