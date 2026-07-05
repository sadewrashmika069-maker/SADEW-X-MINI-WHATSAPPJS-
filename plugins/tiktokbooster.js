const axios = require('axios');

module.exports = {
    name: "tiktok-booster",
    category: 5, 
    description: "Boost TikTok Views/Likes/Followers using SMM APIs",
    commands: ["ttboost", "tiktokboost", "boosttt", "tview"],

    handler: async ({ socket, msg, sender, args, reply }) => {
        const input = args.join(" ").trim();

        // 1. ලින්ක් එක අල්ලගැනීම (TikTok URLs)
        const urlMatch = input.match(/(https?:\/\/(?:www\.)?(?:tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com)\/[^\s]+)/i);
        if (!urlMatch) {
            return reply(`🚀 *SADEW-MINI TIKTOK BOOSTER* 🚀\n\nකරුණාකර TikTok ලින්ක් එකක්, සර්වර් අංකයක් (1-5) සහ අවශ්‍ය සේවාව (views/likes/shares/followers) ලබා දෙන්න.\n\n💡 *උදාහරණ:*\n\`.ttboost https://vm.tiktok.com/xxxxxx 1\` (Views සඳහා)\n\`.ttboost https://vm.tiktok.com/xxxxxx 4 likes\` (Likes සඳහා)\n\`.ttboost https://vm.tiktok.com/xxxxxx 4 shares\` (Shares සඳහා)`);
        }
        
        const tiktokUrl = urlMatch[0];
        
        // ලින්ක් එකෙන් අයින් කරලා ඉතුරු ටික (සර්වර් එක සහ type එක හොයාගන්න)
        const remainingInput = input.replace(tiktokUrl, "").toLowerCase();

        // 2. සර්වර් අංකය අල්ලගැනීම (නැත්නම් Default 1 ගන්නවා)
        const numMatch = remainingInput.match(/[1-5]/);
        const serverNum = numMatch ? numMatch[0] : "1";

        // 3. අවශ්‍ය සේවාව (Type) අල්ලගැනීම (නැත්නම් Default 'views' ගන්නවා)
        let boostType = "views"; 
        if (remainingInput.includes("like")) boostType = "likes";
        else if (remainingInput.includes("share")) boostType = "shares";
        else if (remainingInput.includes("comment")) boostType = "comments";
        else if (remainingInput.includes("favorite")) boostType = "favorites";
        else if (remainingInput.includes("follower")) boostType = "followers";

        // Server 1 වල views වලට API එකේ තියෙන්නේ 'video_views' කියලයි (උඹ එවපු curl එකේ විදිහට)
        if (serverNum === "1" && boostType === "views") {
            boostType = "video_views";
        }

        try {
            await socket.sendMessage(sender, { react: { text: '🚀', key: msg.key } });
            await reply(`⚙️ _TikTok Boost Server ${serverNum} වෙත සම්බන්ධ වෙමින් පවතී..._\n🎯 *Target:* ${boostType.toUpperCase()}`);

            // 🔥 ඔයා හොයාගත්ත නිවැරදි API Endpoint එක
            let boostPath = serverNum === "1" ? "boost" : `boost${serverNum}`;
            let apiUrl = `https://apis.davidcyril.name.ng/api/tiktok/${boostPath}?url=${encodeURIComponent(tiktokUrl)}`;

            // සර්වර් 1 සහ 4 වලට විතරයි type එක සපෝට් කරන්නේ
            if (serverNum === "1" || serverNum === "4") {
                apiUrl += `&type=${boostType}`;
            }

            let data;
            try {
                // කෙලින්ම නිවැරදි ලින්ක් එකට Request එක යවනවා
                const response = await axios.get(apiUrl, { timeout: 25000 });
                data = response.data;
            } catch (err) {
                if (err.response && err.response.data) {
                    // 400/429 (Cooldown Error) ආවොත් ඒකෙත් JSON Data තියෙනවා
                    data = err.response.data;
                } else {
                    throw err; 
                }
            }

            // 4. Responses හැසිරවීම
            let resultMsg = `*↳ ❝ [🚀 𝗦𝗮𝗱𝗲𝘄 𝗧𝗶𝗸𝗧𝗼𝗸 𝗕𝗼𝗼𝘀𝘁𝗲𝗿 🚀] ¡! ❞*\n\n`;
            resultMsg += `*🔗 Link:* ${tiktokUrl}\n*🖧 Server:* ${serverNum}\n*🎯 Type:* ${boostType.replace('_', ' ').toUpperCase()}\n\n`;

            if (data.success || data.success === 'true' || data.success === true) {
                resultMsg += `*✅ Status:* Success\n`;

                if (data.data && data.data.amount_processed) {
                    resultMsg += `*📈 Processed:* ${data.data.amount_processed}\n`;
                } 
                else if (data.results && Array.isArray(data.results)) {
                    let total = 0;
                    data.results.forEach(res => total += res.quantity || 0);
                    resultMsg += `*📈 Sessions:* ${data.sessions || data.results.length}\n*📊 Est. Quantity:* ${total}\n`;
                } 
                else if (data.message) {
                    resultMsg += `*💬 Info:* ${data.message}\n`;
                }

                resultMsg += `\n_🎉 මිනිත්තු කිහිපයකින් ප්‍රතිඵල බලාපොරොත්තු වන්න!_\n`;
                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

            } else {
                resultMsg += `*❌ Status:* Failed / Cooldown Active\n`;
                resultMsg += `*💬 Reason:* ${data.message || 'සර්වර් එක මේ මොහොතේ කාර්යබහුලයි හෝ Cooldown වී ඇත.'}\n\n`;
                resultMsg += `_💡 කරුණාකර වෙනත් සර්වර් එකක් උත්සාහ කරන්න._\n`;
                await socket.sendMessage(sender, { react: { text: '⚠️', key: msg.key } });
            }

            resultMsg += `\n*⚠️ අවවාදයයි:* \nමෙම බොට් ට්‍රැෆික් භාවිතය හේතුවෙන් ඔබගේ TikTok ගිණුම Shadowban වීමේ අවදානමක් ඇත. වගකීමෙන් භාවිතා කරන්න!\n\n`;
            resultMsg += `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

            await reply(resultMsg);

        } catch (error) {
            console.error("[TIKTOK BOOST ERROR]:", error.message);
            await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
            
            let errMsg = error.response?.data?.message || error.message;
            await reply(`❌ *සර්වර් දෝෂයකි!*\n\nAPI සර්වර් එක අක්‍රිය වී ඇත.\n_හේතුව: ${errMsg}_`);
        }
    }
};
