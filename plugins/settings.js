const mongoose = require('mongoose');
const { downloadContentFromMessage } = require('baileys');
const axios = require('axios');

module.exports = {
    name: "settings",
    category: 4, 
    description: "Bot Main Settings & Customization",
    commands: ["settings", "panel", "mode", "addpp", "delpp", "btnmode"],

    handler: async ({ socket, msg, sender, command, args, reply, botNumber, sessionConfig, activeSockets }) => {
        
        const isOwner = true; // Owner Check
        const sanitizedNumber = botNumber.replace(/[^0-9]/g, '');
        const Session = mongoose.models.SessionNew;

        // Settings Database එකේ Save කිරීමේ Function එක
        const saveConfig = async () => {
            const currentData = activeSockets.get(sanitizedNumber);
            if (currentData) {
                currentData.config = sessionConfig;
                activeSockets.set(sanitizedNumber, currentData);
            }
            await Session.findOneAndUpdate(
                { number: sanitizedNumber },
                { config: sessionConfig, updatedAt: new Date() },
                { upsert: true }
            );
        };

        const cmd = command.replace(/^\./, '').toLowerCase();

        // ════════ 1. SETTINGS PANEL ════════
        if (cmd === 'settings' || cmd === 'panel') {
            const currentMode = sessionConfig?.MODE || 'public';
            const customLogos = sessionConfig?.CUSTOM_LOGOS || [];
            
            // Button Mode එකේ තත්ත්වය පරීක්ෂා කිරීම
            const buttonModeStatus = (sessionConfig?.BUTTON_MODE === 'false') ? '🔴 OFF (Number Reply)' : '🟢 ON (Buttons)';
            
            const panelText = `*↳ ❝ [⚙️ 𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗦𝗲𝘁𝘁𝗶𝗻𝗴𝘀 ⚙️] ¡! ❞*\n\n` +
                              `*1️⃣ 𝗪𝗼𝗿𝗸 𝗠𝗼𝗱𝗲 𝗦𝗲𝘁𝘁𝗶𝗻𝗴𝘀:*\n` +
                              `🔸 Current Mode: *${currentMode.toUpperCase()}*\n` +
                              `  [1] Public (සැමටම)\n` +
                              `  [2] Private (Owner ට පමණක්)\n` +
                              `  [3] Inbox Only (Inbox පමණක්)\n` +
                              `_(අදාළ අංකය Reply කරන්න හෝ .mode 1 ලෙස යවන්න)_\n\n` +
                              `*2️⃣ 𝗠𝗲𝗻𝘂 𝗟𝗼𝗴𝗼 𝗦𝗲𝘁𝘁𝗶𝗻𝗴𝘀:*\n` +
                              `🖼️ Custom Logos: *${customLogos.length}*\n` +
                              `  • පින්තූරයකට Reply ලෙස *.addpp* යවන්න.\n` +
                              `  • පින්තූර ලැයිස්තුව මකා දැමීමට *.delpp* යවන්න.\n\n` +
                              `*3️⃣ 𝗕𝘂𝘁𝘁𝗼𝗻 𝗠𝗼𝗱𝗲 𝗦𝗲𝘁𝘁𝗶𝗻𝗴𝘀:*\n` +
                              `🔘 Current Status: *${buttonModeStatus}*\n` +
                              `  • වෙනස් කිරීමට *.btnmode on* හෝ *.btnmode off* ලෙස යවන්න.\n\n` +
                              `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

            let displayLogo = 'https://res.cloudinary.com/dqlh378fb/image/upload/v1780590033/zanta_media_uploads/dttqjshprca9zvqcpbwg.jpg';
            if (customLogos.length > 0) {
                displayLogo = customLogos[Math.floor(Math.random() * customLogos.length)];
            }

            const sentMsg = await socket.sendMessage(sender, {
                image: { url: displayLogo }, 
                caption: panelText
            }, { quoted: msg });

            // Reply Catch කිරීම සඳහා ID එක Save කිරීම
            global.sadewSettingsTracker = global.sadewSettingsTracker || {};
            global.sadewSettingsTracker[sender] = sentMsg.key.id;
            return;
        }

        // ════════ 2. MODE CHANGE (COMMAND) ════════
        if (cmd === 'mode') {
            const option = args[0] ? args[0].toLowerCase() : '';
            let newMode = '';
            if (option === '1' || option === 'public') newMode = 'public';
            else if (option === '2' || option === 'private') newMode = 'private';
            else if (option === '3' || option === 'inbox') newMode = 'inbox';
            
            if (newMode) {
                sessionConfig.MODE = newMode;
                await saveConfig();
                return reply(`✅ *Bot mode successfully changed to ${newMode.toUpperCase()} mode.*`);
            } else {
                return reply(`❌ *කරුණාකර නිවැරදි Mode එකක් ලබාදෙන්න!*\nඋදා: .mode 1`);
            }
        }

        // ════════ 3. BUTTON MODE TOGGLE (NEW) ════════
        if (cmd === 'btnmode') {
            const option = args[0] ? args[0].toLowerCase() : '';
            if (option === 'on') {
                sessionConfig.BUTTON_MODE = 'true';
                await saveConfig();
                return reply(`✅ *Button Mode successfully turned ON!*\nමින් ඉදිරියට බොට් Buttons පෙන්වනු ඇත.`);
            } else if (option === 'off') {
                sessionConfig.BUTTON_MODE = 'false';
                await saveConfig();
                return reply(`✅ *Button Mode successfully turned OFF!*\nමින් ඉදිරියට Buttons වෙනුවට Number Reply ක්‍රමය ක්‍රියාත්මක වේ.`);
            } else {
                return reply(`❌ *කරුණාකර නිවැරදි විධානයක් ලබාදෙන්න!*\nඋදා: .btnmode on (හෝ) .btnmode off`);
            }
        }

        // ════════ 4. ADD CUSTOM MENU LOGO (.addpp) ════════
        if (cmd === 'addpp') {
            const qMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!qMsg || !qMsg.imageMessage) return reply("🖼️ *කරුණාකර පින්තූරයකට Reply කර .addpp ලෙස යවන්න!*");

            try {
                await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });
                
                const stream = await downloadContentFromMessage(qMsg.imageMessage, 'image');
                let buffer = Buffer.from([]);
                for await(const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }

                // --- 🚀 XWOLF IMGBB API UPLOAD කෑල්ල ---
                const base64Image = buffer.toString('base64');
                const apiUrl = 'https://apis.xwolf.space/api/url/imgbb?key=wxa_f_4e840b5e42';

                const response = await axios.post(apiUrl, { image: base64Image });
                const imgUrl = response.data?.url || response.data?.data?.url || response.data?.result?.url;

                if (!imgUrl || !imgUrl.startsWith('http')) {
                    throw new Error("Wolf API එක හරහා පින්තූරය Upload කිරීම අසාර්ථක විය.");
                }

                if (!sessionConfig.CUSTOM_LOGOS) sessionConfig.CUSTOM_LOGOS = [];
                sessionConfig.CUSTOM_LOGOS.push(imgUrl);
                
                await saveConfig();
                
                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });
                return reply(`✅ *පින්තූරය සාර්ථකව ඔබේ Menu එකට එකතු කරන ලදී!*\nදැන් ඔබ සතුව Custom Logos ${sessionConfig.CUSTOM_LOGOS.length} ක් ඇත.\n(.menu යොදා පරීක්ෂා කරන්න)`);

            } catch (e) {
                return reply(`❌ *Error uploading image:* ${e.message}`);
            }
        }

        // ════════ 5. DELETE ALL CUSTOM LOGOS (.delpp) ════════
        if (cmd === 'delpp') {
            sessionConfig.CUSTOM_LOGOS = [];
            await saveConfig();
            return reply(`✅ *ඔබේ Custom Logo ලැයිස්තුව මකා දමන ලදී!*\nදැන් Bot ගේ මුල් පින්තූර (Default) භාවිතා වේ.`);
        }
    }
};
