const { cmd, commands } = require('../command'); // ඔයාගේ command.js තියෙන තැන අනුව මේක වෙනස් වෙන්න පුළුවන්
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

cmd({
    pattern: "s",
    alias: ["sticker", "stick"],
    desc: "Convert Image or Video to Sticker.",
    category: "media",
    react: "🔄",
    use: '.s <reply to image/video>',
    filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, reply }) => {
    try {
        // මැසේජ් එකේ අඩංගු දේ ලබා ගැනීම
        const isQuoted = mek.message?.extendedTextMessage;
        const quotedMsg = isQuoted ? mek.message.extendedTextMessage.contextInfo.quotedMessage : null;
        
        const messageType = quotedMsg ? Object.keys(quotedMsg)[0] : Object.keys(mek.message)[0];
        const mediaMessage = quotedMsg ? quotedMsg[messageType] : mek.message[messageType];

        // ෆොටෝ එකක් හෝ වීඩියෝ එකක් නෙමෙයි නම් කමාන්ඩ් එක නවත්තනවා
        if (messageType !== 'imageMessage' && messageType !== 'videoMessage') {
            return reply("❌ කරුණාකර ඡායාරූපයකට හෝ වීඩියෝවකට Reply කර '.s' යොදන්න.");
        }

        // Media එක ඩවුන්ලෝඩ් කිරීම
        const stream = await downloadContentFromMessage(mediaMessage, messageType.replace('Message', ''));
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        // wa-sticker-formatter හරහා ස්ටිකර් එක හැදීම
        const sticker = new Sticker(buffer, {
            pack: '𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 🎀', // ස්ටිකර් පැක් එකේ නම
            author: '𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆', // ඔයාගේ නම
            type: StickerTypes.FULL, // FULL හෝ CROPPED
            categories: ['🤩', '🎉'], 
            quality: 60, 
            background: 'transparent'
        });

        // Buffer එකක් විදිහට කන්වර්ට් කරගැනීම
        const stickerBuffer = await sticker.toBuffer();

        // ස්ටිකර් එක යැවීම
        await conn.sendMessage(from, { sticker: stickerBuffer }, { quoted: mek });
        
        // වැඩේ සාර්ථකයි කියලා React කිරීම
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (error) {
        console.error("❌ Sticker Plugin Error:", error);
        reply("❌ ස්ටිකරය සෑදීමේදී දෝෂයක් මතු විය. වීඩියෝවක් නම් එය තත්පර 10 ට අඩු දැයි පරීක්ෂා කරන්න.");
    }
});
