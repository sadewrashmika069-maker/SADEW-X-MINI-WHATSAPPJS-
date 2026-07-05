const axios = require('axios');

module.exports = {
    name: "cinesubz-downloader",
    category: 3, 
    description: "Search and download Sinhala Subbed movies from Cinesubz",
    commands: ["cz", "cinesubz", "cz_dl"],

    handler: async ({ socket, msg, sender, command, args, reply }) => {
        const botName = "👑 SADEW-MINI 👑";
        const CZ_API = "https://cz-dnuz.vercel.app";
        const OLD_API = "https://cinesubz-api-cnw.vercel.app/api";
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

                const searchUrl = `${CZ_API}/search?q=${encodeURIComponent(query)}`;
                const res = await axios.get(searchUrl, { timeout: 15000 });
                const data = res.data;

                if (!data.success || !data.result || data.result.length === 0) {
                    await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                    return await reply("❌ *සමාවෙන්න, එම නමින් Movies කිසිවක් හමුවූයේ නැත.*");
                }

                const topResults = data.result.slice(0, 10);
                if (!global.czContexts) global.czContexts = {};
                global.czContexts[sender] = { results: topResults };

                let listText = `*↳ ❝ [🎬 𝗦𝗮𝗱𝗲𝘄 𝗖𝗶𝗻𝗲𝘀𝘂𝗯𝘇 𝗦𝗲𝗮𝗿𝗰𝗵 🎬] ¡! ❞*\n\n🔍 *සෙව්වේ:* ${query}\n📊 *Results:* ${topResults.length}\n\n`;
                topResults.forEach((mv, index) => {
                    listText += `*${index + 1}.* ${mv.title}\n   ⭐ IMDB: ${mv.imdb || 'N/A'} | 📅 ${mv.date || 'N/A'} | ⏱ ${mv.runtime || 'N/A'}\n\n`;
                });
                listText += `> *📩 ඔබට අවශ්‍ය Movie එකේ අංකය Reply කරන්න (1-${topResults.length})*\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                const listMsg = await socket.sendMessage(sender, { text: listText }, { quoted: metaQuote });
                global.czContexts[sender].searchMsgId = listMsg.key.id;

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

                        let downloads = [];
                        let isOldApi = false;

                        // ═══════ TRY 1: New API (/movidl) ═══════
                        try {
                            const movidlUrl = `${CZ_API}/movidl?url=${encodeURIComponent(selectedMovie.url)}`;
                            const dlRes = await axios.get(movidlUrl, { timeout: 20000 });
                            downloads = dlRes.data.result?.downloads || [];
                        } catch (dlErr) {
                            console.log("CZ movidl Error:", dlErr.message);
                            // ═══════ TRY 2: Old API Fallback (for older movies) ═══════
                            if (dlErr.response && (dlErr.response.status >= 500 || dlErr.response.status === 404)) {
                                console.log("CZ: Falling back to Old API for ID:", selectedMovie.id);
                                try {
                                    const oldApiUrl = `${OLD_API}/extract?id=${selectedMovie.id}&type=mv`;
                                    const oldRes = await axios.get(oldApiUrl, { timeout: 15000 });
                                    
                                    if (oldRes.data && oldRes.data.data) {
                                        const directVideo = oldRes.data.data.find(v => v.is_direct_mp4) || oldRes.data.data[0];
                                        const playerUrl = directVideo.link;
                                        
                                        if (playerUrl && playerUrl.includes('player')) {
                                            isOldApi = true;
                                            downloads = [
                                                { meta: "480p", resolvedUrl: playerUrl, isPlayer: true },
                                                { meta: "720p", resolvedUrl: playerUrl, isPlayer: true }
                                            ];
                                        }
                                    }
                                } catch (oldErr) {
                                    console.log("CZ: Old API fallback failed", oldErr.message);
                                }
                            }
                        }

                        if (downloads.length === 0) {
                            return await socket.sendMessage(sender, { text: "❌ *මෙම චිත්‍රපටය සඳහා Download Links හමු නොවිණි.*" }, { quoted: replyMsg });
                        }

                        const movieTitle = selectedMovie.title;
                        const shortTitle = movieTitle.substring(0, 20).replace(/[^a-zA-Z0-9 ]/g, "").trim();

                        const buttons = [];
                        downloads.forEach((dl, idx) => {
                            const resolvedUrl = dl.resolvedUrl || '';
                            const label = dl.meta || `Quality ${idx + 1}`;
                            const isPlayerFlag = dl.isPlayer ? "true" : "false"; // flag for old api
                            
                            if (resolvedUrl) {
                                buttons.push({
                                    buttonId: `.cz_dl ${shortTitle} || ${label} || ${resolvedUrl} || ${isPlayerFlag}`,
                                    buttonText: { displayText: `🎥 ${label}` },
                                    type: 1
                                });
                            }
                        });

                        const captionText = `*↳ ❝ [🎬 𝗦𝗮𝗱𝗲𝘄 𝗖𝗶𝗻𝗲𝗠𝗮𝘅 🎬] ¡! ❞*\n\n🎬 *Title:* ${movieTitle}\n📅 *Year:* ${selectedMovie.date || 'N/A'}\n🎭 *Genres:* ${selectedMovie.genres || 'N/A'}\n⭐ *IMDB:* ${selectedMovie.imdb || 'N/A'}\n⏱ *Runtime:* ${selectedMovie.runtime || 'N/A'}\n\n> *ඔබට අවශ්‍ය Quality එක පහලින් තෝරන්න* ⬇️`;

                        await socket.sendMessage(sender, {
                            image: { url: selectedMovie.img },
                            caption: captionText,
                            footer: '👑 SADEW-MINI 👑',
                            buttons: buttons,
                            headerType: 4
                        }, { quoted: replyMsg });

                        await socket.sendMessage(sender, { react: { text: "🎬", key: replyMsg.key } });

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
            const isPlayerFlag = parts[3] === 'true'; // Check if it's from Old API fallback
            if (!resolvedUrl) return;

            try {
                await socket.sendMessage(sender, { react: { text: "⬇️", key: msg.key } });
                await socket.sendMessage(sender, { text: `📥 *Downloading ${title} (${quality})...*\n_Link සකසමින්..._` }, { quoted: metaQuote });

                const caption = `🎬 *${title}* [${quality}]\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;
                let downloadSuccess = false;

                // ═══════ OLD API FALLBACK HANDLER (Extract direct links from HTML player) ═══════
                if (isPlayerFlag) {
                    try {
                        console.log("CZ: Running Old API fallback extraction on HTML player:", resolvedUrl);
                        const htmlRes = await axios.get(resolvedUrl, { timeout: 15000 });
                        const htmlContent = htmlRes.data;
                        
                        // Regex to extract ALL_QUALITIES json array from the HTML script
                        const match = htmlContent.match(/const ALL_QUALITIES = (\[.*?\]);/);
                        if (match) {
                            const qualities = JSON.parse(match[1]);
                            const reqQuality = quality.toLowerCase().includes('480p') ? '480p' : '720p';
                            
                            const matchedQuality = qualities.find(q => q.html.toLowerCase().includes(reqQuality) || q.url.toLowerCase().includes(reqQuality));
                            
                            if (matchedQuality && matchedQuality.url) {
                                console.log(`CZ: Extracted ${reqQuality} URL from HTML:`, matchedQuality.url);
                                await socket.sendMessage(sender, {
                                    document: { url: matchedQuality.url },
                                    mimetype: "video/mp4",
                                    fileName: `${title} - ${quality}.mp4`,
                                    caption: caption
                                }, { quoted: metaQuote });
                                downloadSuccess = true;
                            }
                        }
                    } catch (oldDlErr) {
                        console.log("CZ: Old API extraction failed:", oldDlErr.message);
                    }
                } 
                
                // ═══════ NEW API HANDLER (DanuZz /download API) ═══════
                if (!downloadSuccess && !isPlayerFlag) {
                    let downloadPageUrlOriginal = resolvedUrl.trim();
                    downloadPageUrlOriginal = downloadPageUrlOriginal.replace(/\/(server\d+)\/\d+:\//g, '/$1/');
                    
                    if (downloadPageUrlOriginal.endsWith('.mp4') && !downloadPageUrlOriginal.includes('?ext=')) {
                        downloadPageUrlOriginal = downloadPageUrlOriginal.replace(/\.mp4$/, '?ext=mp4');
                    }
                    
                    let downloadPageUrlFallback = downloadPageUrlOriginal.replace(/\/server\d+\//, '/server1/');

                    const tryDownloadApi = async (urlToTry) => {
                        try {
                            const dlApiUrl = `${CZ_API}/download?url=${urlToTry}`;
                            console.log("CZ: Trying /download API:", dlApiUrl);
                            
                            const dlRes = await axios.get(dlApiUrl, { timeout: 20000 });
                            const dlData = dlRes.data;

                            if (dlData.success && dlData.result && dlData.result.downloadUrls) {
                                const httpUrl = dlData.result.downloadUrls.find(u => 
                                    u.url && !u.url.includes('t.me/') && u.url.startsWith('http')
                                );

                                if (httpUrl && httpUrl.url) {
                                    await socket.sendMessage(sender, {
                                        document: { url: httpUrl.url },
                                        mimetype: "video/mp4",
                                        fileName: `${title} - ${quality}.mp4`,
                                        caption: caption
                                    }, { quoted: metaQuote });
                                    return true;
                                }
                            }
                            return false;
                        } catch (e) {
                            return false;
                        }
                    };

                    // Try original server, then fallback to server1
                    downloadSuccess = await tryDownloadApi(downloadPageUrlOriginal);
                    if (!downloadSuccess && downloadPageUrlFallback !== downloadPageUrlOriginal) {
                        downloadSuccess = await tryDownloadApi(downloadPageUrlFallback);
                    }
                }

                if (downloadSuccess) {
                    await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });
                } else {
                    await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                    await reply("❌ *Download Failed! සර්වර් එකේ ලින්ක් එක Expire වී ඇත.*");
                }

            } catch (e) {
                console.error("Cinesubz DL Error:", e.message);
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                await reply("❌ *Download Failed!*");
            }
        }
    }
};
