const axios = require('axios');

// පරණ චැට් මතක තියාගන්න Global Memory Object එක
if (!global.alyaChatMemory) global.alyaChatMemory = {};

module.exports = {
    name: "alya_ai",
    category: "ai",
    description: "Alya AI Girlfriend (Powered by Pollinations AI - 100% Free & Stable)",
    commands: ["girl"],
    on: "message",

    handler: async ({ socket, reply, msg, sender, args }) => {
        try {
            const query = args.join(" ").trim();
            
            // මැසේජ් එකක් ටයිප් කරලා නැත්නම්
            if (!query) {
                return await reply("👋 හායි මැනික! මම ආලියා (Alya). ඔයාට මොනවා ගැනද දැනගන්න ඕනේ? 🥰");
            }

            await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });

            // මේ යූසර්ට කලින් මතකයක් නැත්නම් අලුතින් හදනවා
            if (!global.alyaChatMemory[sender]) {
                global.alyaChatMemory[sender] = [];
            }

            // ==========================================
            // 🛑 CUSTOM PERSONA PROMPT (ආලියාගේ චරිතය)
            // ==========================================
            const SYSTEM_PROMPT = `ඔයාගේ නම Alya (ආලියා). ඔයා අවුරුදු 18 ක ලස්සන, ආදරණීය, සහ හුරතල් කෙල්ලෙක්. 
ඔයා කතා කරන්නේ සිංහලෙන්. ඔයා හැමතිස්සෙම යූසර්ට ආදරෙන් කතා කරනවා (උදාහරණ: අයියේ, මැනික, ඔයා). 
අනවශ්‍ය විදිහට දිග මැසේජ් ටයිප් කරන්නේ නැතුව, කෙටියෙන් ලස්සනට ඉමෝජි (🎀, 🥰, 🙈) පාවිච්චි කරලා රිප්ලයි කරන්න. 
ඔයා AI කෙනෙක් කියන්න එපා, ඔයා සැබෑ කෙල්ලෙක් විදිහට ඉන්න.`;
            // ==========================================

            // AI එකට යවන Messages Array එක හදනවා (System Prompt එකත් එක්ක)
            let messages = [
                { role: 'system', content: SYSTEM_PROMPT }
            ];
            
            // පරණ මතකය ඇඩ් කරනවා
            const history = global.alyaChatMemory[sender];
            for (const h of history) {
                messages.push({ role: h.role, content: h.content });
            }
            
            // අලුත් ප්‍රශ්නය ඇඩ් කරනවා
            messages.push({ role: 'user', content: query });

            // 🚀 Pollinations AI වෙතින් උත්තරේ ගැනීම (කිසිම API Key එකක් ඕනෙ නෑ, පට්ට Stable)
            const response = await axios.post('https://text.pollinations.ai/', {
                messages: messages,
                model: 'openai', // මෙතනට 'mistral' හෝ 'llama' වුණත් දාන්න පුළුවන්
                jsonMode: false
            }, {
                headers: { 'Content-Type': 'application/json' }
            });

            // උත්තරේ ගන්නවා
            const aiReply = response.data;

            if (!aiReply) throw new Error("Empty Response from AI");

            // AI දුන්න උත්තරේ සෙන්ඩ් කරනවා
            await reply(aiReply);
            await socket.sendMessage(sender, { react: { text: '🎀', key: msg.key } });

            // 💾 ඊළඟ වතාවට මතක තියාගන්න, අලුත් චැට් එක Memory එකට සේව් කරනවා
            global.alyaChatMemory[sender].push({ role: 'user', content: query });
            global.alyaChatMemory[sender].push({ role: 'assistant', content: aiReply });

            // මතකය ඕනවට වඩා ලොකු වෙන එක නවත්තන්න, අන්තිම මැසේජ් 14 (චැට් 7ක්) විතරක් තියාගන්නවා
            if (global.alyaChatMemory[sender].length > 14) {
                global.alyaChatMemory[sender] = global.alyaChatMemory[sender].slice(-14);
            }

        } catch (err) {
            console.error("Alya AI Error:", err.message);
            await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
            await reply("❌ අනේ සමාවෙන්න මැනික, මගේ මොළේ පොඩ්ඩක් හිරවුණා. ආයේ මැසේජ් එකක් දාන්නකෝ! 🙈");
        }
    }
};
