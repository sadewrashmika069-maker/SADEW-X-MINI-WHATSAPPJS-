const axios = require('axios');

module.exports = {
    name: "instagram-downloader",
    category: 1,
    description: "Download Instagram Reels, Posts & Carousels",
    commands: ["ig", "insta", "instagram"],

    handler: async ({ socket, msg, sender, command, args, reply }) => {
        const botName = "👑 SADEW-MINI 👑";
        const IG_API = "https://whiteshadow-x-api.onrender.com/api/download/ig";
        const API_TOKEN = "VK4fry";
        const metaQuote = {
            key: { remoteJid: "status@broadcast", participant: "0@s.whatsapp.net", fromMe: false, id: "META_AI_IG" },
            message: { contactMessage: { displayName: botName, vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${botName}\nORG:Sadew Instagram\nTEL;waid=94700000000:+94 70 000 0000\nEND:VCARD` } }
        };

        const url = args.join(" ").trim();

        // URL validate
        if (!url || !url.includes("instagram.com")) {
            return await socket.sendMessage(sender, {
                text: `*↳ ❝ [📸 𝗜𝗻𝘀𝘁𝗮𝗴𝗿𝗮𝗺 𝗗𝗼𝘄𝗻𝗹𝗼𝗮𝗱𝗲𝗿 📸] ¡! ❞*\n\n` +
                      `❌ *Instagram Link එකක් දෙන්න!*\n\n` +
                      `📌 *භාවිතය:*\n` +
                      `┊ .ig https://www.instagram.com/reel/xxx\n` +
                      `┊ .ig https://www.instagram.com/p/xxx\n\n` +
                      `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
            }, { quoted: metaQuote });
        }

        try {
            await socket.sendMessage(sender, { react: { text: "⏳", key: msg.key } });
            await socket.sendMessage(sender, {
                text: `📥 *Instagram Media Download කරමින්...*\n_රැඳී සිටින්න..._`
            }, { quoted: msg });

            // API call
            const apiUrl = `${IG_API}?url=${encodeURIComponent(url)}&apitoken=${API_TOKEN}`;
            const res = await axios.get(apiUrl, { timeout: 30000 });
            const data = res.data;

            if (!data.success || !data.result || data.result.length === 0) {
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                return await socket.sendMessage(sender, {
                    text: `❌ *මෙම Instagram Link එකෙන් Media හමුවූයේ නැත.*\n_Link එක Private ද කියලා බලන්න._`
                }, { quoted: msg });
            }

            const results = data.result;
            const totalMedia = results.length;

            // Send each media item
            for (let i = 0; i < results.length; i++) {
                const item = results[i];
                const mediaUrl = item.url;
                const mediaType = item.type || 'video';
                const countLabel = totalMedia > 1 ? ` (${i + 1}/${totalMedia})` : '';

                const caption = `*↳ ❝ [📸 𝗜𝗻𝘀𝘁𝗮𝗴𝗿𝗮𝗺 𝗗𝗟 📸] ¡! ❞*\n\n` +
                                `📌 *Type:* ${mediaType === 'video' ? '🎥 Video' : '🖼️ Image'}${countLabel}\n\n` +
                                `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                try {
                    if (mediaType === 'video') {
                        await socket.sendMessage(sender, {
                            video: { url: mediaUrl },
                            mimetype: 'video/mp4',
                            caption: caption
                        }, { quoted: metaQuote });
                    } else {
                        await socket.sendMessage(sender, {
                            image: { url: mediaUrl },
                            caption: caption
                        }, { quoted: metaQuote });
                    }
                } catch (mediaErr) {
                    console.log(`IG media ${i + 1} send failed:`, mediaErr.message);
                    // Fallback: send as document
                    try {
                        const ext = mediaType === 'video' ? 'mp4' : 'jpg';
                        await socket.sendMessage(sender, {
                            document: { url: mediaUrl },
                            mimetype: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
                            fileName: `instagram_${Date.now()}_${i + 1}.${ext}`,
                            caption: caption
                        }, { quoted: metaQuote });
                    } catch (docErr) {
                        console.log(`IG doc fallback ${i + 1} failed:`, docErr.message);
                    }
                }

                // Delay between multiple media
                if (i < results.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            }

            await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

        } catch (e) {
            console.error("Instagram DL Error:", e.message);
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
            await socket.sendMessage(sender, {
                text: `❌ *Instagram Download Error!*\n_${e.message}_\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
            }, { quoted: msg });
        }
    }
};
