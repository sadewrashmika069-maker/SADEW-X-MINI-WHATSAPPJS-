const axios = require("axios");

// 🔑 WhiteShadow API Token
const API_TOKEN = "VK4fry";

module.exports = {
    name: "google-search",
    category: 7, // Other Cmds category එක
    description: "Search Google for links and get a live webpage screenshot.",
    commands: ["google", "gsearch", "search", "සර්ච්"],

    handler: async ({ socket, msg, sender, args, reply }) => {
        try {
            // 1. Get user input or quoted text
            let textInput = args.join(" ").trim();
            
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!textInput && quoted) {
                textInput = quoted.conversation || quoted.extendedTextMessage?.text || "";
            }

            if (!textInput) {
                return await reply("❌ *කරුණාකර සෙවිය යුතු දේ ඇතුළත් කරන්න.*\n\n💡 _උදා: .google Sri Lanka_");
            }

            await socket.sendMessage(sender, { react: { text: "🔍", key: msg.key } });

            // 🌐 2. Text Results ලබාගැනීම (WhiteShadow Google API)
            const targetUrl = `https://whiteshadow-x-api.onrender.com/api/search/google?q=${encodeURIComponent(textInput)}&apitoken=${API_TOKEN}`;
            
            console.log("[SADEW-MINI GOOGLE] Fetching search results...");
            const response = await axios.get(targetUrl, { timeout: 30000 });

            if (response.data && response.data.success && response.data.result) {
                const results = response.data.result;
                
                if (results.length === 0) {
                    await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                    return await reply("❌ *ප්‍රතිඵල කිසිවක් හමු නොවීය.*");
                }

                // ලස්සනට ලින්ක්ස් ටික හදාගැනීම
                let searchMessage = `🔍 *Google Search Results for:* _${textInput}_\n\n`;
                results.forEach((item, index) => {
                    searchMessage += `*${index + 1}. ${item.title}*\n`;
                    searchMessage += `🔗 *Link:* ${item.link}\n`;
                    searchMessage += `📝 _${item.snippet}_\n\n───────────────────\n\n`;
                });
                searchMessage += `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                // ලින්ක්ස් ටික යැවීම
                await reply(searchMessage);

                // 📸 3. Screenshot ලබාගැනීම (CAPTCHA Bypass කිරීමට Bing භාවිතා කර ඇත)
                await socket.sendMessage(sender, { react: { text: "⏳", key: msg.key } });

                const alternativeSearchUrl = `https://www.bing.com/search?q=${encodeURIComponent(textInput)}`;
                
                // API 1: ScreenshotAPI.net
                const screenshotUrl = `https://shot.screenshotapi.net/screenshot?url=${encodeURIComponent(alternativeSearchUrl)}&width=1280&height=800&output=image&file_type=png`;
                
                console.log("[SADEW-MINI GOOGLE] Fetching live screenshot from Bing visual...");
                try {
                    const ssResponse = await axios.get(screenshotUrl, {
                        responseType: 'arraybuffer',
                        timeout: 25000,
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });

                    if (ssResponse.status === 200 && ssResponse.data && ssResponse.data.length > 1000) {
                        const caption = `📸 *Live Search View for:* _${textInput}_\n🤖 SADEW-MINI\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;
                        
                        await socket.sendMessage(sender, {
                            image: Buffer.from(ssResponse.data),
                            caption: caption
                        }, { quoted: msg });

                        await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });
                        return;
                    } else {
                        throw new Error("Failed response from API 1");
                    }

                } catch (ssError) {
                    console.error("[SADEW-MINI GOOGLE] Screenshot API 1 Failed. Trying Fallback...", ssError.message);
                    
                    // Fallback API 2: Microlink
                    try {
                        const fallbackUrl = `https://api.microlink.io/?url=${encodeURIComponent(alternativeSearchUrl)}&screenshot=true&meta=false`;
                        
                        const { data } = await axios.get(fallbackUrl, { timeout: 20000 });
                        const fallbackSsUrl = data?.data?.screenshot?.url;
                        
                        if (fallbackSsUrl) {
                            const caption = `📸 *Live Search View for:* _${textInput}_\n🤖 SADEW-MINI (Fallback API)\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;
                            await socket.sendMessage(sender, { image: { url: fallbackSsUrl }, caption: caption }, { quoted: msg });
                            await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });
                        } else {
                            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                        }
                    } catch (fallbackError) {
                        console.error("[SADEW-MINI GOOGLE] Fallback failed too:", fallbackError.message);
                        await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                    }
                }

            } else {
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                return await reply("❌ *Error:* Google API එකෙන් දත්ත ලබාගැනීමට නොහැකි විය.");
            }

        } catch (error) {
            console.error("[SADEW-MINI GOOGLE] Main Error:", error.message);
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
            return await reply(`❌ *Google Search Error:* ${error.message}`);
        }
    }
};
