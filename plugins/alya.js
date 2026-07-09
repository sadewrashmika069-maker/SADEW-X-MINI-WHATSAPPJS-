const { Hercai } = require('hercai');
const herc = new Hercai();

// පරණ චැට් මතක තියාගන්න Global Memory Object එක
if (!global.alyaChatMemory) global.alyaChatMemory = {};

module.exports = {
    name: "alya_ai",
    category: "ai",
    description: "Alya AI with Custom Prompt & Chat Memory",
    commands: ["alya"],
    on: "message",

    handler: async ({ socket, reply, msg, sender, args }) => {
        try {
            const query = args.join(" ").trim();
            
            // මැසේජ් එකක් ටයිප් කරලා නැත්නම්
            if (!query) {
                return await reply("👋 හායි! මම ආලියා (Alya). ඔයාට මොනවා ගැනද දැනගන්න ඕනේ?");
            }

            await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });

            // මේ යූසර්ට කලින් මතකයක් නැත්නම් අලුතින් හදනවා
            if (!global.alyaChatMemory[sender]) {
                global.alyaChatMemory[sender] = [];
            }

            // ==========================================
            // 🛑 CUSTOM PERSONA PROMPT (මෙතන ඔයාට ඕනේ විදිහට වෙනස් කරන්න)
            // ==========================================
            const SYSTEM_PROMPT = `ඔයාගේ නම Alya (ආලියා). ඔයා අවුරුදු 18 ක ලස්සන, ආදරණීය, සහ හුරතල් කෙල්ලෙක්. 
ඔයා කතා කරන්නේ සිංහලෙන්. ඔයා හැමතිස්සෙම යූසර්ට ආදරෙන් කතා කරනවා (උදාහරණ: අයියේ, මැනික, ඔයා). 
අනවශ්‍ය විදිහට දිග මැසේජ් ටයිප් කරන්නේ නැතුව, කෙටියෙන් ලස්සනට ඉමෝජි (🎀, 🥰, 🙈) පාවිච්චි කරලා රිප්ලයි කරන්න. 
ඔයා AI කෙනෙක් කියන්න එපා, ඔයා සැබෑ කෙල්ලෙක් විදිහට ඉන්න.`;
            // ==========================================

            // මතකය සහ අලුත් ප්‍රශ්නය එකතු කරලා කතාව (Context) හදනවා
            let chatContext = SYSTEM_PROMPT + "\n\n";
            
            // අන්තිමට යවපු මැසේජ් 10 විතරක් ගන්නවා (Memory ලොකු වැඩිවෙන එක නවත්තන්න)
            const history = global.alyaChatMemory[sender];
            for (const h of history) {
                chatContext += `${h.role === 'user' ? 'User' : 'Alya'}: ${h.content}\n`;
            }
            
            // අලුත් මැසේජ් එක කතාවට අමුණනවා
            chatContext += `User: ${query}\nAlya:`;

            // Hercai AI එකෙන් උත්තරේ ගන්නවා (v3 model එක)
            const response = await herc.question({ model:"v3-32k", content: chatContext });
            const aiReply = response.reply;

            if (!aiReply) throw new Error("AI Reply is empty");

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