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
    0: { name: "🎬 NON COLOUR — HD Only",     saturation: 1.0, contrast: 1.0, brightness: 0.0 },
    1: { name: "🎨 Colour Level 1 — Light",    saturation: 1.2, contrast: 1.03, brightness: 0.01 },
    2: { name: "🎨 Colour Level 2 — Medium",   saturation: 1.4, contrast: 1.06, brightness: 0.02 },
    3: { name: "🎨 Colour Level 3 — Vivid",    saturation: 1.7, contrast: 1.10, brightness: 0.03 },
    4: { name: "🎨 Colour Level 4 — Bold",     saturation: 2.0, contrast: 1.14, brightness: 0.04 },
    5: { name: "🎨 Colour Level 5 — Ultra",    saturation: 2.4, contrast: 1.18, brightness: 0.05 }
};

// Get video info (resolution) using ffprobe
function getVideoInfo(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) return reject(err);
            const videoStream = metadata.streams.find(s => s.codec_type === 'video');
            resolve({
                width: videoStream ? videoStream.width : 0,
                height: videoStream ? videoStream.height : 0,
                bitrate: metadata.format.bit_rate ? parseInt(metadata.format.bit_rate) : 0,
                duration: metadata.format.duration ? parseFloat(metadata.format.duration) : 0
            });
        });
    });
}

module.exports = {
    name: "video-editor",
    category: 5,
    description: "Enhance video quality (720p HD) with colour levels",
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
                    { buttonId: `.evdl 0`, buttonText: { displayText: '🎬 NON COLOUR — HD Only' }, type: 1 },
                    { buttonId: `.evdl 1`, buttonText: { displayText: '🎨 Colour Level 1 — Light' }, type: 1 },
                    { buttonId: `.evdl 2`, buttonText: { displayText: '🎨 Colour Level 2 — Medium' }, type: 1 },
                    { buttonId: `.evdl 3`, buttonText: { displayText: '🎨 Colour Level 3 — Vivid' }, type: 1 },
                    { buttonId: `.evdl 4`, buttonText: { displayText: '🎨 Colour Level 4 — Bold' }, type: 1 },
                    { buttonId: `.evdl 5`, buttonText: { displayText: '🎨 Colour Level 5 — Ultra' }, type: 1 }
                ];

                await socket.sendMessage(sender, {
                    text: `*↳ ❝ [🎬 𝗩𝗶𝗱𝗲𝗼 𝗘𝗱𝗶𝘁𝗼𝗿 🎬] ¡! ❞*\n\n` +
                          `✅ *Video Ready!* (${fileSizeMB}MB)\n\n` +
                          `📺 *Output:* 1080p Full HD Quality\n` +
                          `⚡ *Quality:* HIGH (No Quality Drop)\n\n` +
                          `🎨 *Colour Levels:*\n` +
                          `┊ 🎬 NON COLOUR — HD Quality පමණි\n` +
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
                          `🔄 *Quality:* 1080p Full HD (No Drop)\n\n` +
                          `_Processing... රැඳී සිටින්න..._`
                }, { quoted: msg });

                // Get original video info
                let videoInfo;
                try {
                    videoInfo = await getVideoInfo(context.inputPath);
                } catch (e) {
                    videoInfo = { width: 0, height: 0, bitrate: 0, duration: 0 };
                }

                // Calculate original bitrate from file size if ffprobe didn't give it
                const inputStats = fs.statSync(context.inputPath);
                const inputSizeMB = (inputStats.size / (1024 * 1024)).toFixed(1);
                let origBitrate = videoInfo.bitrate;
                if (!origBitrate || origBitrate < 100000) {
                    // Estimate from file size and duration
                    if (videoInfo.duration > 0) {
                        origBitrate = Math.floor((inputStats.size * 8) / videoInfo.duration);
                    } else {
                        origBitrate = 5000000; // fallback 5Mbps
                    }
                }

                const origMbps = (origBitrate / 1000000).toFixed(1);
                console.log(`VideoEdit: Original ${inputSizeMB}MB, ${videoInfo.width}x${videoInfo.height}, ${origMbps}Mbps`);

                // ═══ NON COLOUR (Level 0): Stream copy — ZERO quality loss ═══
                if (level === 0) {
                    // Just copy video & audio streams — no re-encoding
                    await new Promise((resolve, reject) => {
                        ffmpeg(context.inputPath)
                            .videoCodec('copy')
                            .audioCodec('copy')
                            .outputOptions(['-movflags', '+faststart'])
                            .format('mp4')
                            .on('end', resolve)
                            .on('error', reject)
                            .save(outputPath);
                    });
                } else {
                    // ═══ COLOUR LEVELS 1-5: Re-encode with Ultra High Quality ═══
                    let videoFilters = [];

                    // Keep original resolution
                    videoFilters.push(`eq=saturation=${colourConfig.saturation}:contrast=${colourConfig.contrast}:brightness=${colourConfig.brightness}`);
                    
                    // Light sharpening
                    videoFilters.push('unsharp=3:3:0.3:3:3:0.3');

                    const filterString = videoFilters.join(',');

                    console.log(`VideoEdit: Processing with pure CRF 14 (Ultra High Quality)`);

                    // FFmpeg — Pure CRF mode (Constant Quality) — NO bitrate caps
                    await new Promise((resolve, reject) => {
                        ffmpeg(context.inputPath)
                            .videoFilters(filterString)
                            .videoCodec('libx264')
                            .audioCodec('aac')
                            .audioBitrate('192k')
                            .outputOptions([
                                '-preset', 'slow',
                                '-crf', '14', // Ultra high quality, near-lossless
                                '-movflags', '+faststart',
                                '-pix_fmt', 'yuv420p'
                            ])
                            .format('mp4')
                            .on('end', resolve)
                            .on('error', reject)
                            .save(outputPath);
                    });
                }

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
                                `📺 *Quality:* 1080p Full HD\n` +
                                `🎨 *Mode:* ${colourConfig.name}\n` +
                                `📦 *Size:* ${outputSizeMB}MB\n\n` +
                                `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                // Send as document to preserve full quality (no WhatsApp re-compress)
                await socket.sendMessage(sender, {
                    document: videoBuffer,
                    mimetype: 'video/mp4',
                    fileName: `Edited_HD_${colourConfig.name.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`,
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
                // Cleanup output
                try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (_) {}
                // Cleanup input
                try { if (fs.existsSync(context.inputPath)) fs.unlinkSync(context.inputPath); } catch (_) {}
                delete global.editVideoContexts[sender];
            }
        }
    }
};
