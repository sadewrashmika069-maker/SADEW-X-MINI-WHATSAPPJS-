const { downloadContentFromMessage, getContentType, jidNormalizedUser } = require('baileys');

// Duplicate ලෝඩ් වෙන එක නවත්තන්න Tracking Map එකක්
if (!global.emojiDlListeners) global.emojiDlListeners = new Map();

function initEmojiDL(socket) {
    if (!socket || !socket.user) return;
    const sessionJid = jidNormalizedUser(socket.user.id);
    const socketId = sessionJid.split('@')[0];

    if (global.emojiDlListeners.has(socketId)) return;

    const emojiListener = async (chatUpdate) => {
        try {
            const msg = chatUpdate.messages[0];
            if (!msg || !msg.message) return;

            // මැසේජ් එකේ තියෙන Text එක ගන්නවා
            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
            if (!text) return;

            const trimmed = text.trim();
            const chars = Array.from(trimmed);
            
            // 🛑 හරියටම අකුරු/ඉමෝජි 3ක් හෝ ඊට වඩා තියෙන්න ඕනේ
            if (chars.length < 3) return;
            
            const firstChar = chars[0];
            // 🛑 ඒ ඔක්කොම එකම ඉමෝජිය වෙන්න ඕනේ (උදා: 😂😂😂)
            if (!chars.every(c => c === firstChar)) return;
            
            // 🛑 නෝමල් අකුරු හරි ඉලක්කම් හරි නම් වැඩ කරන්නේ නෑ
            if (/[a-zA-Z0-9\s]/.test(firstChar)) return;

            // Reply කරපු මැසේජ් එක ගන්නවා
            const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
            if (!contextInfo) return;

            const quotedMsg = contextInfo.quotedMessage;
            if (!quotedMsg) return;

            // Status එකක්ද ViewOnce එකක්ද බලනවා
            const isStatus = contextInfo.remoteJid === 'status@broadcast';
            const isViewOnce = quotedMsg.viewOnceMessage || quotedMsg.viewOnceMessageV2 || quotedMsg.viewOnceMessageV2Extension;

            if (!isStatus && !isViewOnce) return;

            // ViewOnce එකේ ඇතුළේ තියෙන Media එක එළියට ගන්නවා
            let actualMessage = quotedMsg;
            if (quotedMsg.viewOnceMessage) actualMessage = quotedMsg.viewOnceMessage.message;
            if (quotedMsg.viewOnceMessageV2) actualMessage = quotedMsg.viewOnceMessageV2.message;
            if (quotedMsg.viewOnceMessageV2Extension) actualMessage = quotedMsg.viewOnceMessageV2Extension.message;

            const type = getContentType(actualMessage);
            if (!type || (type !== 'imageMessage' && type !== 'videoMessage' && type !== 'audioMessage')) return;

            const mediaMsg = actualMessage[type];

            // 🛑 මෙන්න ඔයාගේ Inbox (You Chat) එක හොයාගන්නවා
            const myInbox = sessionJid; 

            // ⏳ ඩවුන්ලෝඩ් කරන ගමන් කියලා රිඇක්ෂන් එකක් දානවා
            await socket.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });

            // Media එක Download කරනවා
            const stream = await downloadContentFromMessage(mediaMsg, type.replace('Message', ''));
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const msgType = type === 'imageMessage' ? 'image' : (type === 'videoMessage' ? 'video' : 'audio');
            let originalCaption = mediaMsg.caption || "";
            
            const tag = isStatus ? '📱 *Status Downloaded*' : '👁️ *ViewOnce Downloaded*';
            let finalCaption = `${tag}\n\n`;
            if (originalCaption) finalCaption += `📝 *Caption:* ${originalCaption}\n\n`;
            finalCaption += `> 𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆`;

            // 📩 ඔයාගේ Inbox (You Chat) එකට යවනවා
            await socket.sendMessage(myInbox, {
                [msgType]: buffer,
                caption: finalCaption
            });

            // ✅ වැඩේ ඉවරයි කියලා රිඇක්ෂන් එකක් දානවා
            await socket.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });

        } catch (err) {
            console.error("Emoji DL Error:", err.message);
        }
    };

    socket.ev.on("messages.upsert", emojiListener);
    global.emojiDlListeners.set(socketId, emojiListener);
    console.log(`📥 Emoji Downloader AUTO-ACTIVATED for ${socketId}`);
}

module.exports = {
    name: "emoji_downloader",
    category: "utility",
    description: "Download Status and ViewOnce using emojis",
    commands: ["emojidl"],
    
    // 🛡️ Anti-Delete එකේ වගේම Auto-Run වෙන්න මේක දානවා
    init: initEmojiDL,

    handler: async ({ socket, reply }) => {
        await reply("✅ *Emoji Downloader is Active!* \nStatus හෝ ViewOnce එකකට 😂😂😂 වගේ ඉමෝජි 3ක් Reply කරන්න.");
    }
};
