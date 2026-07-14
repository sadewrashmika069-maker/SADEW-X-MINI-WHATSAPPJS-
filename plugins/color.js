const sharp = require("sharp");
const { downloadContentFromMessage, getContentType, generateWAMessageFromContent } = require("baileys");

// 🔴 Global Context (Photo එක මතක තියාගන්න)
if (!global.colorContexts) global.colorContexts = {};

// Levels වලට අදාළ Color Configurations
const LEVELS = {
    1: { saturation: 1.18, brightness: 1.02, contrast: 1.04, sharpen: 0.6 },
    2: { saturation: 1.32, brightness: 1.03, contrast: 1.06, sharpen: 0.8 },
    3: { saturation: 1.48, brightness: 1.04, contrast: 1.08, sharpen: 1.0 },
    4: { saturation: 1.65, brightness: 1.05, contrast: 1.1, sharpen: 1.2 },
    5: { saturation: 1.85, brightness: 1.06, contrast: 1.12, sharpen: 1.4 },
};

module.exports = {
    name: "color_enhancer",
    category: "image",
    description: "Enhance image colors using a selection menu",
    commands: ["colour", "color", "color_dl"], 

    handler: async ({ socket, msg, sender, command, args }) => {
        
        // ==========================================
        // 🔥 1. DOWNLOAD COMMAND (.color_dl) - Button එක එබුවම
        // ==========================================
        if (command === "color_dl") {
            const level = parseInt(args[0]);
            const context = global.colorContexts[sender];

            if (!context || !context.imageMessage) {
                return await socket.sendMessage(sender, { text: "❌ *කාලය ඉකුත් වී ඇත! කරුණාකර නැවතත් Photo එකකට Reply කර .color ලෙස Type කරන්න.*" }, { quoted: msg });
            }

            if (!LEVELS[level]) return;

            await socket.sendMessage(sender, { react: { text: "⏳", key: msg.key } });
            await socket.sendMessage(sender, { text: `🎨 _Level ${level} Applying Color Enhancements..._` }, { quoted: msg });

            try {
                // සේව් කරපු ෆොටෝ එක ඩවුන්ලෝඩ් කරනවා
                const stream = await downloadContentFromMessage(context.imageMessage, 'image');
                let inputBuffer = Buffer.from([]);
                for await (const chunk of stream) {
                    inputBuffer = Buffer.concat([inputBuffer, chunk]);
                }

                // Sharp එකෙන් ෆොටෝ එක Edit කරනවා (ඔයාගේ ලොජික් එක)
                const config = LEVELS[level];
                const contrastOffset = Math.round(128 - 128 * config.contrast);

                const outputBuffer = await sharp(inputBuffer, { limitInputPixels: false })
                    .rotate()
                    .modulate({
                        saturation: config.saturation,
                        brightness: config.brightness,
                    })
                    .linear(config.contrast, contrastOffset)
                    .sharpen({ sigma: config.sharpen })
                    .jpeg({
                        quality: 100, // Quality එක උපරිම කළා
                        chromaSubsampling: "4:4:4",
                        progressive: true,
                        mozjpeg: false,
                    })
                    .toBuffer();

                // 🛑 වැඩේ ඉවර නිසා Context එක මකනවා
                delete global.colorContexts[sender];

                // Edit කරපු ෆොටෝ එක යවනවා
                await socket.sendMessage(sender, {
                    image: outputBuffer,
                    caption: `🎨 *HD Color Enhanced*\n📊 *Level:* ${level}\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
                }, { quoted: msg });

                await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

            } catch (err) {
                console.error("Color Edit Error:", err);
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                await socket.sendMessage(sender, { text: `❌ *Error:* ${err.message}` }, { quoted: msg });
            }
            return;
        }

        // ==========================================
        // 🔥 2. MAIN COMMAND (.colour / .color)
        // ==========================================
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        const quotedMsg = contextInfo?.quotedMessage;
        
        if (!quotedMsg) {
            return await socket.sendMessage(sender, { text: `❌ *Usage:* Please reply to a Photo and type .${command}` }, { quoted: msg });
        }

        const isViewOnce = quotedMsg.viewOnceMessage || quotedMsg.viewOnceMessageV2 || quotedMsg.viewOnceMessageV2Extension;
        let actualMessage = quotedMsg;
        if (isViewOnce) {
            actualMessage = quotedMsg.viewOnceMessage?.message || quotedMsg.viewOnceMessageV2?.message || quotedMsg.viewOnceMessageV2Extension?.message;
        }

        const type = getContentType(actualMessage);
        if (type !== 'imageMessage') {
            return await socket.sendMessage(sender, { text: "❌ *Error:* Please reply to a valid *Image*." }, { quoted: msg });
        }

        // ෆොටෝ එක Context එකේ සේව් කරනවා (විනාඩි 5කට)
        global.colorContexts[sender] = {
            imageMessage: actualMessage[type]
        };
        
        setTimeout(() => {
            if (global.colorContexts[sender]) delete global.colorContexts[sender];
        }, 5 * 60 * 1000);

        // 🛠️ Level 5 ම තියෙන Selection Menu එක හදනවා
        const interactiveMessage = generateWAMessageFromContent(sender, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                    interactiveMessage: {
                        body: { text: "🎨 *HD Photo Color Enhancer*\n\nඔබට අවශ්‍ය Saturation Level එක පහතින් තෝරන්න." },
                        footer: { text: "👑 SADEW-MINI 👑" },
                        nativeFlowMessage: {
                            buttons: [
                                {
                                    name: "single_select",
                                    buttonParamsJson: JSON.stringify({
                                        title: "🎨 Select Color Level",
                                        sections: [
                                            {
                                                title: "Color Enhancement Levels",
                                                rows: [
                                                    { title: "Level 1", id: ".color_dl 1", description: "Low Enhancement (Natural)" },
                                                    { title: "Level 2", id: ".color_dl 2", description: "Medium-Low Saturation" },
                                                    { title: "Level 3", id: ".color_dl 3", description: "Medium Saturation (Recommended)" },
                                                    { title: "Level 4", id: ".color_dl 4", description: "High Saturation" },
                                                    { title: "Level 5", id: ".color_dl 5", description: "Extreme Saturation" }
                                                ]
                                            }
                                        ]
                                    })
                                }
                            ]
                        }
                    }
                }
            }
        }, { quoted: msg });

        await socket.relayMessage(sender, interactiveMessage.message, { messageId: interactiveMessage.key.id });
        await socket.sendMessage(sender, { react: { text: "🎨", key: msg.key } });
    }
};
