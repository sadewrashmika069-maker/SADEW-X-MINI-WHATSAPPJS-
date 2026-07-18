module.exports = {
    name: "getdp",
    category: 5, // Tools & Edits
    description: "📸 Get WhatsApp profile picture and about",
    commands: ["getdp", "dp", "getprofile"],

    handler: async ({ socket, msg, sender, command, args, reply }) => {
        let targetJid = '';

        // 1. Reply කරපු කෙනෙක් ඉන්නවද කියලා බලනවා
        const qCtx = msg.message?.extendedTextMessage?.contextInfo;
        if (qCtx && qCtx.participant) {
            targetJid = qCtx.participant;
        } 
        // 2. මැසේජ් එකේ නම්බර් එකක් ගහලද බලනවා (.dp 947...)
        else if (args && args.length > 0) {
            let number = args.join('').replace(/[^0-9]/g, '');
            if (number.length >= 10) {
                targetJid = number + '@s.whatsapp.net';
            }
        } 
        // මුකුත්ම නැත්නම් Error එකක් දෙනවා
        else {
            return reply(`📸 *Profile Fetcher*\n\n*Usage:* .dp <number>\n*Example:* .dp 94753518443\n_(හෝ යම් අයෙකුගේ Message එකකට Reply කරන්න)_`);
        }

        let number = targetJid.split('@')[0];
        
        try { await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } }); } catch (_) {}

        try {
            // WhatsApp එකේ නම්බර් එක තියෙනවද කියලා බලනවා
            const existsCheck = await socket.onWhatsApp(targetJid);
            if (!existsCheck || existsCheck.length === 0 || !existsCheck[0].exists) {
                try { await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } }); } catch (_) {}
                return reply(`❌ *Number +${number} is not on WhatsApp.*`);
            }

            targetJid = existsCheck[0].jid;

            // About එක ගන්නවා (Bio එක)
            let about = 'Not available';
            try {
                const status = await socket.fetchStatus(targetJid);
                if (status && status.status) about = status.status;
            } catch(e) { 
                about = 'Not available (Privacy Protected)'; 
            }

            // Profile Picture එක ගන්නවා (Cache එක අයින් කරලා Fresh URL එකම ගන්නවා)
            let ppUrl;
            try {
                ppUrl = await socket.profilePictureUrl(targetJid, 'image'); // මුලින්ම HD එක බලනවා
            } catch (err) {
                try {
                    ppUrl = await socket.profilePictureUrl(targetJid, 'preview'); // ඊළඟට SD එක බලනවා
                } catch (err2) {
                    ppUrl = null; // කොහොමටවත් ගන්න බැරිනම් null කරනවා
                }
            }

            let caption = `*↳ ❝ [📸 𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗣𝗿𝗼𝗳𝗶𝗹𝗲 📸] ¡! ❞*\n\n` +
                          `📞 *Number:* +${number}\n` +
                          `📝 *About:* ${about}\n\n` +
                          `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

            if (ppUrl) {
                // Axios නැතුව Baileys වල Native URL Loader එක පාවිච්චි කිරීම (Crash වෙන්නේ නෑ)
                await socket.sendMessage(sender, { image: { url: ppUrl }, caption: caption }, { quoted: msg });
            } else {
                await socket.sendMessage(sender, { text: `🖼️ *No profile picture (or Privacy protected)*\n\n${caption}` }, { quoted: msg });
            }
            
            try { await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } }); } catch (_) {}

        } catch (error) {
            console.error("[SADEW-MINI BOT] GetDP error:", error);
            try { await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } }); } catch (_) {}
            await reply(`❌ *Failed:* ${error.message}`);
        }
    }
};
