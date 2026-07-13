const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

module.exports = {
    name: "pastpaper-downloader",
    category: 7,
    description: "Search and download past papers & notes as PDF",
    commands: ["paper", "pastpaper", "pp"],

    handler: async ({ socket, msg, sender, command, args, reply }) => {
        const botName = "👑 SADEW-MINI 👑";
        const API_BASE = "https://api.zanta-mini.store/api/paper";
        const API_KEY = "zan_FIAO7Ayh_eo1vllkep6";
        const metaQuote = {
            key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_PP" },
            message: { contactMessage: { displayName: botName, vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${botName}\nORG:Sadew Papers\nTEL;waid=94700000000:+94 70 000 0000\nEND:VCARD` } }
        };

        if (!global.paperContexts) global.paperContexts = {};

        // ==========================================
        // PAPER SEARCH (.paper <query>)
        // ==========================================
        const query = args.join(" ").trim();

        if (!query) {
            return await socket.sendMessage(sender, {
                text: `*↳ ❝ [📄 𝗣𝗮𝘀𝘁 𝗣𝗮𝗽𝗲𝗿 𝗦𝗲𝗮𝗿𝗰𝗵 📄] ¡! ❞*\n\n` +
                      `❌ *කරුණාකර විෂය නම ලබා දෙන්න!*\n\n` +
                      `📌 *භාවිතය:*\n` +
                      `┊ .paper maths\n` +
                      `┊ .paper science grade 10\n` +
                      `┊ .paper A/L physics\n` +
                      `┊ .paper O/L sinhala\n\n` +
                      `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
            }, { quoted: metaQuote });
        }

        try {
            await socket.sendMessage(sender, { react: { text: "🔍", key: msg.key } });

            const searchUrl = `${API_BASE}/search?apiKey=${API_KEY}&url=${encodeURIComponent(query)}`;
            const res = await axios.get(searchUrl, { timeout: 15000 });
            const data = res.data;

            if (!data.success || !data.result || data.result.length === 0) {
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                return await socket.sendMessage(sender, {
                    text: `❌ *"${query}" සඳහා Papers හමුවූයේ නැත.*`
                }, { quoted: msg });
            }

            const topResults = data.result.slice(0, 10);

            // Save context
            global.paperContexts[sender] = {
                results: topResults
            };

            let listText = `*↳ ❝ [📄 𝗣𝗮𝘀𝘁 𝗣𝗮𝗽𝗲𝗿 𝗦𝗲𝗮𝗿𝗰𝗵 📄] ¡! ❞*\n\n`;
            listText += `🔍 *සෙව්වේ:* ${query}\n`;
            listText += `📊 *Results:* ${topResults.length}\n\n`;

            topResults.forEach((item, i) => {
                const shortDesc = item.description ? (item.description.length > 60 ? item.description.substring(0, 57) + '...' : item.description) : '';
                listText += `*${i + 1}.* 📄 ${item.title}\n`;
                if (shortDesc) listText += `   _${shortDesc}_\n`;
                listText += `\n`;
            });

            listText += `> *📩 ඔබට අවශ්‍ය Paper එකේ අංකය Reply කරන්න (1-${topResults.length})*\n`;
            listText += `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

            // Send with first thumbnail
            const firstThumb = topResults[0]?.thumbnail;
            let listMsg;

            if (firstThumb) {
                listMsg = await socket.sendMessage(sender, {
                    image: { url: firstThumb },
                    caption: listText
                }, { quoted: metaQuote });
            } else {
                listMsg = await socket.sendMessage(sender, { text: listText }, { quoted: metaQuote });
            }

            global.paperContexts[sender].msgId = listMsg.key.id;

            // ══════ REPLY LISTENER ══════
            const listener = async ({ messages }) => {
                try {
                    const replyMsg = messages[0];
                    if (!replyMsg.message) return;
                    if (replyMsg.key.remoteJid !== sender) return;

                    const ctx = replyMsg.message.extendedTextMessage?.contextInfo;
                    if (!ctx) return;

                    const context = global.paperContexts[sender];
                    if (!context || ctx.stanzaId !== context.msgId) return;

                    const replyText = (replyMsg.message.extendedTextMessage?.text || '').trim();
                    if (!/^\d+$/.test(replyText)) return;

                    const num = parseInt(replyText);
                    if (num < 1 || num > context.results.length) {
                        return await socket.sendMessage(sender, { text: "❌ *වැරදි අංකයක්!*" }, { quoted: replyMsg });
                    }

                    const selected = context.results[num - 1];
                    socket.ev.off('messages.upsert', listener);

                    await socket.sendMessage(sender, { react: { text: "⏳", key: replyMsg.key } });
                    await socket.sendMessage(sender, {
                        text: `📥 *${selected.title}*\n_PDF Download කරමින්..._`
                    }, { quoted: replyMsg });

                    // ═══════ GET DOWNLOAD LINK ═══════
                    try {
                        const dlUrl = `${API_BASE}/dl?apiKey=${API_KEY}&url=${encodeURIComponent(selected.url)}`;
                        const dlRes = await axios.get(dlUrl, { timeout: 20000 });
                        const dlData = dlRes.data;

                        if (!dlData.success || !dlData.download_url) {
                            await socket.sendMessage(sender, { react: { text: "❌", key: replyMsg.key } });
                            return await socket.sendMessage(sender, {
                                text: `❌ *මෙම Paper එකට Download Link හමු නොවිණි.*`
                            }, { quoted: replyMsg });
                        }

                        const pdfUrl = dlData.download_url;
                        const pdfTitle = dlData.title || selected.title;

                        // Download PDF to buffer
                        const tmpId = crypto.randomBytes(8).toString('hex');
                        const tmpPath = path.join(os.tmpdir(), `sadew_paper_${tmpId}.pdf`);

                        const pdfResponse = await axios({
                            method: 'GET',
                            url: pdfUrl,
                            responseType: 'stream',
                            timeout: 60000,
                            maxRedirects: 5,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                            }
                        });

                        const writer = fs.createWriteStream(tmpPath);
                        pdfResponse.data.pipe(writer);

                        await new Promise((resolve, reject) => {
                            writer.on('finish', resolve);
                            writer.on('error', reject);
                        });

                        const stats = fs.statSync(tmpPath);
                        if (stats.size < 500) {
                            throw new Error("PDF file too small/empty");
                        }

                        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(1);
                        const pdfBuffer = fs.readFileSync(tmpPath);

                        // Clean filename
                        const cleanName = pdfTitle.replace(/[^a-zA-Z0-9\s\u0D80-\u0DFF]/g, '').trim().substring(0, 50);

                        const caption = `*↳ ❝ [📄 𝗣𝗮𝘀𝘁 𝗣𝗮𝗽𝗲𝗿 𝗗𝗟 📄] ¡! ❞*\n\n` +
                                        `📄 *${pdfTitle}*\n` +
                                        `📦 *Size:* ${fileSizeMB}MB\n\n` +
                                        `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                        // Send thumbnail with info
                        if (selected.thumbnail) {
                            await socket.sendMessage(sender, {
                                image: { url: selected.thumbnail },
                                caption: caption
                            }, { quoted: metaQuote });
                        }

                        // Send PDF document
                        await socket.sendMessage(sender, {
                            document: pdfBuffer,
                            mimetype: 'application/pdf',
                            fileName: `${cleanName}.pdf`,
                            caption: `📄 *${pdfTitle}*\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
                        }, { quoted: metaQuote });

                        await socket.sendMessage(sender, { react: { text: "✅", key: replyMsg.key } });

                        // Cleanup
                        try { fs.unlinkSync(tmpPath); } catch (_) {}

                    } catch (dlErr) {
                        console.error("Paper DL Error:", dlErr.message);
                        await socket.sendMessage(sender, { react: { text: "❌", key: replyMsg.key } });
                        await socket.sendMessage(sender, {
                            text: `❌ *PDF Download Error!*\n_${dlErr.message}_`
                        }, { quoted: replyMsg });
                    }

                } catch (listenerErr) {
                    console.log("Paper listener error:", listenerErr.message);
                }
            };

            socket.ev.on('messages.upsert', listener);
            setTimeout(() => socket.ev.off('messages.upsert', listener), 120000);
            await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

        } catch (e) {
            console.error("Paper Search Error:", e.message);
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
            await socket.sendMessage(sender, {
                text: `❌ *Search Error!*\n_${e.message}_`
            }, { quoted: msg });
        }
    }
};
