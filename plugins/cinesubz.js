const axios = require('axios');
const { generateWAMessageFromContent, proto } = require('baileys');

module.exports = {
    name: "cinesubz-downloader",
    category: 3, // Movies / Download Menu එකට
    description: "Search and download Sinhala Subbed movies from Cinesubz",
    commands: ["cz", "cinesubz", "cz_dl"],

    handler: async ({ socket, msg, sender, command, args, reply }) => {
        const botName = "👑 SADEW-MINI 👑";
        const metaQuote = {
            key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_CZ" },
            message: { contactMessage: { displayName: botName, vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${botName}\nORG:Sadew Cinesubz\nTEL;waid=94700000000:+94 70 000 0000\nEND:VCARD` } }
        };

        // ==========================================
        // 1. MOVIE SEARCH COMMAND (.cz / .cinesubz)
        // ==========================================
        if (command === "cz" || command === "cinesubz") {
            const query = args.join(" ").trim();

            if (!query) {
                return await reply("🎬 *කරුණාකර Movie එකේ නම ලබා දෙන්න!*\n_උදා: .cz batman_");
            }

            try {
                await socket.sendMessage(sender, { react: { text: "🔍", key: msg.key } });

                const searchUrl = `https://cinesubz-api-cnw.vercel.app/api/search?q=${encodeURIComponent(query)}`;
                const res = await axios.get(searchUrl);
                const data = res.data;

                if (!data.status || !data.data || data.data.length === 0) {
                    return await reply("❌ *සමාවෙන්න, එම නමින් Movies කිසිවක් හමුවූයේ නැත.*");
                }

                const topResults = data.data.slice(0, 10);
                let listText = `*↳ ❝ [🎬 𝗦𝗮𝗱𝗲𝘄 𝗖𝗶𝗻𝗲𝘀𝘂𝗯𝘇 𝗦𝗲𝗮𝗿𝗰𝗵 🎬] ¡! ❞*\n\n🔍 *සෙව්වේ:* ${query}\n👇 *ඔබට අවශ්‍ය ෆිල්ම් එකේ අංකය Reply කරන්න*\n\n`;
                
                topResults.forEach((mv, index) => {
                    listText += `*${index + 1}.* ${mv.title} (${mv.year || 'N/A'})\n`;
                });
                listText += `\n> *Reply with 1 - ${topResults.length}*\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                const listMsg = await socket.sendMessage(sender, { text: listText }, { quoted: metaQuote });

                // REPLY LISTENER
                const listener = async ({ messages }) => {
                    const replyMsg = messages[0];
                    if (!replyMsg.message) return;

                    // වෙනත් ගෲප්/චැට් වලින් එන මැසේජ් ෆිල්ටර් කිරීම
                    if (replyMsg.key.remoteJid !== sender) return;

                    const replyContext = replyMsg.message.extendedTextMessage?.contextInfo;
                    const isReplyToBot = replyContext?.stanzaId === listMsg.key.id;

                    if (isReplyToBot) {
                        const userReply = replyMsg.message.extendedTextMessage.text.trim();
                        const selectedIndex = parseInt(userReply) - 1;

                        if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= topResults.length) {
                            return await socket.sendMessage(sender, { text: "❌ *වැරදි අංකයක්! කරුණාකර නිවැරදි අංකයක් reply කරන්න.*" }, { quoted: replyMsg });
                        }

                        const selectedMovie = topResults[selectedIndex];

                        try {
                            await socket.sendMessage(sender, { react: { text: "🎬", key: replyMsg.key } });

                            const extractUrl = `https://cinesubz-api-cnw.vercel.app/api/extract?id=${selectedMovie.id}&type=mv`;
                            const extRes = await axios.get(extractUrl);
                            const extData = extRes.data;

                            if (!extData.status || !extData.data || extData.data.length === 0) {
                                return await socket.sendMessage(sender, { text: "❌ *මෙම චිත්‍රපටියේ Direct Links ලබාගත නොහැක.*" }, { quoted: replyMsg });
                            }

                            const directVideo = extData.data.find(v => v.is_direct_mp4) || extData.data[0];
                            const baseLink = directVideo.link;
                            const shortTitle = selectedMovie.title.substring(0, 20).replace(/[^a-zA-Z0-9 ]/g, "").trim();

                            const captionText = `*↳ ❝ [🎬 𝗦𝗮𝗱𝗲𝘄 𝗖𝗶𝗻𝗲𝗠𝗮𝘅 🎬] ¡! ❞*\n\n🎬 *Title:* ${selectedMovie.title}\n📅 *Year:* ${selectedMovie.year}\n🎭 *Genres:* ${selectedMovie.genres}\n⭐ *IMDB:* ${selectedMovie.imdb}\n\n> *ඔබට අවශ්‍ය Quality එක පහලින් තෝරන්න* ⬇️`;

                            // 🔥 MODERN INTERACTIVE BUTTONS (NativeFlow)
                            const InteractiveMessage = proto.Message.InteractiveMessage;
                            const interactiveMessage = InteractiveMessage.create({
                                body: InteractiveMessage.Body.create({ text: captionText }),
                                footer: InteractiveMessage.Footer.create({ text: "👑 SADEW-MINI 👑" }),
                                header: InteractiveMessage.Header.create({
                                    title: "",
                                    hasMediaAttachment: false
                                }),
                                nativeFlowMessage: InteractiveMessage.NativeFlowMessage.create({
                                    buttons: [
                                        {
                                            name: "quick_reply",
                                            buttonParamsJson: JSON.stringify({
                                                display_text: "🎥 480p (SD)",
                                                id: `.cz_dl ${shortTitle} || 480p || ${baseLink}`
                                            })
                                        },
                                        {
                                            name: "quick_reply",
                                            buttonParamsJson: JSON.stringify({
                                                display_text: "🎥 720p (HD)",
                                                id: `.cz_dl ${shortTitle} || 720p || ${baseLink}`
                                            })
                                        }
                                    ]
                                })
                            });

                            const buttonMessage = generateWAMessageFromContent(sender, {
                                viewOnceMessage: {
                                    message: {
                                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                                        interactiveMessage
                                    }
                                }
                            }, { quoted: replyMsg });

                            await socket.relayMessage(sender, buttonMessage.message, { messageId: buttonMessage.key.id });

                            // Listener එක අයින් කරනවා
                            socket.ev.off('messages.upsert', listener);

                        } catch (e) {
                            console.error("Movie Detail Fetch Error:", e);
                            await socket.sendMessage(sender, { text: "❌ *විස්තර ලබාගැනීමේදී දෝෂයක් ඇතිවිය.*" }, { quoted: replyMsg });
                        }
                    }
                };

                socket.ev.on('messages.upsert', listener);
                setTimeout(() => { socket.ev.off('messages.upsert', listener); }, 60000); 

            } catch (e) {
                console.error("Cinesubz Search Error:", e);
                await reply("❌ *සෙවීමේදී දෝෂයක් ඇතිවිය.*");
            }
        } 
        
        // ==========================================
        // 2. MOVIE DOWNLOAD COMMAND (.cz_dl)
        // ==========================================
        else if (command === "cz_dl") {
            const inputData = args.join(" ").trim();
            if (!inputData.includes('||')) return;

            const [title, quality, originalUrl] = inputData.split(' || ');
            if (!originalUrl) return;

            try {
                await socket.sendMessage(sender, { react: { text: "⬇️", key: msg.key } });
                await socket.sendMessage(sender, { text: `⬇️ *Downloading ${title} (${quality})...*\n_මෙය විශාල file එකක් බැවින්, WhatsApp වෙත Upload වීමට ටික වේලාවක් ගත විය හැක._` }, { quoted: metaQuote });

                let finalUrl = originalUrl;
                if (quality === '480p') {
                    finalUrl = originalUrl.replace(/(720p|1080p|1080|720)/i, '480p');
                } else if (quality === '720p') {
                    finalUrl = originalUrl.replace(/(480p|1080p|1080|480)/i, '720p');
                }
                
                // File Size එක පරීක්ෂා කිරීම (2GB Limit Check)
                try {
                    const headRes = await axios.head(finalUrl);
                    if (headRes && headRes.headers['content-length']) {
                        const sizeMB = parseInt(headRes.headers['content-length']) / (1024 * 1024);
                        if (sizeMB > 1950) { 
                            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                            return await reply(`❌ *Error: File එක 2GB වලට වඩා විශාලයි! (${sizeMB.toFixed(2)} MB)*\nWhatsApp හරහා මෙය යැවිය නොහැක.`);
                        }
                    }
                } catch (headErr) {
                    console.log("Size check failed, proceeding with direct upload...");
                }

                const caption = `🎬 *${title}* [${quality}]\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                await socket.sendMessage(sender, {
                    document: { url: finalUrl },
                    mimetype: "video/mp4",
                    fileName: `${title} - ${quality}.mp4`,
                    caption: caption
                }, { quoted: metaQuote });

                await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

            } catch (e) {
                console.error("Cinesubz DL Error:", e.message);
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                await reply("❌ *Download Failed! ලින්ක් එක දෝෂ සහිතයි හෝ Expire වී ඇත.*");
            }
        }
    }
};
