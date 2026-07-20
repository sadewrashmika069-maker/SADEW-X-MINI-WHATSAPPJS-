const axios = require('axios');

module.exports = {
    name: "cartoon",
    category: 1,
    description: "Search Sinhala cartoons",
    commands: ["cartoon"],
    
    handler: async ({ socket, msg, sender, command, args, reply }) => {
        const API_KEY = "zan_FIAO7Ayh_eo1vllkep6";
        const BASE_API = "https://api.zanta-mini.store/api/slcartoons";
        
        const query = args.join(' ').trim();
        if (!query) return reply("🎥 *කරුණාකර කාටූන් එකක නමක් ලබා දෙන්න!*\n💡 උදා: `.cartoon ben 10`");

        try {
            await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } });

            const searchUrl = `${BASE_API}/search?apiKey=${API_KEY}&text=${encodeURIComponent(query)}`;
            const { data } = await axios.get(searchUrl);

            if (!data.success || !data.results || data.results.length === 0) {
                await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                return reply("❌ *සමාවෙන්න, ඔබ සෙවූ කාටූනය සොයාගත නොහැකි විය!*");
            }

            const results = data.results.slice(0, 15); // උපරිම රිසල්ට්ස් 15යි
            
            // Global Variable එකකට සේව් කිරීම (Main file එකෙන් අල්ලගන්න)
            if (!global.cartoonSearch) global.cartoonSearch = {};
            global.cartoonSearch[sender] = results;

            let listText = `*🔍 SADEW-MINI CARTOON SEARCH*\n\n`;
            results.forEach((m, i) => {
                listText += `*${i + 1}.* ${m.title}\n🌟 *Rating:* ${m.rating} | 🎬 *Quality:* ${m.quality}\n\n`;
            });

            listText += `> *ඔබට අවශ්‍ය කාටූනයෙහි අංකය මෙම පණිවිඩයට Reply කරන්න.* 🔢`;

            const msgOpts = { caption: listText, footer: "👑 SADEW-MINI 👑" };
            if (results[0].thumbnail) msgOpts.image = { url: results[0].thumbnail };

            await socket.sendMessage(sender, msgOpts, { quoted: msg });
            await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

        } catch (e) {
            console.error("Cartoon Search Error:", e.message);
            reply(`❌ *සෙවුම් දෝෂයකි! (Error: ${e.message})*`);
        }
    }
};
