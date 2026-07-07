const axios = require("axios");

module.exports = {
    name: "fancy-fonts",
    category: 5, // Tools & Edits Category
    description: "ಸಾමාන්‍ය අකුරු Fancy Fonts බවට පත් කරන්න (Multi-API Fallback)",
    commands: ["fancy", "font", "style", "fancytext"],

    handler: async ({ socket, msg, sender, args, reply }) => {
        try {
            // 1. අකුරු ටික හොයාගැනීම (args වලින් හෝ රිප්ලයි කරපු මැසේජ් එකෙන්)
            let text = args.join(" ").trim();
            
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!text && quoted) {
                text = quoted.conversation || quoted.extendedTextMessage?.text || "";
            }

            if (!text) {
                return await reply(`✨ *Fancy Text Generator*\n\n*Usage:* .fancy <text>\n*Example:* .fancy Sadew`);
            }

            await socket.sendMessage(sender, { react: { text: "⏳", key: msg.key } });

            const query = encodeURIComponent(text);
            
            // 2. Multi-API Fallback Array එක
            const apis = [
                `https://apex-xx.vercel.app/api/fancy?text=${query}`,
                `https://bk9.fun/tools/fancy?text=${query}`,
                `https://api.vreden.my.id/api/fancytext?text=${query}`,
                `https://api.vreden.my.id/api/styletext?text=${query}`
            ];

            let fancyResult = null;

            for (let i = 0; i < apis.length; i++) {
                try {
                    console.log(`[Fancy] ට්‍රයි කරන්නේ API ${i + 1}: ${apis[i]}`);
                    const response = await axios.get(apis[i], { timeout: 15000 });
                    
                    if (response.status === 200 && response.data) {
                        let result = response.data.result || response.data.data || response.data;
                        if (result) {
                            fancyResult = result;
                            console.log(`[Fancy] API ${i + 1} එක සාර්ථකයි!`);
                            break; 
                        }
                    }
                } catch (error) {
                    console.log(`[Fancy] API ${i + 1} වැඩ කළේ නැහැ. ඊළඟ එක බලනවා...`);
                }
            }

            // කිසිම API එකක් වැඩ නොකළොත් මුල් ටෙක්ස්ට් එක දානවා
            if (!fancyResult) {
                fancyResult = text;
            }

            // 3. ලැබුණු දත්ත Baileys Crash නොවෙන විදිහට String එකක් බවට පත් කිරීම
            let finalOutput = "";

            if (Array.isArray(fancyResult)) {
                finalOutput = fancyResult.map(v => {
                    if (typeof v === 'object' && v !== null) {
                        return v.result || v.styled || v.text || Object.values(v)[0] || JSON.stringify(v);
                    }
                    return String(v);
                }).join('\n\n');
            } 
            else if (typeof fancyResult === 'object' && fancyResult !== null) {
                let styles = [];
                for (let key in fancyResult) {
                    if (typeof fancyResult[key] === 'string') {
                        styles.push(fancyResult[key]);
                    } else if (typeof fancyResult[key] === 'object' && fancyResult[key] !== null) {
                        let nestedVal = fancyResult[key].result || fancyResult[key].styled || Object.values(fancyResult[key])[0];
                        if (nestedVal) styles.push(String(nestedVal));
                    }
                }
                
                if (styles.length > 0) {
                    finalOutput = styles.join('\n\n');
                } else {
                    finalOutput = JSON.stringify(fancyResult, null, 2);
                }
            } 
            else {
                finalOutput = String(fancyResult);
            }

            // Sadew-Mini ලස්සන ෆුටර් එක එකතු කිරීම
            finalOutput += `\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

            // 4. WhatsApp එකට Message එක යැවීම
            await reply(finalOutput);
            await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

        } catch (e) {
            console.error("Fancy Command Error:", e);
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
            await reply("❌ Error එකක් ආවා මචං! කරුණාකර නැවත උත්සාහ කරන්න.");
        }
    }
};
