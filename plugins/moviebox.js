const axios = require('axios');

module.exports = {
    name: "moviebox",
    category: 1, // Download Menu
    description: "Search and download movies from MovieBox Pro",
    commands: ["moviepro", "mbpro", "moviebox"],

    handler: async ({ socket, msg, sender, args, reply }) => {
        const query = args.join(' ').trim();
        if (!query) {
            return reply("🎥 *කරුණාකර චිත්‍රපටයක නමක් ලබා දෙන්න!*\n💡 උදා: `.moviepro Inception`");
        }

        try {
            await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } });

            // API Key & Search URL
            const apikey = "frontoffice9876@gmail.com:vajira-88173";
            const searchUrl = `https://vajiraofc-apis.vercel.app/api/movieboxs?apikey=${apikey}&query=${encodeURIComponent(query)}&page=1&perPage=10`;

            const res = await axios.get(searchUrl, { timeout: 15000 });
            const items = res.data?.data?.items || [];

            if (!items || items.length === 0) {
                try { await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } }); } catch (_) {}
                return reply("❌ *සමාවෙන්න, චිත්‍රපටයක් සොයාගත නොහැකි විය!*");
            }

            // Global Tracker එකට ඩේටා සේව් කිරීම (Reply එක අල්ලගන්න)
            if (!global.movieBoxSearch) global.movieBoxSearch = {};
            global.movieBoxSearch[sender] = items;

            let listText = `*🔍 SADEW-MINI MOVIEBOX SEARCH*\n\n`;
            items.forEach((m, i) => {
                const year = m.releaseDate ? m.releaseDate.split('-')[0] : 'N/A';
                listText += `*${i + 1}.* ${m.title} (${year})\n`;
                listText += `⭐ IMDb: ${m.imdbRatingValue || 'N/A'} | 🎭 ${m.genre || 'N/A'}\n\n`;
            });

            listText += `> *ඔබට අවශ්‍ය චිත්‍රපටයට අදාළ අංකය (1-${items.length}) මෙම මැසේජ් එකට Reply කරන්න.*`;

            // පළවෙනි චිත්‍රපටයේ Thumbnail එකත් එක්ක යැවීම
            const firstCover = items[0]?.cover?.url;
            if (firstCover) {
                await socket.sendMessage(sender, { image: { url: firstCover }, caption: listText }, { quoted: msg });
            } else {
                await socket.sendMessage(sender, { text: listText }, { quoted: msg });
            }
            
            await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

        } catch (e) {
            console.error("MovieBox Search Error:", e.message);
            try { await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } }); } catch (_) {}
            reply("❌ *API දෝෂයකි! පසුව නැවත උත්සාහ කරන්න.*");
        }
    }
};
