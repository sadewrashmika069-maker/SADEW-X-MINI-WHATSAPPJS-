const axios = require('axios');

module.exports = {
    name: "cinesubz-downloader",
    category: 3, 
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
                const res = await axios.get(searchUrl, { timeout: 15000 });
                const data = res.data;

                if (!data.status || !data.data || data.data.length === 0) {
                    return await reply("❌ *සමාවෙන්න, එම නමින් Movies කිසිවක් හමුවූයේ නැත.*");
                }

                const topResults = data.data.slice(0, 10);
                let listText = `*↳ ❝ [🎬 𝗦𝗮𝗱𝗲𝘄 𝗖𝗶𝗻𝗲𝘀𝘂𝗯𝘇 𝗦𝗲𝗮𝗿𝗰𝗵 🎬] ¡! ❞*\n\n🔍 *සෙව්වේ:* ${query}\n👇 *ඔබට අවශ්ය ෆිල්ම් එකේ අංකය Reply කරන්න*\n\n`;
                
                topResults.forEach((mv, index) => {
                    listText += `*${index + 1}.* ${mv.title} (${mv.year || 'N/A'})\n`;
                });
                listText += `\n> *Reply with 1 - ${topResults.length}*\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                const listMsg = await socket.sendMessage(sender, { text: listText }, { quoted: metaQuote });

                // REPLY LISTENER
                const listener = async ({ messages }) => {
                    const replyMsg = messages[0];
                    if (!replyMsg.message) return;
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
                            const extRes = await axios.get(extractUrl, { timeout: 15000 });
                            const extData = extRes.data;

                            if (!extData.status || !extData.data || extData.data.length === 0) {
                                return await socket.sendMessage(sender, { text: "❌ *මෙම චිත්රපටියේ Direct Links ලබාගත නොහැක.*" }, { quoted: replyMsg });
                            }

                            const directVideo = extData.data.find(v => v.is_direct_mp4) || extData.data[0];
                            const baseLink = directVideo.link;
                            
                            const captionText = `*↳ ❝ [🎬 𝗦𝗮𝗱𝗲𝘄 𝗖𝗶𝗻𝗲𝗠𝗮𝘅 🎬] ¡! ❞*\n\n🎬 *Title:* ${selectedMovie.title}\n📅 *Year:* ${selectedMovie.year}\n🎭 *Genres:* ${selectedMovie.genres}\n⭐ *IMDB:* ${selectedMovie.imdb}\n\n> *ඔබට අවශ්ය Quality එක පහලින් තෝරන්න* ⬇️`;
                            const shortTitle = selectedMovie.title.substring(0, 20).replace(/[^a-zA-Z0-9 ]/g, "").trim();

                            const buttons = [
                                { buttonId: `.cz_dl ${shortTitle} || 480p || ${baseLink}`, buttonText: { displayText: "🎥 480p (SD)" }, type: 1 },
                                { buttonId: `.cz_dl ${shortTitle} || 720p || ${baseLink}`, buttonText: { displayText: "🎥 720p (HD)" }, type: 1 }
                            ];

                            await socket.sendMessage(sender, {
                                image: { url: selectedMovie.img },
                                caption: captionText,
                                footer: '👑 SADEW-MINI 👑',
                                buttons: buttons,
                                headerType: 4
                            }, { quoted: replyMsg });

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

                let finalUrl = originalUrl.trim();
                let actualQuality = quality;
                const baseLink = originalUrl.trim();

                // Quality URL eka hadanna
                if (quality === '480p') {
                    finalUrl = baseLink.replace(/(720p|1080p|1080|720)/gi, '480p');
                } else if (quality === '720p') {
                    finalUrl = baseLink.replace(/(480p|1080p|1080|480)/gi, '720p');
                }

                // ═══════ HEAD REQUEST — URL eka valid da check karanna ═══════
                let validUrl = finalUrl;

                try {
                    const headRes = await axios.head(validUrl, { timeout: 10000 });
                    const contentType = headRes.headers['content-type'] || '';

                    // HTML page ekak enava nam — eka video ekak nemei!
                    if (contentType.includes('text/html')) {
                        console.log(`CZ: Quality URL returns HTML, falling back to base link`);
                        if (validUrl !== baseLink) {
                            validUrl = baseLink;
                            actualQuality = "Default";
                            await socket.sendMessage(sender, { text: `⚠️ *${quality} සර්වර් එකේ නැත.*\n_පවතින Quality එක බාගත වෙමින්..._` }, { quoted: msg });
                        }
                    }

                    // Size check
                    if (headRes.headers['content-length']) {
                        const sizeMB = parseInt(headRes.headers['content-length']) / (1024 * 1024);
                        if (sizeMB > 1950) {
                            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                            return await reply(`❌ *File එක 2GB වලට වඩා විශාලයි! (${sizeMB.toFixed(2)} MB)*`);
                        }
                    }
                } catch (headErr) {
                    // 404 Error — quality URL eka server eke na
                    if (headErr.response && headErr.response.status === 404) {
                        console.log(`CZ: ${quality} URL returns 404, falling back to base link`);
                        if (validUrl !== baseLink) {
                            validUrl = baseLink;
                            actualQuality = "Default";
                            await socket.sendMessage(sender, { text: `⚠️ *${quality} සංස්කරණය සර්වර් එකේ නැත (404).*\n_පවතින එකම සංස්කරණය බාගත වෙමින්..._` }, { quoted: msg });
                        } else {
                            // Base link ekath 404 — proxy try karanna
                            console.log(`CZ: Base link also 404, trying proxy API...`);
                        }
                    } else {
                        console.log("CZ: HEAD check failed:", headErr.message);
                    }
                }

                // ═══════ Fallback eke base link ekath 404 nam, check karanna ═══════
                if (validUrl === baseLink) {
                    try {
                        const baseHead = await axios.head(baseLink, { timeout: 10000 });
                        const baseContentType = baseHead.headers['content-type'] || '';
                        if (baseContentType.includes('text/html')) {
                            // Base link ekath HTML denava — proxy try karanna
                            validUrl = null;
                        }
                    } catch (baseErr) {
                        if (baseErr.response && baseErr.response.status === 404) {
                            validUrl = null;
                        }
                    }
                }

                await socket.sendMessage(sender, { text: `📥 *Downloading ${title} (${actualQuality})...*\n_Upload වීමට ටික වේලාවක් ගත විය හැක._` }, { quoted: metaQuote });

                const caption = `🎬 *${title}* [${actualQuality}]\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;
                let downloadSuccess = false;

                // ═══════ TRY 1: Direct URL (if valid) ═══════
                if (validUrl) {
                    try {
                        console.log("CZ Download: Trying direct URL:", validUrl);
                        await socket.sendMessage(sender, {
                            document: { url: validUrl },
                            mimetype: "video/mp4",
                            fileName: `${title} - ${actualQuality}.mp4`,
                            caption: caption
                        }, { quoted: metaQuote });
                        downloadSuccess = true;
                        console.log("CZ Download: Direct URL success!");
                    } catch (directErr) {
                        console.log("CZ Download: Direct URL failed:", directErr.message);
                    }
                }

                // ═══════ TRY 2: Proxy API ═══════
                if (!downloadSuccess) {
                    try {
                        // Try quality URL first via proxy
                        const proxyUrl = `https://cz-dnuz.vercel.app/download?url=${finalUrl}`;
                        console.log("CZ Download: Trying proxy API:", proxyUrl);
                        await socket.sendMessage(sender, {
                            document: { url: proxyUrl },
                            mimetype: "video/mp4",
                            fileName: `${title} - ${actualQuality}.mp4`,
                            caption: caption
                        }, { quoted: metaQuote });
                        downloadSuccess = true;
                        console.log("CZ Download: Proxy API success!");
                    } catch (proxyErr) {
                        console.log("CZ Download: Proxy failed:", proxyErr.message);
                    }
                }

                // ═══════ TRY 3: Proxy API with base link ═══════
                if (!downloadSuccess && finalUrl !== baseLink) {
                    try {
                        const proxyBaseUrl = `https://cz-dnuz.vercel.app/download?url=${baseLink}`;
                        console.log("CZ Download: Trying proxy with base link:", proxyBaseUrl);
                        await socket.sendMessage(sender, {
                            document: { url: proxyBaseUrl },
                            mimetype: "video/mp4",
                            fileName: `${title} - Default.mp4`,
                            caption: caption
                        }, { quoted: metaQuote });
                        downloadSuccess = true;
                        console.log("CZ Download: Proxy base link success!");
                    } catch (proxyBaseErr) {
                        console.log("CZ Download: Proxy base link failed:", proxyBaseErr.message);
                    }
                }

                if (downloadSuccess) {
                    await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });
                } else {
                    await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                    await reply("❌ *Download Failed! ලින්ක් එක සර්වර් එකෙන් ඉවත් කර ඇත හෝ Expire වී ඇත.*");
                }

            } catch (e) {
                console.error("Cinesubz DL Error:", e.message);
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                await reply("❌ *Download Failed! ලින්ක් එක දෝෂ සහිතයි හෝ Expire වී ඇත.*");
            }
        }
    }
};
