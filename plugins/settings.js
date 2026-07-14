const mongoose = require('mongoose');

module.exports = {
    name: "settings",
    category: 4, 
    description: "Bot Work Mode Settings Panel",
    commands: ["mode", "settings", "panel"],

    handler: async ({ socket, msg, sender, args, reply, isOwner, botNumber, sessionConfig, activeSockets }) => {
        
        if (!isOwner) return reply('❌ *ඔබට මෙම කමාන්ඩ් එක භාවිතා කළ නොහැක! (Owner Only)*');

        const option = args[0] ? args[0].toLowerCase() : null;
        const sanitizedNumber = botNumber.replace(/[^0-9]/g, '');

        // pair.js එකේ හදපු Database Model එක මෙතනට ගන්නවා
        const Session = mongoose.models.SessionNew;

        if (!Session) {
            return reply('❌ *Database Error: Session model එක සොයාගැනීමට නොහැක.*');
        }

        // Mode එක වෙනස් කිරීමට Option එකක් දීලා තියෙනවා නම්
        if (option === 'public' || option === 'private' || option === 'inbox') {
            try {
                await socket.sendMessage(sender, { react: { text: '⚙️', key: msg.key } });

                // 1. මතකයේ (Memory) තියෙන Config එක වෙනස් කිරීම (Restart නොකර වැඩ කිරීමට)
                if (sessionConfig) {
                    sessionConfig.MODE = option;
                }
                
                if (activeSockets && activeSockets.has(sanitizedNumber)) {
                    const currentData = activeSockets.get(sanitizedNumber);
                    currentData.config = sessionConfig;
                    activeSockets.set(sanitizedNumber, currentData);
                }

                // 2. Database එකේ ස්ථිරවම සේව් කිරීම (Redeploy කරත් නොමැකෙන්න)
                await Session.findOneAndUpdate(
                    { number: sanitizedNumber },
                    { config: sessionConfig, updatedAt: new Date() },
                    { upsert: true }
                );

                return reply(`✅ *Bot mode successfully changed to ${option.toUpperCase()} mode.*`);
            } catch (e) {
                return reply(`❌ *Error:* ${e.message}`);
            }
        }

        // Option එකක් දීලා නැත්නම් Settings Panel එක පෙන්වීම
        const currentMode = sessionConfig?.MODE || 'public';
        const panelText = `*↳ ❝ [⚙️ 𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗦𝗲𝘁𝘁𝗶𝗻𝗴𝘀 ⚙️] ¡! ❞*\n\n` +
                          `*🔸 Current Mode:* ${currentMode.toUpperCase()}\n\n` +
                          `මෙතැනින් බොට් ක්‍රියාකරන ආකාරය වෙනස් කළ හැක:\n\n` +
                          `*1.* Public Mode (සැමටම)\n` +
                          `*2.* Private Mode (Owner ට පමණක්)\n` +
                          `*3.* Inbox Only (Inbox පමණක්)\n\n` +
                          `*Mode එක වෙනස් කිරීමට පහත ආකාරයට කමාන්ඩ් එක යවන්න:*\n` +
                          `> 🛠️ _උදාහරණ:_ *.mode public* | *.mode private* | *.mode inbox*\n\n` +
                          `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

        // මෙතන අර පරණ akira ලෝගෝ එකම දැම්මා, පස්සේ ඒක වෙනස් කරමු
        await socket.sendMessage(sender, {
            image: { url: 'https://res.cloudinary.com/dqlh378fb/image/upload/v1780590033/zanta_media_uploads/dttqjshprca9zvqcpbwg.jpg' }, 
            caption: panelText
        }, { quoted: msg });
    }
};
