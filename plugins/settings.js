const mongoose = require('mongoose');
const crypto = require('crypto');
const { downloadContentFromMessage } = require('baileys');
const axios = require('axios');

global.userButtonPrefs = global.userButtonPrefs || {};
global.btnFallbackTracker = global.btnFallbackTracker || {};

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

        // 🔴 GLOBAL HACK (PAIR.JS අල්ලන්නේ නැතුව පිටින් ඉඳන් බොට්ව පාලනය කිරීම) 🔴
        if (!socket.isSmartOverridden) {
            const originalSendMessage = socket.sendMessage.bind(socket);
            
            socket.sendMessage = async (jid, content, options) => {
                const userPref = global.userButtonPrefs[jid];
                
                // යූසර් '.btnmode off' ගහලා නම් විතරක් නම්බර් රිප්ලයි යවනවා
                if (content.buttons && userPref === 'false') {
                    let fallbackText = (content.caption || content.text || "") + "\n\n*👇 පහතින් අවශ්‍ය අංකය Reply කරන්න:*\n\n";
                    let map = {};
                    
                    content.buttons.forEach((btn, index) => {
                        let num = index + 1;
                        fallbackText += `*${num}.* ${btn.buttonText.displayText}\n`;
                        map[num.toString()] = btn.buttonId;
                    });
                    
                    if (content.footer) fallbackText += `\n> ${content.footer}`;

                    let finalOpts = { ...content };
                    delete finalOpts.buttons;
                    delete finalOpts.headerType;
                    
                    if (finalOpts.image) finalOpts.caption = fallbackText;
                    else if (finalOpts.video) finalOpts.caption = fallbackText;
                    else finalOpts.text = fallbackText;

                    const sentMsg = await originalSendMessage(jid, finalOpts, options);
                    global.btnFallbackTracker[jid] = { msgId: sentMsg?.key?.id, map: map };
                    
                    return sentMsg;
                }
                
                return await originalSendMessage(jid, content, options);
            };

            // නම්බර් රිප්ලයි අල්ලගන්න පිටින් අලුත් කනක් (Listener) දානවා
            socket.ev.on('messages.upsert', async ({ messages }) => {
                try {
                    const m = messages[0];
                    if (!m.message) return;
                    
                    const mSender = m.key.remoteJid;
                    const quotedStanzaId = m.message.extendedTextMessage?.contextInfo?.stanzaId;
                    const replyText = m.message.conversation || m.message.extendedTextMessage?.text || "";

                    if (quotedStanzaId && global.btnFallbackTracker[mSender]) {
                        if (global.btnFallbackTracker[mSender].msgId === quotedStanzaId) {
                            const mappedCmd = global.btnFallbackTracker[mSender].map[replyText.trim()];
                            if (mappedCmd) {
                                let fakeMsg = JSON.parse(JSON.stringify(m)); 
                                fakeMsg.key.id = crypto.randomBytes(16).toString("hex").toUpperCase(); 
                                fakeMsg.message = { conversation: mappedCmd }; 
                                socket.ev.emit('messages.upsert', { messages: [fakeMsg], type: 'notify' });
                                delete global.btnFallbackTracker[mSender];
                            }
                        }
                    }
                } catch (e) {
                    console.log("Settings Plugin Error:", e);
                }
            });

            socket.isSmartOverridden = true;
            console.log("✅ Button Hack Injected via Plugin!");
        }

        const cmd = command.replace(/^\./, '').toLowerCase();

        // 🔘 බොත්තම් ක්‍රමය On / Off කිරීම (Per User)
        if (cmd === 'btnmode') {
            const option = args[0] ? args[0].toLowerCase() : '';
            if (option === 'on') {
                global.userButtonPrefs[sender] = 'true';
                return reply(`✅ *Button Mode ON!*\nමින් ඉදිරියට ඔබට Buttons පෙනෙනු ඇත.`);
            } else if (option === 'off') {
                global.userButtonPrefs[sender] = 'false';
                return reply(`✅ *Button Mode OFF!*\nමින් ඉදිරියට ඔබට Buttons වෙනුවට Number Reply ක්‍රමය ක්‍රියාත්මක වේ.`);
            } else {
                return reply(`❌ *කරුණාකර නිවැරදි විධානයක් ලබාදෙන්න!*\nඋදා: .btnmode on (හෝ) .btnmode off`);
            }
        }

        // ════════ 1. SETTINGS PANEL ════════
        if (cmd === 'settings' || cmd === 'panel') {
            const currentMode = sessionConfig?.MODE || 'public';
            const customLogos = sessionConfig?.CUSTOM_LOGOS || [];
            
            const userPref = global.userButtonPrefs[sender];
            const btnStatus = (userPref === 'false') ? "🔴 OFF (Number Reply)" : "🟢 ON (Buttons)";
            
            const panelText = `*↳ ❝ [⚙️ 𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗦𝗲𝘁𝘁𝗶𝗻𝗴𝘀 ⚙️] ¡! ❞*\n\n` +
                              `*1️⃣ 𝗪𝗼𝗿𝗸 𝗠𝗼𝗱𝗲 𝗦𝗲𝘁𝘁𝗶𝗻𝗴𝘀:*\n` +
                              `🔸 Current Mode: *${currentMode.toUpperCase()}*\n` +
                              `  [1] Public | [2] Private | [3] Inbox\n` +
                              `_(වෙනස් කිරීමට .mode 1, 2 හෝ 3 යොදන්න)_\n\n` +
                              `*2️⃣ 𝗠𝗲𝗻𝘂 𝗟𝗼𝗴𝗼 𝗦𝗲𝘁𝘁𝗶𝗻𝗴𝘀:*\n` +
                              `🖼️ Custom Logos: *${customLogos.length}*\n` +
                              `  • .addpp / .delpp\n\n` +
                              `*3️⃣ 𝗕𝘂𝘁𝘁𝗼𝗻 𝗠𝗼𝗱𝗲 𝗦𝗲𝘁𝘁𝗶𝗻𝗴𝘀 (ඔබට පමණක්):*\n` +
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
