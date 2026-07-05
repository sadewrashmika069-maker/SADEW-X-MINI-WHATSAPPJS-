const axios = require('axios');

module.exports = {
    name: "cinesubz-downloader",
    category: 3, 
    description: "Search and download Sinhala Subbed movies from Cinesubz",
    commands: ["cz", "cinesubz", "cz_dl"],

    handler: async ({ socket, msg, sender, command, args, reply }) => {
        const botName = "👑 SADEW-MINI 👑";
        const CZ_API = "https://cz-dnuz.vercel.app";
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

                // ✅ DanuZz API — search
                const searchUrl = `${CZ_API}/search?q=${encodeURIComponent(query)}`;
                const res = await axios.get(searchUrl, { timeout: 15000 });
                const data = res.data;

                if (!data.success || !data.result || data.result.length === 0) {
                    await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                    return await reply("❌ *සමාවෙන්න, එම නමින් Movies කිසිවක් හමුවූයේ නැත.*");
                }

                const topResults = data.result.slice(0, 10);

                // Global context eka save karanna (reply catcher ekata)
                if (!global.czContexts) global.czContexts = {};
                global.czContexts[sender] = { results: topResults };

                let listText = `*↳ ❝ [🎬 𝗦𝗮𝗱𝗲𝘄 𝗖𝗶𝗻𝗲𝘀𝘂𝗯𝘇 𝗦𝗲𝗮𝗿𝗰𝗵 🎬] ¡! ❞*\n\n🔍 *සෙව්වේ:* ${query}\n📊 *Results:* ${topResults.length}\n\n`;
                
                topResults.forEach((mv, index) => {
                    listText += `*${index + 1}.* ${mv.title}\n   ⭐ IMDB: ${mv.imdb || 'N/A'} | 📅 ${mv.date || 'N/A'} | ⏱ ${mv.runtime || 'N/A'}\n\n`;
                });
                listText += `> *📩 ඔබට අවශ්‍ය Movie එකේ අංකය Reply කරන්න (1-${topResults.length})*\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                const listMsg = await socket.sendMessage(sender, { text: listText }, { quoted: metaQuote });

                // Store search msg ID for reply matching
                global.czContexts[sender].searchMsgId = listMsg.key.id;

                // REPLY LISTENER for movie selection
                const listener = async ({ messages }) => {
                    try {
                        const replyMsg = messages[0];
                        if (!replyMsg.message) return;
                        if (replyMsg.key.remoteJid !== sender) return;

                        const replyContext = replyMsg.message.extendedTextMessage?.contextInfo;
                        if (!replyContext || replyContext.stanzaId !== listMsg.key.id) return;

                        const userReply = replyMsg.message.extendedTextMessage.text.trim();
                        const selectedIndex = parseInt(userReply) - 1;

                        if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= topResults.length) {
                            return await socket.sendMessage(sender, { text: "❌ *වැරදි අංකයක්!*" }, { quoted: replyMsg });
                        }

                        const selectedMovie = topResults[selectedIndex];
                        socket.ev.off('messages.upsert', listener);

                        await socket.sendMessage(sender, { react: { text: "⏳", key: replyMsg.key } });
                        await socket.sendMessage(sender, { text: `📥 *${selectedMovie.title}* සඳහා Download Links සකසමින්...` }, { quoted: replyMsg });

                        // ✅ /movidl — get download links
                        try {
                            const movidlUrl = `${CZ_API}/movidl?url=${encodeURIComponent(selectedMovie.url)}`;
                            const dlRes = await axios.get(movidlUrl, { timeout: 20000 });
                            const dlData = dlRes.data;

                            if (!dlData.success || !dlData.result || !dlData.result.downloads || dlData.result.downloads.length === 0) {
                                return await socket.sendMessage(sender, { text: "❌ *මෙම චිත්‍රපටය සඳහා Download Links හමු නොවිණි.*" }, { quoted: replyMsg });
                            }

                            const downloads = dlData.result.downloads;
                            const movieTitle = dlData.result.title || selectedMovie.title;
                            const shortTitle = movieTitle.substring(0, 20).replace(/[^a-zA-Z0-9 ]/g, "").trim();

                            // Build quality buttons
                            const buttons = [];
                            downloads.forEach((dl, idx) => {
                                // resolvedUrl eka use karanava — eka /download endpoint ekata pass karanava
                                const resolvedUrl = dl.resolvedUrl || '';
                                const label = dl.meta || `Quality ${idx + 1}`;
                                if (resolvedUrl) {
                                    buttons.push({
                                        buttonId: `.cz_dl ${shortTitle} || ${label} || ${resolvedUrl}`,
                                        buttonText: { displayText: `🎥 ${label}` },
                                        type: 1
                                    });
                                }
                            });

                            if (buttons.length === 0) {
                                return await socket.sendMessage(sender, { text: "❌ *Download Links Resolve කළ නොහැක.*" }, { quoted: replyMsg });
                            }

                            const captionText = `*↳ ❝ [🎬 𝗦𝗮𝗱𝗲𝘄 𝗖𝗶𝗻𝗲𝗠𝗮𝘅 🎬] ¡! ❞*\n\n🎬 *Title:* ${movieTitle}\n📅 *Year:* ${selectedMovie.date || 'N/A'}\n🎭 *Genres:* ${selectedMovie.genres || 'N/A'}\n⭐ *IMDB:* ${selectedMovie.imdb || 'N/A'}\n⏱ *Runtime:* ${selectedMovie.runtime || 'N/A'}\n\n> *ඔබට අවශ්‍ය Quality එක පහලින් තෝරන්න* ⬇️`;

                            await socket.sendMessage(sender, {
                                image: { url: selectedMovie.img },
                                caption: captionText,
                                footer: '👑 SADEW-MINI 👑',
                                buttons: buttons,
                                headerType: 4
                            }, { quoted: replyMsg });

                            await socket.sendMessage(sender, { react: { text: "🎬", key: replyMsg.key } });

                        } catch (dlErr) {
                            console.error("CZ movidl Error:", dlErr.message);
                            await socket.sendMessage(sender, { text: "❌ *Download Links ලබාගැනීමේදී දෝෂයක්.*" }, { quoted: replyMsg });
                        }

                    } catch (listenerErr) {
                        console.error("CZ listener error:", listenerErr.message);
                    }
                };

                socket.ev.on('messages.upsert', listener);
                setTimeout(() => { socket.ev.off('messages.upsert', listener); }, 120000);

                await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

            } catch (e) {
                console.error("Cinesubz Search Error:", e.message);
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                await reply("❌ *සෙවීමේදී දෝෂයක් ඇතිවිය.*");
            }
        } 
        
        // ==========================================
        // 2. MOVIE DOWNLOAD COMMAND (.cz_dl)
        // ==========================================
        else if (command === "cz_dl") {
            const inputData = args.join(" ").trim();
            if (!inputData.includes('||')) return;

            const parts = inputData.split(' || ');
            const title = parts[0] || 'Movie';
            const quality = parts[1] || 'Default';
            const resolvedUrl = parts[2] || '';
            if (!resolvedUrl) return;

            try {
                await socket.sendMessage(sender, { react: { text: "⬇️", key: msg.key } });
                await socket.sendMessage(sender, { text: `📥 *Downloading ${title} (${quality})...*\n_Token සහිත Download Link සකසමින්..._` }, { quoted: metaQuote });

                const caption = `🎬 *${title}* [${quality}]\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                // ═══════ resolvedUrl eka transform karala /download endpoint ekata pass karanna ═══════
                // resolvedUrl format: https://bot3.sonic-cloud.online/server11/1:/path/to/file.mp4
                // /download needs:    https://bot3.sonic-cloud.online/server1/path/to/file.mp4?ext=mp4
                
                let downloadPageUrl = resolvedUrl.trim();
                
                // Transform: /server11/1:/ → /server1/  (or similar patterns)
                downloadPageUrl = downloadPageUrl.replace(/\/server\d+\/\d+:\//g, '/server1/');
                
                // Add ?ext=mp4 if not present and URL ends with .mp4
                if (downloadPageUrl.endsWith('.mp4') && !downloadPageUrl.includes('?ext=')) {
                    downloadPageUrl = downloadPageUrl.replace(/\.mp4$/, '?ext=mp4');
                }

                let downloadSuccess = false;

                // ═══════ TRY 1: /download endpoint → tokenized URL ═══════
                try {
                    const dlApiUrl = `${CZ_API}/download?url=${downloadPageUrl}`;
                    console.log("CZ: Trying /download API:", dlApiUrl);
                    
                    const dlRes = await axios.get(dlApiUrl, { timeout: 20000 });
                    const dlData = dlRes.data;

                    if (dlData.success && dlData.result && dlData.result.downloadUrls) {
                        // Get the HTTP download URL (skip Telegram links)
                        const httpUrl = dlData.result.downloadUrls.find(u => 
                            u.url && !u.url.includes('t.me/') && u.url.startsWith('http')
                        );

                        if (httpUrl && httpUrl.url) {
                            console.log("CZ: Got tokenized URL:", httpUrl.url);

                            // Size check
                            if (dlData.result.size) {
                                const sizeStr = dlData.result.size;
                                console.log("CZ: File size:", sizeStr);
                            }

                            await socket.sendMessage(sender, {
                                document: { url: httpUrl.url },
                                mimetype: "video/mp4",
                                fileName: `${title} - ${quality}.mp4`,
                                caption: caption
                            }, { quoted: metaQuote });

                            downloadSuccess = true;
                            console.log("CZ: Download SUCCESS via tokenized URL!");
                        }
                    }
                } catch (dlErr) {
                    console.log("CZ: /download API failed:", dlErr.message);
                }

                // ═══════ TRY 2: Direct resolvedUrl ═══════
                if (!downloadSuccess) {
                    try {
                        console.log("CZ: Trying direct resolvedUrl:", resolvedUrl);
                        
                        // HEAD check first
                        const headRes = await axios.head(resolvedUrl, { timeout: 10000 });
                        const contentType = headRes.headers['content-type'] || '';
                        
                        if (!contentType.includes('text/html')) {
                            await socket.sendMessage(sender, {
                                document: { url: resolvedUrl },
                                mimetype: "video/mp4",
                                fileName: `${title} - ${quality}.mp4`,
                                caption: caption
                            }, { quoted: metaQuote });
                            downloadSuccess = true;
                            console.log("CZ: Download SUCCESS via direct URL!");
                        } else {
                            console.log("CZ: Direct URL returns HTML, skipping");
                        }
                    } catch (directErr) {
                        console.log("CZ: Direct URL failed:", directErr.message);
                    }
                }

                if (downloadSuccess) {
                    await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });
                } else {
                    await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                    await reply("❌ *Download Failed! සර්වර් එකේ ලින්ක් එක Expire වී ඇත. වෙනත් Quality එකක් උත්සාහ කරන්න.*");
                }

            } catch (e) {
                console.error("Cinesubz DL Error:", e.message);
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                await reply("❌ *Download Failed!*");
            }
        }
    }
};
