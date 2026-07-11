const axios = require('axios');

module.exports = {
    name: "anime-downloader",
    category: 7,
    description: "Search and download anime episodes with quality selection",
    commands: ["anime", "anime_dl"],

    handler: async ({ socket, msg, sender, command, args, reply }) => {
        const botName = "👑 SADEW-MINI 👑";
        const API_BASE = "https://api.zanta-mini.store/api/hentai";
        const API_KEY = "zan_FIAO7Ayh_eo1vllkep6";
        const metaQuote = {
            key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_ANI" },
            message: { contactMessage: { displayName: botName, vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${botName}\nORG:Sadew Anime\nTEL;waid=94700000000:+94 70 000 0000\nEND:VCARD` } }
        };

        if (!global.animeContexts) global.animeContexts = {};

        // ==========================================
        // 1. ANIME SEARCH (.anime <query>)
        // ==========================================
        if (command === "anime") {
            const query = args.join(" ").trim();

            if (!query) {
                return await socket.sendMessage(sender, {
                    text: `*↳ ❝ [🎌 𝗔𝗻𝗶𝗺𝗲 𝗦𝗲𝗮𝗿𝗰𝗵 🎌] ¡! ❞*\n\n` +
                          `❌ *කරුණාකර Anime නම ලබා දෙන්න!*\n` +
                          `_උදා: .anime new_\n\n` +
                          `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
                }, { quoted: metaQuote });
            }

            try {
                await socket.sendMessage(sender, { react: { text: "🔍", key: msg.key } });

                const searchUrl = `${API_BASE}/search?apiKey=${API_KEY}&url=${encodeURIComponent(query)}`;
                const res = await axios.get(searchUrl, { timeout: 15000 });
                const data = res.data;

                if (!data.success || !data.results || data.results.length === 0) {
                    await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                    return await socket.sendMessage(sender, {
                        text: `❌ *"${query}" සඳහා Results හමුවූයේ නැත.*`
                    }, { quoted: msg });
                }

                const topResults = data.results.slice(0, 10);

                // Save context
                global.animeContexts[sender] = {
                    stage: 'search',
                    results: topResults
                };

                let listText = `*↳ ❝ [🎌 𝗔𝗻𝗶𝗺𝗲 𝗦𝗲𝗮𝗿𝗰𝗵 🎌] ¡! ❞*\n\n`;
                listText += `🔍 *සෙව්වේ:* ${query}\n`;
                listText += `📊 *Results:* ${topResults.length}\n\n`;

                topResults.forEach((item, i) => {
                    listText += `*${i + 1}.* ${item.title}\n`;
                    listText += `   👁️ ${item.views || 'N/A'} | ⏱ ${item.duration || 'N/A'}\n\n`;
                });

                listText += `> *📩 ඔබට අවශ්‍ය Anime එකේ අංකය Reply කරන්න (1-${topResults.length})*\n`;
                listText += `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                const listMsg = await socket.sendMessage(sender, { text: listText }, { quoted: metaQuote });
                global.animeContexts[sender].msgId = listMsg.key.id;

                // ══════ REPLY LISTENER ══════
                const listener = async ({ messages }) => {
                    try {
                        const replyMsg = messages[0];
                        if (!replyMsg.message) return;
                        if (replyMsg.key.remoteJid !== sender) return;

                        const ctx = replyMsg.message.extendedTextMessage?.contextInfo;
                        if (!ctx) return;

                        const context = global.animeContexts[sender];
                        if (!context) return;

                        const replyText = (replyMsg.message.extendedTextMessage?.text || '').trim();
                        if (!/^\d+$/.test(replyText)) return;
                        const num = parseInt(replyText);

                        // ═══════ STAGE: SEARCH RESULT SELECTED ═══════
                        if (context.stage === 'search' && ctx.stanzaId === context.msgId) {
                            if (num < 1 || num > context.results.length) {
                                return await socket.sendMessage(sender, { text: "❌ *වැරදි අංකයක්!*" }, { quoted: replyMsg });
                            }

                            const selected = context.results[num - 1];
                            socket.ev.off('messages.upsert', listener);

                            await socket.sendMessage(sender, { react: { text: "⏳", key: replyMsg.key } });

                            // Check for episodes
                            try {
                                const epUrl = `${API_BASE}/ep?apiKey=${API_KEY}&url=${encodeURIComponent(selected.url)}`;
                                const epRes = await axios.get(epUrl, { timeout: 15000 });
                                const epData = epRes.data;

                                if (epData.success && epData.result && epData.result.is_series && epData.result.episode_list && epData.result.episode_list.length > 1) {
                                    // ═══ SERIES — Show episode list ═══
                                    const episodes = epData.result.episode_list;

                                    let epText = `*↳ ❝ [🎌 ${selected.title} 🎌] ¡! ❞*\n\n`;
                                    epText += `📺 *Series — Episodes: ${episodes.length}*\n\n`;

                                    episodes.forEach((ep, i) => {
                                        epText += `*${ep.episode_number || (i + 1)}.* ${ep.episode_title}\n`;
                                    });

                                    epText += `\n> *📩 ඔබට අවශ්‍ය Episode අංකය Reply කරන්න*\n`;
                                    epText += `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                                    const epMsg = await socket.sendMessage(sender, {
                                        image: { url: selected.thumbnail },
                                        caption: epText
                                    }, { quoted: replyMsg });

                                    // Update context for episode selection
                                    global.animeContexts[sender] = {
                                        stage: 'episodes',
                                        episodes: episodes,
                                        title: selected.title,
                                        msgId: epMsg.key.id
                                    };

                                    // New listener for episode selection
                                    const epListener = async ({ messages }) => {
                                        try {
                                            const epReply = messages[0];
                                            if (!epReply.message || epReply.key.remoteJid !== sender) return;

                                            const epCtx = epReply.message.extendedTextMessage?.contextInfo;
                                            const epContext = global.animeContexts[sender];
                                            if (!epCtx || !epContext || epContext.stage !== 'episodes') return;
                                            if (epCtx.stanzaId !== epContext.msgId) return;

                                            const epNum = parseInt((epReply.message.extendedTextMessage?.text || '').trim());
                                            if (isNaN(epNum)) return;

                                            const matchedEp = epContext.episodes.find(e => parseInt(e.episode_number) === epNum) ||
                                                              epContext.episodes[epNum - 1];
                                            if (!matchedEp) {
                                                return await socket.sendMessage(sender, { text: "❌ *වැරදි Episode අංකයක්!*" }, { quoted: epReply });
                                            }

                                            socket.ev.off('messages.upsert', epListener);
                                            await showQualityButtons(socket, sender, epReply, matchedEp.episode_url, `${epContext.title} - Ep ${matchedEp.episode_number}`, metaQuote);
                                        } catch (e) {
                                            console.log("Anime ep listener error:", e.message);
                                        }
                                    };

                                    socket.ev.on('messages.upsert', epListener);
                                    setTimeout(() => socket.ev.off('messages.upsert', epListener), 120000);

                                } else {
                                    // ═══ SINGLE EPISODE — Show quality directly ═══
                                    await showQualityButtons(socket, sender, replyMsg, selected.url, selected.title, metaQuote);
                                }
                            } catch (epErr) {
                                console.log("Anime ep check failed:", epErr.message);
                                // Fallback: treat as single episode
                                await showQualityButtons(socket, sender, replyMsg, selected.url, selected.title, metaQuote);
                            }

                            await socket.sendMessage(sender, { react: { text: "🎌", key: replyMsg.key } });
                        }
                    } catch (listenerErr) {
                        console.log("Anime listener error:", listenerErr.message);
                    }
                };

                socket.ev.on('messages.upsert', listener);
                setTimeout(() => socket.ev.off('messages.upsert', listener), 120000);
                await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

            } catch (e) {
                console.error("Anime Search Error:", e.message);
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                await socket.sendMessage(sender, {
                    text: `❌ *Search Error!*\n_${e.message}_`
                }, { quoted: msg });
            }
        }

        // ==========================================
        // 2. ANIME DOWNLOAD (.anime_dl url || quality)
        // ==========================================
        else if (command === "anime_dl") {
            const inputData = args.join(" ").trim();
            if (!inputData.includes('||')) return;

            const parts = inputData.split(' || ');
            const videoUrl = parts[0] || '';
            const quality = parts[1] || '720p';
            const title = parts[2] || 'Anime';
            if (!videoUrl) return;

            try {
                await socket.sendMessage(sender, { react: { text: "⬇️", key: msg.key } });
                await socket.sendMessage(sender, {
                    text: `📥 *Downloading ${title} [${quality}]...*\n_රැඳී සිටින්න..._`
                }, { quoted: msg });

                // Try download API first to get direct link
                try {
                    await socket.sendMessage(sender, {
                        video: { url: videoUrl },
                        mimetype: 'video/mp4',
                        caption: `*↳ ❝ [🎌 𝗔𝗻𝗶𝗺𝗲 𝗗𝗟 🎌] ¡! ❞*\n\n` +
                                 `🎬 *${title}*\n` +
                                 `📺 *Quality:* ${quality}\n\n` +
                                 `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
                    }, { quoted: metaQuote });
                } catch (vidErr) {
                    // Fallback: send as document
                    console.log("Anime video send failed, trying document:", vidErr.message);
                    await socket.sendMessage(sender, {
                        document: { url: videoUrl },
                        mimetype: 'video/mp4',
                        fileName: `${title} [${quality}].mp4`,
                        caption: `🎌 *${title}* [${quality}]\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
                    }, { quoted: metaQuote });
                }

                await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

            } catch (e) {
                console.error("Anime DL Error:", e.message);
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                await socket.sendMessage(sender, {
                    text: `❌ *Download Failed!*\n_${e.message}_`
                }, { quoted: msg });
            }
        }

        // ══════════════════════════════════════════
        // HELPER: Show quality selection buttons
        // ══════════════════════════════════════════
        async function showQualityButtons(sock, chatJid, quotedMsg, episodeUrl, title, mQuote) {
            try {
                const dlUrl = `${API_BASE}/dl?apiKey=${API_KEY}&url=${encodeURIComponent(episodeUrl)}`;
                const dlRes = await axios.get(dlUrl, { timeout: 20000 });
                const dlData = dlRes.data;

                if (!dlData.success || !dlData.result || !dlData.result.download_links || dlData.result.download_links.length === 0) {
                    return await sock.sendMessage(chatJid, {
                        text: `❌ *Download Links හමුවූයේ නැත!*`
                    }, { quoted: quotedMsg });
                }

                const links = dlData.result.download_links;
                const shortTitle = title.length > 25 ? title.substring(0, 22) + '...' : title;

                const buttons = links.map(link => ({
                    buttonId: `.anime_dl ${link.direct_link} || ${link.quality} || ${shortTitle}`,
                    buttonText: { displayText: `🎥 ${link.quality}` },
                    type: 1
                }));

                await sock.sendMessage(chatJid, {
                    text: `*↳ ❝ [🎌 𝗔𝗻𝗶𝗺𝗲 𝗗𝗼𝘄𝗻𝗹𝗼𝗮𝗱 🎌] ¡! ❞*\n\n` +
                          `🎬 *${title}*\n\n` +
                          `📺 *Available Qualities:*\n` +
                          links.map(l => `┊ 🎥 ${l.quality}`).join('\n') + `\n\n` +
                          `> *ඔබට අවශ්‍ය Quality එක පහලින් තෝරන්න* ⬇️\n` +
                          `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`,
                    footer: '👑 SADEW-MINI 👑',
                    buttons: buttons,
                    headerType: 1
                }, { quoted: quotedMsg });

            } catch (e) {
                console.log("Anime quality buttons error:", e.message);
                await sock.sendMessage(chatJid, {
                    text: `❌ *Quality Links ලබාගැනීමේ Error!*\n_${e.message}_`
                }, { quoted: quotedMsg });
            }
        }
    }
};
