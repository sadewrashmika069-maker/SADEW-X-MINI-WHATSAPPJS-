// 🔥🔥🔥 XNXX රිප්ලයි අල්ලන්න දාන කෑල්ල 🔥🔥🔥
    if (quotedText.includes("SADEW-MD SEARCH") && /^[0-9]+$/.test(replyText)) {
        if (global.xnxxContexts && global.xnxxContexts[sender]) {
            let context = global.xnxxContexts[sender];
            let number = parseInt(replyText);
            
            if (number >= 1 && number <= context.results.length) {
                const axios = require('axios');
                const selectedVideo = context.results[number - 1];
                
                try { await socket.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } }); } catch (_) {}

                if (selectedVideo.thumbnail) {
                    await socket.sendMessage(msg.key.remoteJid, { 
                        image: { url: selectedVideo.thumbnail }, 
                        caption: `📥 *Downloading Video No ${number}:* _${selectedVideo.title}_\n*සැනෙකින් වීඩියෝව අප්ලෝඩ් වේ, රැඳී සිටින්න... (ෆයිල් එක විශාල නම් මඳ වෙලාවක් ගතවිය හැක)*` 
                    }, { quoted: msg });
                }

                try {
                    const downloadApiUrl = `https://api.zanta-mini.store/api/xnxx/dl?apiKey=zan_FIAO7Ayh_eo1vllkep6&url=${encodeURIComponent(selectedVideo.url)}`;
                    const downloadResponse = await axios.get(downloadApiUrl);
                    const dlData = downloadResponse.data?.result;
                    
                    // 🔥 API එකේ ලින්ක් එන විදිහ වෙනස් වුණොත් වැඩ කරන්න Fallbacks දැම්මා
                    const directDownloadLink = dlData?.dl_links?.high || dlData?.dl_links?.low || dlData?.url || dlData?.files?.high;

                    if (!directDownloadLink) {
                        try { await socket.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } }); } catch (_) {}
                        return await socket.sendMessage(msg.key.remoteJid, { text: "❌ _Direct Download Link එක ලබා ගැනීමට නොහැකි විය!_" }, { quoted: msg });
                    }

                    // වීඩියෝ එක යවනවා
                    await socket.sendMessage(msg.key.remoteJid, { 
                        video: { url: directDownloadLink }, 
                        caption: `🎥 *${dlData.title || selectedVideo.title}*\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*` 
                    }, { quoted: msg });
                    
                    try { await socket.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } }); } catch (_) {}
                } catch (error) {
                    try { await socket.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } }); } catch (_) {}
                    await socket.sendMessage(msg.key.remoteJid, { text: `_❌ වීඩියෝව ඩවුන්ලෝඩ් කිරීම අසාර්ථක විය! (ෆයිල් එක විශාල වැඩි විය හැක): ${error.message || error}_` }, { quoted: msg });
                }
                return; // වැඩේ ඉවරයි
            }
        } else {
            return await socket.sendMessage(msg.key.remoteJid, { text: "❌ *කරුණාකර වීඩියෝව මුල සිට නැවත Search කරන්න! (Session Expired)*" }, { quoted: msg });
        }
    }
    // 🔥🔥🔥 අලුත් කෑල්ල මෙතනින් ඉවරයි 🔥🔥🔥
