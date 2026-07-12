const axios = require("axios");
const { generateWAMessageFromContent, prepareWAMessageMedia } = require("baileys");

// තත්පර ගාණක් නවත්තන් ඉන්න Helper Function එක (Delay)
const delay = ms => new Promise(res => setTimeout(res, ms));

module.exports = {
    name: "wallpaper_search",
    category: "search",
    description: "Search and download HD Wallpapers using multiple Horizontal Cards",
    commands: ["wallpaper", "wp", "wpdl"],

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
                const res = await axios.get(url, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(res.data);
                
                // ෆොටෝ එකේ Quality එක අඩුවෙන්නේ නැති වෙන්න Document එකක් විදිහට යවනවා
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
            return; 
        }

        // ==========================================
        // 🔥 2. SEARCH COMMAND (.wallpaper / .wp) 
        // ==========================================
        const query = args.join(" ").trim();

        if (!query) {
            return await socket.sendMessage(sender, {
                text: `🖼️ *Wallpaper Search*\n\n*භාවිතය:*\n• .wallpaper <query>\n\n*උදාහරණ:*\n.wallpaper bmw\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
            }, { quoted: msg });
        }

        await socket.sendMessage(sender, { react: { text: "🔍", key: msg.key } });
        await socket.sendMessage(sender, { text: `🔍 _Searching wallpapers for "${query}"..._` }, { quoted: msg });

        try {
            const apiRes = await axios.get(`https://apis.davidcyril.name.ng/search/wallpaper?text=${encodeURIComponent(query)}`);
            const data = apiRes.data;

            if (!data.success || !data.result || data.result.length === 0) {
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                return await socket.sendMessage(sender, { text: "❌ *ඔබ සෙවූ නමට අදාළ Wallpapers හමුවූයේ නැත.*" }, { quoted: msg });
            }

            const results = data.result; 
            
            // 🛑 ෆොටෝ 30 දක්වා කෑලි 3 කට (10 ගානේ) කඩනවා
            const chunk1 = results.slice(0, 10);
            const chunk2 = results.slice(10, 20);
            const chunk3 = results.slice(20, 30);

            await socket.sendMessage(sender, { text: `✅ *Found ${results.length} wallpapers!*\n_Generating horizontal cards, please wait..._` }, { quoted: msg });

            // 🛠️ Horizontal Cards හදන Function එක
            const sendCarousel = async (chunk, part) => {
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
                                        display_text: "📥 Download",
                                        id: `.wpdl ${wp.image}`
                                    })
                                }
                            ]
                        }
                    };
                }));

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

            // 🚀 1 වෙනි ෆොටෝ 10 (Row 1) යවනවා
            if (chunk1.length > 0) {
                await sendCarousel(chunk1, 1);
            }

            // ⏳ තත්පර 3 ක් ඉඳලා 2 වෙනි ෆොටෝ 10 (Row 2) යවනවා 
            if (chunk2.length > 0) {
                await delay(3000); 
                await sendCarousel(chunk2, 2);
            }

            // ⏳ තත්පර 4 ක් ඉඳලා 3 වෙනි ෆොටෝ 10 (Row 3) යවනවා 
            if (chunk3.length > 0) {
                await delay(4000); 
                await sendCarousel(chunk3, 3);
            }

            await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Wallpaper Error:", err);
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
            await socket.sendMessage(sender, { text: `❌ *Error:* ${err.message}` }, { quoted: msg });
        }
    }
};
