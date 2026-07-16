const mongoose = require('mongoose');
const crypto = require('crypto');
const { downloadContentFromMessage } = require('baileys');
const axios = require('axios');

// මැසේජ් ට්‍රැක් කරන්න හදන Global Variable එක
global.btnFallbackTracker = global.btnFallbackTracker || {};

module.exports = {
    name: "settings",
    category: 4, 
    description: "Bot Settings & Button Mode",
    commands: ["settings", "panel", "mode", "addpp", "delpp", "btnmode"],

    handler: async ({ socket, msg, sender, command, args, reply, botNumber, sessionConfig, activeSockets }) => {
        
        const sanitizedNumber = botNumber.replace(/[^0-9]/g, '');
        const Session = mongoose.models.SessionNew;

        // 🔴 1. GLOBAL HACK (PAIR.JS අල්ලන්නේ නැතුව බොට්ව පාලනය කිරීම) 🔴
        if (!socket.isSmartOverridden) {
            const originalSendMessage = socket.sendMessage.bind(socket);
            
            // මැසේජ් යවන සිස්ටම් එක හයිජැක් කරනවා
            socket.sendMessage = async (jid, content, options) => {
                const currentConfig = activeSockets.get(sanitizedNumber)?.config || {};
                
                // Button තියෙනවා නම් සහ Button Mode OFF නම්
                if (content.buttons && currentConfig.BUTTON_MODE === 'false') {
                    
                    // 🔥 මේක Main Menu එකද කියලා බලනවා (catmenu කියන කමාන්ඩ් එක තියෙනවද කියලා)
                    let isMainMenu = content.buttons.some(b => b.buttonId && b.buttonId.includes('.catmenu'));

                    if (isMainMenu) {
                        // Main Menu එක නම්, Buttons ටික විතරක් අයින් කරනවා. 
                        // අලුතින් ලිස්ට් එකක් හදන්නේ නෑ, Track කරන්නේ නෑ! (පරණ කෝඩ් එකෙන් ඒක බලාගනීවි)
                        let finalOpts = { ...content };
                        delete finalOpts.buttons;
                        delete finalOpts.headerType;
                        return await originalSendMessage(jid, finalOpts, options);
                    }

                    // අනිත් සාමාන්‍ය Buttons (උදා: Video Quality වගේ) වලට Auto List එක හදනවා
                    let fallbackText = (content.caption || content.text || "") + "\n\n*👇 පහතින් අවශ්‍ය අංකය Reply කරන්න:*\n\n";
                    let map = {};
                    
                    content.buttons.forEach((btn, index) => {
                        let num = index + 1;
                        fallbackText += `*${num}.* ${btn.buttonText.displayText}\n`;
                        map[num.toString()] = btn.buttonId; // හැංගිලා තියෙන Command එක සේව් කරනවා
                    });
                    
                    if (content.footer) fallbackText += `\n> ${content.footer}`;

                    let finalOpts = { ...content };
                    delete finalOpts.buttons;
                    delete finalOpts.headerType;
                    
                    if (finalOpts.image) finalOpts.caption = fallbackText;
                    else if (finalOpts.video) finalOpts.caption = fallbackText;
                    else finalOpts.text = fallbackText;

                    const sentMsg = await originalSendMessage(jid, finalOpts, options);
                    
                    let targetSender = options?.quoted?.key?.remoteJid || jid;
                    global.btnFallbackTracker[targetSender] = { msgId: sentMsg?.key?.id, map: map };
                    
                    return sentMsg;
                }
                
                return await originalSendMessage(jid, content, options);
            };

            // නම්බර් රිප්ලයි එක අල්ලගන්න අලුත් Listener එකක් බඳිනවා
            socket.ev.on('messages.upsert', async ({ messages }) => {
                try {
                    const m = messages[0];
                    if (!m.message) return;
                    
                    const quotedStanzaId = m.message.extendedTextMessage?.contextInfo?.stanzaId;
                    const replyText = m.message.conversation || m.message.extendedTextMessage?.text || "";
                    const mSender = m.key.remoteJid;

                    if (quotedStanzaId && global.btnFallbackTracker[mSender]) {
                        if (global.btnFallbackTracker[mSender].msgId === quotedStanzaId) {
                            const mappedCmd = global.btnFallbackTracker[mSender].map[replyText.trim()];
                            if (mappedCmd) {
                                // යූසර් නම්බර් එක ගැහුවම, ඇත්ත බටන් කමාන්ඩ් එක එබුවා වගේ බොට්ව රවට්ටනවා
                                let fakeMsg = JSON.parse(JSON.stringify(m)); 
                                fakeMsg.key.id = crypto.randomBytes(16).toString("hex").toUpperCase(); 
                                fakeMsg.message = { conversation: mappedCmd }; 
                                
                                // ෆේක් කරපු මැසේජ් එක ආයෙත් බොට්ටම යවනවා Process වෙන්න
                                socket.ev.emit('messages.upsert', { messages: [fakeMsg], type: 'notify' });
                                delete global.btnFallbackTracker[mSender];
                            }
                        }
                    }
                } catch (e) {
                    console.error("Smart Button Error:", e);
                }
            });

            socket.isSmartOverridden = true;
            console.log("✅ Smart Button Override Activated via Plugin!");
        }

        // ════════ 2. PLUGIN COMMANDS LOGIC ════════
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

        // 🔘 බොත්තම් ක්‍රමය On / Off කරන කමාන්ඩ් එක (btnmode)
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

        // ⚙️ Mode වෙනස් කිරීම (mode)
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

        // 🖼️ Custom Logo එකතු කිරීම (addpp)
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

        // 🗑️ Custom Logos මැකීම (delpp)
        if (cmd === 'delpp') {
            sessionConfig.CUSTOM_LOGOS = [];
            await saveConfig();
            return reply(`✅ *ඔබේ Custom Logo ලැයිස්තුව මකා දමන ලදී!*\nදැන් Bot ගේ මුල් පින්තූර (Default) භාවිතා වේ.`);
        }

        // 🛠️ Settings Panel එක (settings / panel)
        if (cmd === 'settings' || cmd === 'panel') {
            const currentMode = sessionConfig?.MODE || 'public';
            const customLogos = sessionConfig?.CUSTOM_LOGOS || [];
            const btnStatus = (sessionConfig.BUTTON_MODE === 'false') ? "🔴 OFF (Number Reply)" : "🟢 ON (Buttons)";
            
            const panelText = `*↳ ❝ [⚙️ 𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗦𝗲𝘁𝘁𝗶𝗻𝗴𝘀 ⚙️] ¡! ❞*\n\n` +
                              `*1️⃣ 𝗪𝗼𝗿𝗸 𝗠𝗼𝗱𝗲 𝗦𝗲𝘁𝘁𝗶𝗻𝗴𝘀:*\n` +
                              `🔸 Current Mode: *${currentMode.toUpperCase()}*\n` +
                              `  [1] Public (සැමටම)\n` +
                              `  [2] Private (Owner ට පමණක්)\n` +
                              `  [3] Inbox Only (Inbox පමණක්)\n` +
                              `_(වෙනස් කිරීමට .mode 1, 2 හෝ 3 යොදන්න)_\n\n` +
                              `*2️⃣ 𝗠𝗲𝗻𝘂 𝗟𝗼𝗴𝗼 𝗦𝗲𝘁𝘁𝗶𝗻𝗴𝘀:*\n` +
                              `🖼️ Custom Logos: *${customLogos.length}*\n` +
                              `  • පින්තූරයකට Reply ලෙස *.addpp* යවන්න.\n` +
                              `  • පින්තූර ලැයිස්තුව මකා දැමීමට *.delpp* යවන්න.\n\n` +
                              `*3️⃣ 𝗕𝘂𝘁𝘁𝗼𝗻 𝗠𝗼𝗱𝗲 𝗦𝗲𝘁𝘁𝗶𝗻𝗴𝘀:*\n` +
                              `🔘 Current Status: *${btnStatus}*\n` +
                              `  • වෙනස් කිරීමට *.btnmode on* හෝ *.btnmode off* යවන්න.\n\n` +
                              `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

            let displayLogo = 'https://res.cloudinary.com/dqlh378fb/image/upload/v1780590033/zanta_media_uploads/dttqjshprca9zvqcpbwg.jpg';
            if (customLogos.length > 0) {
                displayLogo = customLogos[Math.floor(Math.random() * customLogos.length)];
            }

            return await socket.sendMessage(sender, {
                image: { url: displayLogo }, 
                caption: panelText
            }, { quoted: msg });
        }
    }
};
