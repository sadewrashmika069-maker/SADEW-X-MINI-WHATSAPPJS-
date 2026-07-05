const axios = require('axios');

module.exports = {
    name: "tiktok-booster",
    category: 5, 
    description: "Boost TikTok Views/Followers using SMM APIs",
    commands: ["ttboost", "tiktokboost", "boosttt", "tview"],

    handler: async ({ socket, msg, sender, args, reply }) => {
        const input = args.join(" ").trim();

        // 1. ලින්ක් එක අල්ලගැනීම
        const urlMatch = input.match(/(https?:\/\/(?:www\.)?(?:tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com)\/[^\s]+)/i);
        if (!urlMatch) {
            return reply(`🚀 *SADEW-MINI TIKTOK BOOSTER* 🚀\n\nකරුණාකර TikTok ලින්ක් එකක් සහ සර්වර් අංකයක් (1-5) ලබා දෙන්න.\n\n💡 *උදාහරණ:*\n\`.ttboost https://vm.tiktok.com/xxxxxx 1\`\n\n*Servers:*\n[1] - Video Views (Fast)\n[2] - Video Views (Alt)\n[3] - Multi-Session Views\n[4] - Video Likes/Shares\n[5] - Followers (High Cooldown)`);
        }
        
        const tiktokUrl = urlMatch[0];

        // 2. සර්වර් අංකය අල්ලගැනීම (නැත්නම් Default 1 ගන්නවා)
        const numMatch = input.replace(tiktokUrl, "").match(/[1-5]/);
        const serverNum = numMatch ? numMatch[0] : "1";

        try {
            await socket.sendMessage(sender, { react: { text: '🚀', key: msg.key } });
            await reply(`⚙️ _TikTok Boost Server ${serverNum} වෙත ඉල්ලීම යවමින් පවතී. කරුණාකර රැඳී සිටින්න..._`);

            // 🔥 මෙතන තමයි හැදුවේ! (tiktokboost වෙනුවට tiktok-boost කියලා ඉරක් එක්ක දැම්මා)
            let apiUrl = "";
            switch (serverNum) {
                case "1": apiUrl = `https://apis.davidcyril.name.ng/tiktok-boost?url=${encodeURIComponent(tiktokUrl)}`; break;
                case "2": apiUrl = `https://apis.davidcyril.name.ng/tiktok-boost-2?url=${encodeURIComponent(tiktokUrl)}`; break;
                case "3": apiUrl = `https://apis.davidcyril.name.ng/tiktok-boost-3?url=${encodeURIComponent(tiktokUrl)}`; break;
                case "4": apiUrl = `https://apis.davidcyril.name.ng/tiktok-boost-4?url=${encodeURIComponent(tiktokUrl)}`; break;
                case "5": apiUrl = `https://apis.davidcyril.name.ng/tiktok-boost-5?url=${encodeURIComponent(tiktokUrl)}`; break;
                default: apiUrl = `https://apis.davidcyril.name.ng/tiktok-boost?url=${encodeURIComponent(tiktokUrl)}`;
            }

            const response = await axios.get(apiUrl, { timeout: 30000 });
            const data = response.data;

            // 3. Responses හැසිරවීම
            let resultMsg = `*↳ ❝ [🚀 𝗦𝗮𝗱𝗲𝘄 𝗧𝗶𝗸𝗧𝗼𝗸 𝗕𝗼𝗼𝘀𝘁𝗲𝗿 🚀] ¡! ❞*\n\n`;
            resultMsg += `*🔗 Link:* ${tiktokUrl}\n*🖧 Server:* ${serverNum}\n\n`;

            if (data.success) {
                resultMsg += `*✅ Status:* Success\n`;

                if (data.data && data.data.amount_processed) {
                    resultMsg += `*📈 Processed:* ${data.data.amount_processed} ${data.type || 'Views'}\n`;
                } 
                else if (data.results && Array.isArray(data.results)) {
                    let total = 0;
                    data.results.forEach(res => total += res.quantity || 0);
                    resultMsg += `*📈 Sessions Sent:* ${data.sessions}\n*📊 Est. Quantity:* ${total}\n`;
                } 
                else if (data.message) {
                    resultMsg += `*💬 Info:* ${data.message}\n`;
                }

                resultMsg += `\n_🎉 මිනිත්තු කිහිපයකින් ප්‍රතිඵල බලාපොරොත්තු වන්න!_\n`;
                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

            } else {
                resultMsg += `*❌ Status:* Failed / Cooldown Active\n`;
                resultMsg += `*💬 Reason:* ${data.message || 'සර්වර් එක මේ මොහොතේ කාර්යබහුලයි.'}\n\n`;
                resultMsg += `_💡 කරුණාකර වෙනත් සර්වර් එකක් උත්සාහ කරන්න (උදා: .ttboost <link> 2)._\n`;
                await socket.sendMessage(sender, { react: { text: '⚠️', key: msg.key } });
            }

            resultMsg += `\n*⚠️ අවවාදයයි:* \nමෙම බොට් ට්‍රැෆික් භාවිතය හේතුවෙන් ඔබගේ TikTok ගිණුම Shadowban වීමේ අවදානමක් ඇත. වගකීමෙන් භාවිතා කරන්න!\n\n`;
            resultMsg += `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

            await reply(resultMsg);

        } catch (error) {
            console.error("[TIKTOK BOOST ERROR]:", error.message);
            await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
            
            // 404 ආවොත් කියන්න වෙනම මැසේජ් එකකුත් දැම්මා
            if (error.response && error.response.status === 404) {
                await reply(`❌ *සර්වර් දෝෂයකි (404 Not Found)!*\n\nAPI සර්වර් එකේ මෙම පහසුකම දැනට ඉවත් කර හෝ වෙනස් කර ඇත.`);
            } else {
                await reply(`❌ *සර්වර් දෝෂයකි!*\n\nමෙම සර්වර් එක දැනට අක්‍රිය වී හෝ අවහිර වී ඇත. කරුණාකර පසුව නැවත උත්සාහ කරන්න.`);
            }
        }
    }
};
