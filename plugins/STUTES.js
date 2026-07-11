const { downloadContentFromMessage, getContentType } = require('baileys');

module.exports = {
    name: "emoji_downloader",
    category: "utility",
    description: "Download Status and ViewOnce using 3 identical emojis",
    commands: [], // 🛑 කිසිම කමාන්ඩ් එකක් නෑ, Non-prefix වැඩ කරන්නේ!
    on: "message",

    handler: async ({ socket, msg, sender }) => {
        try {
            // මැසේජ් එකේ තියෙන Text එක ගන්නවා
            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
            
            if (!text) return; 

            // Text එක අකුරෙන් අකුරට (ඉමෝජි වලට) කඩනවා
            const chars = Array.from(text.trim());
            
            // 🛑 හරියටම Character 3ක් තියෙනවද, ඒ 3ම එකමද, සහ ඒක ඉමෝජියක්ද කියලා බලනවා
            const isThreeIdenticalEmojis = chars.length === 3 && 
                                           chars[0] === chars[1] && 
                                           chars[1] === chars[2] && 
                                           /\p{Emoji}/u.test(chars[0]);

            // ඉමෝජි 3ක් නෙමෙයි නම් කෝඩ් එක එතනින්ම නවත්තනවා
            if (!isThreeIdenticalEmojis) return;

            // Reply කරපු මැසේජ් එකක් තියෙනවද බලනවා
            const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
            if (!contextInfo) return;

            const quotedMsg = contextInfo.quotedMessage;
            if (!quotedMsg) return;

            // 🛑 ඒක Status එකක්ද නැත්නම් ViewOnce එකක්ද කියලා අඳුරගන්නවා
            const isStatus = contextInfo.remoteJid === 'status@broadcast';
            const isViewOnce = quotedMsg.viewOnceMessage || quotedMsg.viewOnceMessageV2 || quotedMsg.viewOnceMessageV2Extension;

            if (!isStatus && !isViewOnce) return;

            // 📥 ඩවුන්ලෝඩ් කරන්න ඕනේ හරියටම මොන මැසේජ් එකද කියලා හොයාගන්නවා
            let actualMessage = isViewOnce ? 
                (quotedMsg.viewOnceMessage?.message || quotedMsg.viewOnceMessageV2?.message || quotedMsg.viewOnceMessageV2Extension?.message) : 
                quotedMsg;

            const type = getContentType(actualMessage);
            if (!type || (type !== 'imageMessage' && type !== 'videoMessage' && type !== 'audioMessage')) return;

            const mediaMsg = actualMessage[type];

            // ⬇️ වැඩේ පටන් ගත්තා කියලා ඉමෝජි රිඇක්ෂන් එකක් දානවා
            await socket.sendMessage(sender, { react: { text: '⬇️', key: msg.key } });

            // 🚀 Media එක Download කරනවා
            const stream = await downloadContentFromMessage(mediaMsg, type.replace('Message', ''));
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const msgType = type === 'imageMessage' ? 'image' : (type === 'videoMessage' ? 'video' : 'audio');
            const captionText = mediaMsg.caption ? `📝 *Caption:* ${mediaMsg.caption}\n\n` : '';
            const tag = isStatus ? '📱 *Status Downloaded*' : '👁️ *ViewOnce Downloaded*';

            // 📩 ඔයාගේ Inbox එකට (You Chat එකට) යවනවා
            await socket.sendMessage(sender, {
                [msgType]: buffer,
                caption: `${tag}\n${captionText}> 𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆`
            });

            // ✅ වැඩේ ඉවරයි කියලා හරි ලකුණ දානවා
            await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

        } catch (error) {
            console.error("Emoji DL Error:", error.message);
        }
    }
};
