const axios = require("axios");

// පරණ චැට් මතක තියාගන්න Global Memory Object එක
if (!global.alyaChatMemory) global.alyaChatMemory = {};

module.exports = {
    name: "alya_ai",
    category: "ai",
    description: "Alya AI (100% Free - No API Key, No NPM Needed)",
    commands: ["alya"],
    on: "message",

    handler: async ({ socket, reply, msg, sender, args }) => {
        try {
            const query = args.join(" ").trim();
            
            if (!query) {
                return await reply("👋 හායි! මම ආලියා (Alya). ඔයාට මොනවා ගැනද දැනගන්න ඕනේ?");
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

            // මතකය සහ අලුත් ප්‍රශ්නය එකතු කරලා කතාව (Context) හදනවා
            let chatContext = SYSTEM_PROMPT + "\n\n";
            const history = global.alyaChatMemory[sender];
            for (const h of history) {
                chatContext += `${h.role === 'user' ? 'User' : 'Alya'}: ${h.content}\n`;
            }
            chatContext += `User: ${query}\nAlya:`;

            let aiReply = "";

            // 🔥 අලුත්ම ක්‍රමය: Free APIs 3ක් පාවිච්චි කරලා එකක් වැඩ නැත්නම් අනිත් එකෙන් ගන්නවා!
            try {
                // පළවෙනි ට්‍රයි එක (BK9 AI - පට්ට ස්පීඩ්)
                const res1 = await axios.get(`https://api.bk9.site/ai/gpt4?q=${encodeURIComponent(chatContext)}`, { timeout: 15000 });
                aiReply = res1.data.BK9 || res1.data.result;
            } catch (e1) {
                try {
                    // දෙවෙනි ට්‍රයි එක (YanzBotz AI)
                    const res2 = await axios.get(`https://api.yanzbotz.my.id/api/ai/gpt4?query=${encodeURIComponent(chatContext)}`, { timeout: 15000 });
                    aiReply = res2.data.result;
                } catch (e2) {
                    // තුන්වෙනි ට්‍රයි එක (ඔයාගේ Main file එකේ තිබ්බ xWolf API එක)
                    const res3 = await axios.get(`https://apis.xwolf.space/api/ai/chatgpt?q=${encodeURIComponent(chatContext)}&key=wxa_f_4e840b5e42`, { timeout: 15000 });
                    aiReply = res3.data.result || res3.data.response || res3.data.reply;
                }
            }

            if (!aiReply) throw new Error("All APIs are currently down!");

            // AI දුන්න උත්තරේ සෙන්ඩ් කරනවා
            await reply(aiReply);
            await socket.sendMessage(sender, { react: { text: '🎀', key: msg.key } });

            // 💾 ඊළඟ වතාවට මතක තියාගන්න, අලුත් චැට් එක Memory එකට සේව් කරනවා
            global.alyaChatMemory[sender].push({ role: 'user', content: query });
            global.alyaChatMemory[sender].push({ role: 'assistant', content: aiReply });

            // මතකය ඕනවට වඩා ලොකු වෙන එක නවත්තන්න, අන්තිම චැට් ටික විතරක් තියාගන්නවා
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