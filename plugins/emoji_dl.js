const { downloadContentFromMessage, getContentType, jidNormalizedUser } = require('baileys');

// ==========================================
// 🛡️ ANTI-CRASH GUARD (බොට් හිරවෙන එක නවත්තන්න)
// ==========================================
if (!global.undiciCrashFixed) {
    process.on('uncaughtException', (err) => {
        if (err.message === 'terminated' || err?.code === 'UND_ERR_SOCKET' || err?.message?.includes('other side closed')) {
            console.log('⚠️ Ignored Baileys Download Socket Error (Bot Protected)');
            return;
        }
        console.error('Uncaught Exception:', err);
    });
    global.undiciCrashFixed = true;
}

if (!global.emojiDlListeners) global.emojiDlListeners = new Map();

function initEmojiDL(socket) {
    if (!socket || !socket.user) return;
    const sessionJid = jidNormalizedUser(socket.user.id);
    const socketId = sessionJid.split('@')[0];

    // Reconnect වෙද්දි පරණ කනෙක්ෂන් එක හිර වෙන එක හදලා තියෙන්නේ
    const active = global.emojiDlListeners.get(socketId);
    if (active && active.socket === socket) return; 

    const emojiListener = async (chatUpdate) => {
        try {
            const msg = chatUpdate.messages[0];
            if (!msg || !msg.message) return;

            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
            if (!text) return;

            const trimmed = text.trim();
            const chars = Array.from(trimmed);
            
            if (chars.length < 3) return;
            
            const firstChar = chars[0];
            if (!chars.every(c => c === firstChar)) return;
            if (/[a-zA-Z0-9\s]/.test(firstChar)) return;

            const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
            if (!contextInfo) return;

            const quotedMsg = contextInfo.quotedMessage;
            if (!quotedMsg) return;

            const isStatus = contextInfo.remoteJid === 'status@broadcast';
            const isViewOnce = quotedMsg.viewOnceMessage || quotedMsg.viewOnceMessageV2 || quotedMsg.viewOnceMessageV2Extension;

            if (!isStatus && !isViewOnce) return;

            let actualMessage = quotedMsg;
            if (quotedMsg.viewOnceMessage) actualMessage = quotedMsg.viewOnceMessage.message;
            if (quotedMsg.viewOnceMessageV2) actualMessage = quotedMsg.viewOnceMessageV2.message;
            if (quotedMsg.viewOnceMessageV2Extension) actualMessage = quotedMsg.viewOnceMessageV2Extension.message;

            const type = getContentType(actualMessage);
            if (!type || (type !== 'imageMessage' && type !== 'videoMessage' && type !== 'audioMessage')) return;

            const mediaMsg = actualMessage[type];
            const myInbox = sessionJid; 
            const msgType = type === 'imageMessage' ? 'image' : (type === 'videoMessage' ? 'video' : 'audio');

            // ⏳ වැඩේ පටන් ගත්තා
            await socket.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });

            // ==========================================
            // 🔄 AUTO-RETRY DOWNLOAD SYSTEM (වීඩියෝ ෆේල් වුණොත් ආයෙත් ට්‍රයි කරයි)
            // ==========================================
            let buffer = Buffer.from([]);
            let downloadSuccess = false;
            
            for (let i = 0; i < 3; i++) { // උපරිම 3 පාරක් ට්‍රයි කරනවා
                try {
                    const stream = await downloadContentFromMessage(mediaMsg, type.replace('Message', ''));
                    buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }
                    downloadSuccess = true;
                    break; // සාර්ථකයි නම් ලූප් එකෙන් එළියට එනවා
                } catch (e) {
                    console.log(`⚠️ Download attempt ${i + 1} failed, retrying...`);
                    await new Promise(r => setTimeout(r, 1500)); // තත්පර 1.5ක් ඉඳලා ආයෙත් ට්‍රයි කරනවා
                }
            }

            // 3 පාරක්ම ෆේල් වුණොත් ❌ රිඇක්ෂන් එක දානවා (⏳ එකේ හිරවෙලා ඉන්නේ නෑ)
            if (!downloadSuccess) {
                await socket.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
                return; 
            }

            let originalCaption = mediaMsg.caption || "";
            const tag = isStatus ? '📱 *Status Downloaded*' : '👁️ *ViewOnce Downloaded*';
            let finalCaption = `${tag}\n\n`;
            if (originalCaption) finalCaption += `📝 *Caption:* ${originalCaption}\n\n`;
            finalCaption += `> 𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆`;

            // 📩 Inbox එකට යවනවා
            await socket.sendMessage(myInbox, {
                [msgType]: buffer,
                caption: finalCaption
            });

            // ✅ සාර්ථකයි
            await socket.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });

        } catch (err) {
            console.error("Emoji DL Error:", err.message);
            try {
                // වෙන මොකක් හරි Error එකක් ආවොත් ❌ වැටෙනවා
                await socket.sendMessage(chatUpdate.messages[0].key.remoteJid, { react: { text: '❌', key: chatUpdate.messages[0].key } });
            } catch(e) {}
        }
    };

    socket.ev.on("messages.upsert", emojiListener);
    // Socket Object එකත් එක්කම සේව් කරන නිසා Reconnect වෙද්දි අවුල් යන්නේ නෑ
    global.emojiDlListeners.set(socketId, { socket, listener: emojiListener });
    console.log(`📥 Emoji Downloader AUTO-ACTIVATED for ${socketId}`);
}

module.exports = {
    name: "emoji_downloader",
    category: "utility",
    description: "Download Status and ViewOnce using emojis",
    commands: ["emojidl"],
    init: initEmojiDL,
    handler: async ({ socket, reply }) => {
        await reply("✅ *Emoji Downloader is Active!*");
    }
};
