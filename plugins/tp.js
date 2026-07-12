const axios = require("axios");
const { generateWAMessageFromContent, prepareWAMessageMedia } = require("baileys");

// තත්පර ගාණක් නවත්තන් ඉන්න Helper Function එක (Delay)
const delay = ms => new Promise(res => setTimeout(res, ms));

module.exports = {
    name: "tiktok_photo_dl",
    category: "download",
    description: "Download TikTok photo slides using Horizontal Cards",
    commands: ["tp", "tpdl"],

    handler: async ({ socket, msg, sender, command, args }) => {
        
        // ==========================================
        // 🔥 1. DOWNLOAD COMMAND (.tpdl) - Button එක එබුවම
        // ==========================================
        if (command === "tpdl") {
            const url = args.join(" ").trim();
            if (!url) return;

            await socket.sendMessage(sender, { react: { text: "⏳", key: msg.key } });
            await socket.sendMessage(sender, { text: "📥 _Downloading TikTok photo..._" }, { quoted: msg });

            try {
                const res = await axios.get(url, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(res.data);
                
                // ෆොටෝ එකේ Quality එක අඩුවෙන්නේ නැති වෙන්න Document එකක් විදිහට යවනවා
                await socket.sendMessage(sender, {
                    document: buffer,
                    mimetype: 'image/jpeg',
                    fileName: `SadewMini_TikTok_${Date.now()}.jpg`,
                    caption: `📸 *TikTok Photo Downloaded*\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
                }, { quoted: msg });

                await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });
            } catch (err) {
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                await socket.sendMessage(sender, { text: `❌ *Download failed:* ${err.message}` }, { quoted: msg });
            }
            return; 
        }

        // ==========================================
        // 🔥 2. MAIN COMMAND (.tp) - Link එක දුන්නම
        // ==========================================
        const url = args.join(" ").trim();

        if (!url || !url.includes("tiktok.com")) {
            return await socket.sendMessage(sender, {
                text: `📸 *TikTok Photo Downloader*\n\n*භාවිතය:*\n• .tp <tiktok_link>\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
            }, { quoted: msg });
        }

        await socket.sendMessage(sender, { react: { text: "🔍", key: msg.key } });
        await socket.sendMessage(sender, { text: `🔍 _Fetching TikTok Photos..._` }, { quoted: msg });

        try {
            let images = [];
            
            // 🛠️ API කීපයකින් ට්‍රයි කරනවා (කවදාවත් ඩවුන් නොවෙන්න)
            try {
                const res1 = await axios.get(`https://api.vreden.my.id/api/tiktok?url=${encodeURIComponent(url)}`);
                if (res1.data?.data?.images && Array.isArray(res1.data.data.images)) {
                    images = res1.data.data.images;
                }
            } catch (e) {}

            if (images.length === 0) {
                try {
                    const res2 = await axios.get(`https://bk9.fun/download/tiktok?url=${encodeURIComponent(url)}`);
                    if (res2.data?.BK9?.images && Array.isArray(res2.data.BK9.images)) {
                        images = res2.data.BK9.images;
                    }
                } catch (e) {}
            }

            if (images.length === 0) {
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                return await socket.sendMessage(sender, { text: "❌ *මෙය Photo Slide එකක් නොවේ හෝ ඩවුන්ලෝඩ් කිරීමට නොහැක!*" }, { quoted: msg });
            }

            // 🛑 ෆොටෝ 20 දක්වා කෑලි 2 කට (10 ගානේ) කඩනවා (Row 2 යි)
            const chunk1 = images.slice(0, 10);
            const chunk2 = images.slice(10, 20);

            await socket.sendMessage(sender, { text: `✅ *Found ${images.length} Photos!*\n_Generating horizontal cards, please wait..._` }, { quoted: msg });

            // 🛠️ Horizontal Cards හදන Function එක
            const sendCarousel = async (chunk, part) => {
                const cards = await Promise.all(chunk.map(async (imgUrl, index) => {
                    const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer' });
                    const media = await prepareWAMessageMedia({ image: Buffer.from(imgRes.data) }, { upload: socket.waUploadToServer });
                    
                    return {
                        header: {
                            hasMediaAttachment: true,
                            imageMessage: media.imageMessage
                        },
                        body: { text: `*📸 TikTok Photo Slide ${index + 1 + (part === 2 ? 10 : 0)}*` },
                        nativeFlowMessage: {
                            buttons: [
                                {
                                    name: "quick_reply",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "📥 Download",
                                        id: `.tpdl ${imgUrl}`
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
                                body: { text: `📸 *TikTok Photos (Row ${part})*\n🔗 *Link:* ${url}` },
                                carouselMessage: { cards: cards }
                            }
                        }
                    }
                }, { quoted: msg });

                await socket.relayMessage(sender, carouselMsg.message, { messageId: carouselMsg.key.id });
            };

            // 🚀 1 වෙනි Row එක (පළවෙනි ෆොටෝ 10) යවනවා
            if (chunk1.length > 0) {
                await sendCarousel(chunk1, 1);
            }

            // ⏳ තත්පර 3 ක් ඉඳලා 2 වෙනි Row එක (ඊළඟ ෆොටෝ 10) යවනවා 
            if (chunk2.length > 0) {
                await delay(3000); 
                await sendCarousel(chunk2, 2);
            }

            await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("TikTok Photo Error:", err);
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
            await socket.sendMessage(sender, { text: `❌ *Error:* ${err.message}` }, { quoted: msg });
        }
    }
};
