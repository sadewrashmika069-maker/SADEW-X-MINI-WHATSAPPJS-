const mongoose = require('mongoose');
const { downloadContentFromMessage } = require('baileys');
const axios = require('axios');

module.exports = {
    name: "settings",
    category: 4, 
    description: "Bot Main Settings & Customization",
    commands: ["settings", "panel", "mode", "addpp", "delpp", "btnmode"],

    handler: async ({ socket, msg, sender, command, args, reply, botNumber, sessionConfig, activeSockets }) => {
        
        const sanitizedNumber = botNumber.replace(/[^0-9]/g, '');
        const Session = mongoose.models.SessionNew;

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

        // 🔘 බොත්තම් ක්‍රමය On / Off කිරීම (Database Sync)
        if (cmd === 'btnmode') {
            const option = args[0] ? args[0].toLowerCase() : '';
            if (!sessionConfig.USER_BTN_PREFS) sessionConfig.USER_BTN_PREFS = {};

            if (option === 'on') {
                sessionConfig.USER_BTN_PREFS[sender] = 'true';
                await saveConfig();
                return reply(`✅ *Button Mode ON!*\nමින් ඉදිරියට ඔබට Buttons පෙනෙනු ඇත.`);
            } else if (option === 'off') {
                sessionConfig.USER_BTN_PREFS[sender] = 'false';
                await saveConfig();
                return reply(`✅ *Button Mode OFF!*\nමින් ඉදිරියට ඔබට Buttons වෙනුවට Number Reply පෙනෙනු ඇත.`);
            } else {
                return reply(`❌ *කරුණාකර නිවැරදි විධානයක් ලබාදෙන්න!*\nඋදා: .btnmode on (හෝ) .btnmode off`);
            }
        }

        // ════════ 1. SETTINGS PANEL ════════
        if (cmd === 'settings' || cmd === 'panel') {
            const currentMode = sessionConfig?.MODE || 'public';
            const customLogos = sessionConfig?.CUSTOM_LOGOS || [];
            
            const userPrefs = sessionConfig?.USER_BTN_PREFS || {};
            const userPref = userPrefs[sender];
            const btnStatus = (userPref === 'false') ? "🔴 OFF (Number Reply)" : "🟢 ON (Buttons)";
            
            const panelText = `*↳ ❝ [⚙️ 𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗦𝗲𝘁𝘁𝗶𝗻𝗴𝘀 ⚙️] ¡! ❞*\n\n` +
                              `*1️⃣ 𝗪𝗼𝗿𝗸 𝗠𝗼𝗱𝗲 𝗦𝗲𝘁𝘁𝗶𝗻𝗴𝘀:*\n` +
                              `🔸 Current Mode: *${currentMode.toUpperCase()}*\n` +
                              `  [1] Public | [2] Private | [3] Inbox\n` +
                              `_(වෙනස් කිරීමට .mode 1, 2 හෝ 3 යොදන්න)_\n\n` +
                              `*2️⃣ 𝗠𝗲𝗻𝘂 𝗟𝗼𝗴𝗼 𝗦𝗲𝘁𝘁𝗶𝗻𝗴𝘀:*\n` +
                              `🖼️ Custom Logos: *${customLogos.length}*\n` +
                              `  • .addpp / .delpp\n\n` +
                              `*3️⃣ 𝗕𝘂𝘁𝘁𝗼𝗻 𝗠𝗼𝗱𝗲 (ඔබට පමණක්):*\n` +
                              `🔘 Current Status: *${btnStatus}*\n` +
                              `  • වෙනස් කිරීමට *.btnmode on* හෝ *.btnmode off* යවන්න.\n\n` +
                              `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

            let displayLogo = 'https://res.cloudinary.com/dqlh378fb/image/upload/v1780590033/zanta_media_uploads/dttqjshprca9zvqcpbwg.jpg';
            if (customLogos.length > 0) {
                displayLogo = customLogos[Math.floor(Math.random() * customLogos.length)];
            }

            const sentMsg = await socket.sendMessage(sender, {
                image: { url: displayLogo }, 
                caption: panelText
            }, { quoted: msg });

            // මේක අනිවාර්යයෙන් තියෙන්න ඕනේ settings panel එකෙන් mode එක වෙනස් කරන්න
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

        // ════════ 3. ADD CUSTOM MENU LOGO (.addpp) ════════
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

                const base64Image = buffer.toString('base64');
                const apiUrl = 'https://apis.xwolf.space/api/url/imgbb?key=wxa_f_4e840b5e42';
                const response = await axios.post(apiUrl, { image: base64Image });
                const imgUrl = response.data?.url || response.data?.data?.url || response.data?.result?.url;

                if (!imgUrl || !imgUrl.startsWith('http')) {
                    throw new Error("Wolf API Upload Failed");
                }

                if (!sessionConfig.CUSTOM_LOGOS) sessionConfig.CUSTOM_LOGOS = [];
                sessionConfig.CUSTOM_LOGOS.push(imgUrl);
                
                await saveConfig();
                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });
                return reply(`✅ *පින්තූරය සාර්ථකව එකතු කරන ලදී!*`);
            } catch (e) {
                return reply(`❌ *Error:* ${e.message}`);
            }
        }

        // ════════ 4. DELETE ALL CUSTOM LOGOS (.delpp) ════════
        if (cmd === 'delpp') {
            sessionConfig.CUSTOM_LOGOS = [];
            await saveConfig();
            return reply(`✅ *Custom Logo ලැයිස්තුව මකා දමන ලදී!*`);
        }
    }
};
