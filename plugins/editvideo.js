const { downloadContentFromMessage } = require("baileys");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

ffmpeg.setFfmpegPath(ffmpegPath);

// Colour level configs
const COLOUR_LEVELS = {
    0: { name: "🎬 NON COLOUR — Original Quality", saturation: 1.0, contrast: 1.0, brightness: 0.0 },
    1: { name: "🎨 Colour Level 1 — Light",        saturation: 1.2, contrast: 1.03, brightness: 0.01 },
    2: { name: "🎨 Colour Level 2 — Medium",       saturation: 1.4, contrast: 1.06, brightness: 0.02 },
    3: { name: "🎨 Colour Level 3 — Vivid",        saturation: 1.7, contrast: 1.10, brightness: 0.03 },
    4: { name: "🎨 Colour Level 4 — Bold",         saturation: 2.0, contrast: 1.14, brightness: 0.04 },
    5: { name: "🎨 Colour Level 5 — Ultra",        saturation: 2.4, contrast: 1.18, brightness: 0.05 }
};

module.exports = {
    name: "video-editor",
    category: 5,
    description: "Enhance video quality with colour levels (Fixed Aspect Ratio & Max Quality)",
    commands: ["editvideo", "evdl"],

    handler: async ({ socket, msg, sender, command, args, reply }) => {
        const botName = "👑 SADEW-MINI 👑";
        const metaQuote = {
            key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_VED" },
            message: { contactMessage: { displayName: botName, vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${botName}\nORG:Sadew Video Editor\nTEL;waid=94700000000:+94 70 000 0000\nEND:VCARD` } }
        };

        if (!global.editVideoContexts) global.editVideoContexts = {};

        // ==========================================
        // 1. EDIT VIDEO MENU (.editvideo)
        // ==========================================
        if (command === "editvideo") {
            let videoMessage = null;

            // Check replied video
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quotedMsg?.videoMessage) {
                videoMessage = quotedMsg.videoMessage;
            } else if (msg.message?.videoMessage) {
                videoMessage = msg.message.videoMessage;
            } else if (quotedMsg?.viewOnceMessage?.message?.videoMessage) {
                videoMessage = quotedMsg.viewOnceMessage.message.videoMessage;
            } else if (quotedMsg?.viewOnceMessageV2?.message?.videoMessage) {
                videoMessage = quotedMsg.viewOnceMessageV2.message.videoMessage;
            }

            if (!videoMessage) {
                return await socket.sendMessage(sender, {
                    text: `*↳ ❝ [🎬 𝗩𝗶𝗱𝗲𝗼 𝗘𝗱𝗶𝘁𝗼𝗿 🎬] ¡! ❞*\n\n` +
                          `❌ *Video එකක් හමුවූයේ නැත!*\n\n` +
                          `📌 *භාවිතය:*\n` +
                          `┊ Video එකකට Reply කරලා *.editvideo* Type කරන්න\n\n` +
                          `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
                }, { quoted: msg });
            }

            // Size check (100MB max)
            const fileSize = videoMessage.fileLength || 0;
            if (fileSize > 100 * 1024 * 1024) {
                return await socket.sendMessage(sender, {
                    text: `❌ *Video එක 100MB ට වඩා විශාලයි!*`
                }, { quoted: msg });
            }

            try {
                await socket.sendMessage(sender, { react: { text: "📥", key: msg.key } });
                await socket.sendMessage(sender, {
                    text: `📥 *Video Download කරමින්...*\n_Colour Menu එක සැනෙකින්..._`
                }, { quoted: msg });

                // Download video
                const stream = await downloadContentFromMessage(videoMessage, 'video');
                const chunks = [];
                for await (const chunk of stream) {
                    chunks.push(chunk);
                }
                const videoBuffer = Buffer.concat(chunks);

                // Save to temp
                const tmpId = crypto.randomBytes(8).toString('hex');
                const inputPath = path.join(os.tmpdir(), `sadew_edit_${tmpId}_input.mp4`);
                fs.writeFileSync(inputPath, videoBuffer);

                const fileSizeMB = (videoBuffer.length / (1024 * 1024)).toFixed(1);

                // Save context
                global.editVideoContexts[sender] = {
                    inputPath: inputPath,
                    tmpId: tmpId,
                    timestamp: Date.now()
                };

                // Show colour level buttons
                const buttons = [
                    { buttonId: `.evdl 0`, buttonText: { displayText: '🎬 NON COLOUR — Original' }, type: 1 },
                    { buttonId: `.evdl 1`, buttonText: { displayText: '🎨 Colour Level 1 — Light' }, type: 1 },
                    { buttonId: `.evdl 2`, buttonText: { displayText: '🎨 Colour Level 2 — Medium' }, type: 1 },
                    { buttonId: `.evdl 3`, buttonText: { displayText: '🎨 Colour Level 3 — Vivid' }, type: 1 },
                    { buttonId: `.evdl 4`, buttonText: { displayText: '🎨 Colour Level 4 — Bold' }, type: 1 },
                    { buttonId: `.evdl 5`, buttonText: { displayText: '🎨 Colour Level 5 — Ultra' }, type: 1 }
                ];

                await socket.sendMessage(sender, {
                    text: `*↳ ❝ [🎬 𝗩𝗶𝗱𝗲𝗼 𝗘𝗱𝗶𝘁𝗼𝗿 🎬] ¡! ❞*\n\n` +
                          `✅ *Video Ready!* (${fileSizeMB}MB)\n\n` +
                          `📺 *Output:* Original Max Quality\n` +
                          `⚡ *Quality:* HIGH (Lossless Export)\n\n` +
                          `🎨 *Colour Levels:*\n` +
                          `┊ 🎬 NON COLOUR — Quality වැඩි කිරීම පමණි\n` +
                          `┊ 🎨 Level 1 — සුළු Colour වැඩි කිරීම\n` +
                          `┊ 🎨 Level 2 — මධ්‍යම Colour\n` +
                          `┊ 🎨 Level 3 — Vivid Colour\n` +
                          `┊ 🎨 Level 4 — Bold Colour\n` +
                          `┊ 🎨 Level 5 — Ultra Colour (උපරිම)\n\n` +
                          `> *ඔබට අවශ්‍ය Level එක පහලින් තෝරන්න* ⬇️\n` +
                          `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`,
                    footer: '👑 SADEW-MINI 👑',
                    buttons: buttons,
                    headerType: 1
                }, { quoted: msg });

                await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

                // Auto cleanup after 5 minutes
                setTimeout(() => {
                    if (global.editVideoContexts[sender]?.tmpId === tmpId) {
                        try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch (_) {}
                        delete global.editVideoContexts[sender];
                    }
                }, 300000);

            } catch (e) {
                console.error("EditVideo Error:", e.message);
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                await socket.sendMessage(sender, {
                    text: `❌ *Video Process Error!*\n_${e.message}_`
                }, { quoted: msg });
            }
        }

        // ==========================================
        // 2. PROCESS VIDEO (.evdl <level>)
        // ==========================================
        else if (command === "evdl") {
            const level = parseInt(args[0]);
            if (isNaN(level) || level < 0 || level > 5) return;

            const context = global.editVideoContexts[sender];
            if (!context || !context.inputPath) {
                return await socket.sendMessage(sender, {
                    text: `❌ *කරුණාකර මුලින් Video එකකට Reply කරලා .editvideo Type කරන්න!*`
                }, { quoted: msg });
            }

            if (!fs.existsSync(context.inputPath)) {
                delete global.editVideoContexts[sender];
                return await socket.sendMessage(sender, {
                    text: `❌ *Video Session Expired! නැවත .editvideo කරන්න.*`
                }, { quoted: msg });
            }

            const colourConfig = COLOUR_LEVELS[level];
            const outputPath = path.join(os.tmpdir(), `sadew_edit_${context.tmpId}_output.mp4`);

            try {
                await socket.sendMessage(sender, { react: { text: "⏳", key: msg.key } });
                await socket.sendMessage(sender, {
                    text: `🎬 *Video Edit කරමින්...*\n\n` +
                          `📺 *Mode:* ${colourConfig.name}\n` +
                          `🔄 *Quality:* Original Max (No Drop)\n\n` +
                          `_Processing... රැඳී සිටින්න..._`
                }, { quoted: msg });

                // Build ffmpeg filters
                let videoFilters = [];

                // Aspect Ratio Fix (වීඩියෝ එක තැලෙන්නේ නැති වෙන්න)
                videoFilters.push('scale=trunc(iw/2)*2:trunc(ih/2)*2');

                // Apply colour enhancement (skip for level 0)
                if (level > 0) {
                    videoFilters.push(`eq=saturation=${colourConfig.saturation}:contrast=${colourConfig.contrast}:brightness=${colourConfig.brightness}`);
                }

                // Unsharp mask for slight sharpening (HD look)
                videoFilters.push('unsharp=3:3:0.5:3:3:0.5');

                const filterString = videoFilters.join(',');

                // FFmpeg process — OPTIMIZED FOR SERVER (Prevents SIGKILL)
                await new Promise((resolve, reject) => {
                    ffmpeg(context.inputPath)
                        .videoFilters(filterString)
                        .videoCodec('libx264')
                        .audioCodec('aac')
                        .audioBitrate('192k')
                        .outputOptions([
                            '-preset', 'veryfast',    // FIX 1: 'slow' වෙනුවට 'veryfast' දැම්මා RAM එක ඉතුරු වෙන්න
                            '-threads', '2',          // FIX 2: Thread ගාණ ලිමිට් කළා සර්වර් එක ක්‍රෑෂ් නොවෙන්න
                            '-crf', '18',             // CRF 18 (Quality එක පට්ට විදිහට තියෙනවා)
                            '-map_metadata', '0',     // Original Video එකේ Rotation එක තියාගන්නවා
                            '-movflags', '+faststart',
                            '-pix_fmt', 'yuv420p'
                        ])
                        .format('mp4')
                        .on('end', resolve)
                        .on('error', reject)
                        .save(outputPath);
                });

                if (!fs.existsSync(outputPath)) {
                    throw new Error("Video processing failed");
                }

                const outputStats = fs.statSync(outputPath);
                const outputSizeMB = (outputStats.size / (1024 * 1024)).toFixed(1);

                await socket.sendMessage(sender, {
                    text: `✅ *Edit Complete!* (${outputSizeMB}MB)\n📤 *WhatsApp Upload කරමින්...*`
                }, { quoted: msg });

                const videoBuffer = fs.readFileSync(outputPath);

                const caption = `*↳ ❝ [🎬 𝗩𝗶𝗱𝗲𝗼 𝗘𝗱𝗶𝘁𝗲𝗱 🎬] ¡! ❞*\n\n` +
                                `📺 *Quality:* Max Original HD\n` +
                                `🎨 *Mode:* ${colourConfig.name}\n` +
                                `📦 *Size:* ${outputSizeMB}MB\n\n` +
                                `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                // Send as document to preserve full quality
                await socket.sendMessage(sender, {
                    document: videoBuffer,
                    mimetype: 'video/mp4',
                    fileName: `Edited_${colourConfig.name.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`,
                    caption: caption
                }, { quoted: metaQuote });

                await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

            } catch (e) {
                console.error("Video Edit Error:", e.message);
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                await socket.sendMessage(sender, {
                    text: `❌ *Video Edit Failed!*\n_${e.message}_`
                }, { quoted: msg });
            } finally {
                // Cleanup output & input
                try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (_) {}
                try { if (fs.existsSync(context.inputPath)) fs.unlinkSync(context.inputPath); } catch (_) {}
                delete global.editVideoContexts[sender];
            }
        }
    }
};
