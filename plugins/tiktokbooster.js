const axios = require('axios');

module.exports = {
    name: "tiktok-booster",
    category: 5, 
    description: "Boost TikTok Views/Likes/Followers using SMM APIs",
    commands: ["ttboost", "tiktokboost", "boosttt", "tview"],

    handler: async ({ socket, msg, sender, args, reply }) => {
        const input = args.join(" ").trim();

        // 1. ලින්ක් එක අල්ලගැනීම 
        const urlMatch = input.match(/(https?:\/\/(?:www\.)?(?:tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com)\/[^\s]+)/i);
        if (!urlMatch) {
            return reply(`🚀 *SADEW-MINI TIKTOK BOOSTER* 🚀\n\nකරුණාකර TikTok ලින්ක් එකක්, සර්වර් අංකයක් (1-5) සහ අවශ්‍ය සේවාව ලබා දෙන්න.\n\n💡 *උදාහරණ:*\n\`.ttboost https://vm.tiktok.com/xxxxxx 1\` (Views සඳහා)`);
        }
        
        let tiktokUrl = urlMatch[0];
        
        // 2. සර්වර් අංකය සහ Type එක අල්ලගැනීම
        const remainingInput = input.replace(tiktokUrl, "").toLowerCase();
        const numMatch = remainingInput.match(/[1-5]/);
        const serverNum = numMatch ? numMatch[0] : "1";

        let boostType = "views"; 
        if (remainingInput.includes("like")) boostType = "likes";
        else if (remainingInput.includes("share")) boostType = "shares";
        else if (remainingInput.includes("comment")) boostType = "comments";
        else if (remainingInput.includes("favorite")) boostType = "favorites";
        else if (remainingInput.includes("follower")) boostType = "followers";

        if (serverNum === "1" && boostType === "views") {
            boostType = "video_views";
        }

        try {
            await socket.sendMessage(sender, { react: { text: '🚀', key: msg.key } });

            // 🔥 AUTO LINK EXPANDER (කෙටි ලින්ක් දිගු කිරීම)
            if (tiktokUrl.includes("vm.tiktok.com") || tiktokUrl.includes("vt.tiktok.com")) {
                await reply(`🔄 _කෙටි ලින්ක් එකක් හඳුනාගත්තා. එය සම්පූර්ණ ලින්ක් එකක් බවට පත් කරමින් පවතී..._`);
                try {
                    const expandRes = await axios.get(tiktokUrl, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                    });
                    // Redirect වුණාට පස්සේ එන අන්තිම ලින්ක් එක ගන්නවා
                    tiktokUrl = expandRes.request.res.responseUrl || tiktokUrl;
                } catch (e) {
                    tiktokUrl = e.request?.res?.responseUrl || tiktokUrl;
                }
            }

            // ලින්ක් එකේ අග තියෙන අනවශ්‍ය කෑලි අයින් කරලා Clean කරනවා
            tiktokUrl = tiktokUrl.split("?")[0]; 
            
            await reply(`⚙️ _TikTok Boost Server ${serverNum} වෙත සම්බන්ධ වෙමින් පවතී..._\n🎯 *Target:* ${boostType.replace('_', ' ').toUpperCase()}`);

            let boostPath = serverNum === "1" ? "boost" : `boost${serverNum}`;
            let apiUrl = `https://apis.davidcyril.name.ng/api/tiktok/${boostPath}?url=${encodeURIComponent(tiktokUrl)}`;

            if (serverNum === "1" || serverNum === "4") {
                apiUrl += `&type=${boostType}`;
            }

            let data;
            try {
                const response = await axios.get(apiUrl, { timeout: 25000 });
                data = response.data;
            } catch (err) {
                if (err.response && err.response.data) {
                    data = err.response.data;
                } else {
                    throw err; 
                }
            }

            // 3. Responses හැසිරවීම
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
                
                if (data.message && data.message.toLowerCase().includes("banned")) {
                    resultMsg += `*💬 Reason:* API සර්වර් එකේ මෙම පහසුකම දැනට අවහිර (Banned) කර ඇත. (මෙය ඔබගේ ගිණුමේ දෝෂයක් නොවේ).\n\n`;
                } else {
                    resultMsg += `*💬 Reason:* ${data.message || 'සර්වර් එක කාර්යබහුලයි.'}\n\n`;
                }
                
                resultMsg += `_💡 කරුණාකර වෙනත් සර්වර් එකක් උත්සාහ කරන්න._\n`;
                await socket.sendMessage(sender, { react: { text: '⚠️', key: msg.key } });
            }

            resultMsg += `\n*⚠️ අවවාදයයි:* \nමෙම බොට් ට්‍රැෆික් භාවිතය හේතුවෙන් ඔබගේ TikTok ගිණුම Shadowban වීමේ අවදානමක් ඇත. වගකීමෙන් භාවිතා කරන්න!\n\n`;
            resultMsg += `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

            await reply(resultMsg);

        } catch (error) {
            console.error("[TIKTOK BOOST ERROR]:", error.message);
            await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
            await reply(`❌ *සර්වර් දෝෂයකි!*\n\nAPI සර්වර් එක අක්‍රිය වී ඇත.\n_හේතුව: ${error.message}_`);
        }
    }
};
