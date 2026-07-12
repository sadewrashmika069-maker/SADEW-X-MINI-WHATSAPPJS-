const axios = require("axios");
const { generateWAMessageFromContent, prepareWAMessageMedia } = require("baileys");

// තත්පර ගාණක් නවත්තන් ඉන්න පොඩි Helper Function එකක් (Delay)
const delay = ms => new Promise(res => setTimeout(res, ms));

module.exports = {
    name: "wallpaper_search",
    category: "search",
    description: "Search and download HD Wallpapers using Horizontal Cards",
    commands: ["wallpaper", "wp", "wpdl"], // wpdl කියන්නේ Button එක එබුවම වැඩ කරන command එක

    handler: async ({ socket, msg, sender, command, args }) => {
        
        // ==========================================
        // 🔥 1. DOWNLOAD COMMAND (.wpdl) - Button එක එබුවම
        // ==========================================
        if (command === "wpdl") {
            const url = args.join(" ").trim();
            if (!url) return;

            await socket.sendMessage(sender, { react: { text: "⏳", key: msg.key } });
            await socket.sendMessage(sender, { text: "📥 _Downloading high-quality wallpaper..._" }, { quoted: msg });

            try {
                // HD ෆොටෝ එක ඩවුන්ලෝඩ් කරගන්නවා
                const res = await axios.get(url, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(res.data);
                
                // ෆොටෝ එකේ Quality එක අඩුවෙන්නේ නැති වෙන්න Document එකක් විදිහටම යවනවා
                await socket.sendMessage(sender, {
                    document: buffer,
                    mimetype: 'image/jpeg',
                    fileName: `SadewMini_WP_${Date.now()}.jpg`,
                    caption: `🖼️ *HD Wallpaper Downloaded*\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
                }, { quoted: msg });

                await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });
            } catch (err) {
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                await socket.sendMessage(sender, { text: `❌ *Download failed:* ${err.message}` }, { quoted: msg });
            }
            return; // ඩවුන්ලෝඩ් එක ඉවර නිසා මෙතනින් නවතිනවා
        }

        // ==========================================
        // 🔥 2. SEARCH COMMAND (.wallpaper / .wp) 
        // ==========================================
        const query = args.join(" ").trim();

        if (!query) {
            return await socket.sendMessage(sender, {
                text: `🖼️ *Wallpaper Search*\n\n*භාවිතය:*\n• .wallpaper <query>\n\n*උදාහරණ:*\n.wallpaper naruto\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
            }, { quoted: msg });
        }

        await socket.sendMessage(sender, { react: { text: "🔍", key: msg.key } });
        await socket.sendMessage(sender, { text: `🔍 _Searching wallpapers for "${query}"..._` }, { quoted: msg });

        try {
            // API එකෙන් ඩේටා ගන්නවා
            const apiRes = await axios.get(`https://apis.davidcyril.name.ng/search/wallpaper?text=${encodeURIComponent(query)}`);
            const data = apiRes.data;

            if (!data.success || !data.result || data.result.length === 0) {
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                return await socket.sendMessage(sender, { text: "❌ *ඔබ සෙවූ නමට අදාළ Wallpapers හමුවූයේ නැත.*" }, { quoted: msg });
            }

            const results = data.result; 
            
            // 🛑 ෆොටෝ 18 කොටස් 2 කට කඩනවා (10 යි 8 යි)
            const chunk1 = results.slice(0, 10);
            const chunk2 = results.slice(10, 18);

            await socket.sendMessage(sender, { text: `✅ *Found ${results.length} wallpapers!*\n_Generating horizontal cards, please wait..._` }, { quoted: msg });

            // 🛠️ Horizontal Cards (Carousel) හදන Function එක
            const sendCarousel = async (chunk, part) => {
                // Promise.all දාලා ෆොටෝ 10 ම එකපාර ස්පීඩ් එකේ ඩවුන්ලෝඩ් කරගන්නවා
                const cards = await Promise.all(chunk.map(async (wp) => {
                    const imgRes = await axios.get(wp.image, { responseType: 'arraybuffer' });
                    const media = await prepareWAMessageMedia({ image: Buffer.from(imgRes.data) }, { upload: socket.waUploadToServer });
                    
                    return {
                        header: {
                            hasMediaAttachment: true,
                            imageMessage: media.imageMessage
                        },
                        body: { text: `*${wp.title.substring(0, 60)}...*` },
                        nativeFlowMessage: {
                            buttons: [
                                {
                                    name: "quick_reply",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "📥 Download", // Card එක යටින් වැටෙන Button එක
                                        id: `.wpdl ${wp.image}`
                                    })
                                }
                            ]
                        }
                    };
                }));

                // Carousel මැසේජ් එක හදනවා
                const carouselMsg = generateWAMessageFromContent(sender, {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                            interactiveMessage: {
                                body: { text: `🖼️ *Wallpaper Results (Part ${part})*\n🔍 *Search:* ${query}` },
                                carouselMessage: { cards: cards }
                            }
                        }
                    }
                }, { quoted: msg });

                await socket.relayMessage(sender, carouselMsg.message, { messageId: carouselMsg.key.id });
            };

            // 🚀 1 වෙනි ෆොටෝ 10 යවනවා
            if (chunk1.length > 0) {
                await sendCarousel(chunk1, 1);
            }

            // ⏳ තත්පර 3 ක් ඉන්නවා 
            if (chunk2.length > 0) {
                await delay(3000); 
                // 🚀 ඉතුරු ෆොටෝ 8 යවනවා
                await sendCarousel(chunk2, 2);
            }

            await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Wallpaper Error:", err);
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
            await socket.sendMessage(sender, { text: `❌ *Error:* ${err.message}` }, { quoted: msg });
        }
    }
};
