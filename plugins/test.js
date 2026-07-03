const axios = require('axios');

// සර්ච් රිසල්ට් තියාගන්න Global Object එක (මුලින්ම හදනවා)
if (!global.xnxxContexts) global.xnxxContexts = {};

module.exports = {
    name: "xnxx-search",
    category: 1, // 1 කියන්නේ 'Download Menu' එකට වැටෙන්න
    description: "Search XNXX and get a numbered list",
    commands: ["xxx", "xlist", "xsearch2"],
    
    handler: async ({ socket, msg, sender, args, reply }) => {
        let query = args.join(' ');
        if (!query && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation) {
            query = msg.message.extendedTextMessage.contextInfo.quotedMessage.conversation;
        } else if (!query && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text) {
            query = msg.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage.text;
        }

        if (!query) return reply("*කරුණාකර සෙවිය යුතු පදයක් ඇතුළත් කරන්න! (උදා: .xxx sri lanka)*");

        try { await socket.sendMessage(sender, { react: { text: '🔎', key: msg.key } }); } catch (_) {}
        
        try {
            const searchUrl = `https://api.zanta-mini.store/api/xnxx/search?apiKey=zan_FIAO7Ayh_eo1vllkep6&url=${encodeURIComponent(query)}`;
            const searchResponse = await axios.get(searchUrl);
            
            const results = searchResponse.data?.results;
            
            if (!results || results.length === 0) {
                try { await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } }); } catch (_) {}
                return reply("_ප්‍රතිඵල කිසිවක් හමු වුණේ නැත!_");
            }

            let listText = `🔥 *SADEW-MD SEARCH* 🔥\n\n\`\`\`Query: ${query}\`\`\`\n\n`;
            
            let limitedResults = results.slice(0, 15);
            limitedResults.forEach((video, index) => {
                listText += `*${index + 1}.* ${video.title}\n\n`;
            });
            
            listText += `_💡 වීඩියෝ එක ලබා ගැනීමට අදාළ අංකය මෙම පණිවිඩයට Reply කරන්න. (1 - 15)_`;

            const firstThumbnail = limitedResults[0]?.thumbnail;
            let sentMsg;

            if (firstThumbnail) {
                sentMsg = await socket.sendMessage(sender, { image: { url: firstThumbnail }, caption: listText }, { quoted: msg });
            } else {
                sentMsg = await socket.sendMessage(sender, { text: listText }, { quoted: msg });
            }
            
            try { await socket.sendMessage(sender, { react: { text: '📑', key: msg.key } }); } catch (_) {}

            // රිසල්ට් එකයි මැසේජ් ID එකයි සේව් කරගන්නවා
            global.xnxxContexts[sender] = { 
                quotedId: sentMsg.key.id, 
                results: limitedResults
            };

            // විනාඩි 10කින් මැකෙන්න දානවා (Memory පිරෙන්නේ නැති වෙන්න)
            setTimeout(() => {
                if (global.xnxxContexts[sender]) delete global.xnxxContexts[sender];
            }, 10 * 60 * 1000);

        } catch (error) {
            console.error("XNXX Search Error:", error);
            try { await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } }); } catch (_) {}
            reply(`_Error: ${error.message || error}_`);
        }
    }
};
