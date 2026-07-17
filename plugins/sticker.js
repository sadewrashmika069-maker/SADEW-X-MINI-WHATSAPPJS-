const { downloadContentFromMessage, getContentType } = require("baileys");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");

/**
 * ⚡ Media to Sticker Generator (Sadew-Mini System)
 */
module.exports = {
    name: "sticker_maker",
    category: "media",
    description: "Reply to an image or video to convert it into a sticker.",
    commands: ["x", "s", "sticker"], // කමාන්ඩ් එක .x හෝ .s

    handler: async ({ socket, msg, sender, command, args }) => {
        try {
            console.log(`[SADEW-MINI BOT] .${command} command execution started.`);

            // 1. මැසේජ් එකේ අඩංගු දේ ලබා ගැනීම (Reply කරපු එකක්ද, නැත්නම් කෙලින්ම එවපු එකක්ද කියලා බලනවා)
            const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
            const quotedMsg = contextInfo?.quotedMessage;
            
            let actualMessage = quotedMsg ? quotedMsg : msg.message;

            // ViewOnce Check (ViewOnce දාපු එකක් නම් ඒක ඇතුලෙන් ෆොටෝ එක ගන්නවා)
            const isViewOnce = actualMessage.viewOnceMessage || actualMessage.viewOnceMessageV2 || actualMessage.viewOnceMessageV2Extension;
            if (isViewOnce) {
                actualMessage = actualMessage.viewOnceMessage?.message || actualMessage.viewOnceMessageV2?.message || actualMessage.viewOnceMessageV2Extension?.message;
            }

            // Message Type එක මොකක්ද කියලා බලනවා
            const type = getContentType(actualMessage);
            
            if (type !== 'imageMessage' && type !== 'videoMessage') {
                return await socket.sendMessage(sender, { 
                    text: `❌ *Usage:* Please reply to an *Image* or *Video* (under 10s) and type:\n.${command}\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*` 
                }, { quoted: msg });
            }

            const mediaMessage = actualMessage[type];
            const mediaType = type === 'imageMessage' ? 'image' : 'video';

            // ⏳ Processing Start
            await socket.sendMessage(sender, { react: { text: "🔄", key: msg.key } });

            // 2. Download Media to Buffer
            console.log(`[SADEW-MINI BOT] Downloading ${mediaType} from WhatsApp...`);
            const stream = await downloadContentFromMessage(mediaMessage, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            if (!buffer.length) {
                throw new Error("Downloaded buffer is empty.");
            }

            // 3. Create Sticker using wa-sticker-formatter
            console.log("[SADEW-MINI BOT] Converting to sticker...");
            const sticker = new Sticker(buffer, {
                pack: '𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 🎀', // ඔයාගේ ස්ටිකර් පැක් එකේ නම
                author: '𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆', // ඔයාගේ නම
                type: StickerTypes.FULL, // FULL හෝ CROPPED
                categories: ['🤩', '🎉'], 
                quality: 50, // වීඩියෝ වලට ගැලපෙන හොඳම quality එක
                background: 'transparent'
            });

            const stickerBuffer = await sticker.toBuffer();

            // 4. Send Sticker
            console.log("[SADEW-MINI BOT] Sending sticker to user...");
            await socket.sendMessage(sender, { sticker: stickerBuffer }, { quoted: msg });
            await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

        } catch (error) {
            console.error("[SADEW-MINI BOT] STICKER ERROR OCCURRED:", error);
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
            
            const errMsg = error.message.includes("video") || error.message.includes("duration")
                ? "❌ *Error:* වීඩියෝව තත්පර 10කට වඩා විශාල වැඩි විය හැක."
                : `❌ *Error:* ස්ටිකරය සෑදීමට නොහැකි විය.`;
                
            await socket.sendMessage(sender, { text: errMsg }, { quoted: msg });
        }
    }
};
