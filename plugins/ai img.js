const axios = require('axios');

// ඔක්කොම Image API ටික සහ ඒවට දාන කෙටි කමාන්ඩ්
const imageEndpoints = {
    'dalle': '/api/ai/image/dall-e',
    'pixabay': '/api/ai/image/pixabay',
    'picsum': '/api/ai/image/lorem-picsum',
    'flickr': '/api/ai/image/lorem-flickr',
    'dog': '/api/ai/image/dog',
    'cat': '/api/ai/image/cat',
    'bingimg': '/api/ai/image/bing'
};

module.exports = {
    name: "ai-image-generator",
    category: 9, // 🔥 මේක තමයි අලුත් මෙනු එකේ අංකය (9)
    description: "Generate and search images using AI",
    
    // මෙනු එකට ඔටෝම Description එක්ක ඇඩ් වෙන්න
    commands: Object.keys(imageEndpoints).map(cmd => ({
        cmd: cmd,
        desc: `Get images using ${cmd.toUpperCase()}`
    })),

    handler: async ({ socket, msg, sender, args, command, reply }) => {
        let query = args.join(' ');

        // Reply කරපු මැසේජ් එකක් තියෙනම් ඒක අල්ලගන්නවා
        if (!query && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation) {
            query = msg.message.extendedTextMessage.contextInfo.quotedMessage.conversation;
        } else if (!query && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text) {
            query = msg.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage.text;
        }

        // Dog සහ Cat API වලට ප්‍රොම්ප්ට් එකක් නැතත් වැඩ, අනිත් ඒවට අනිවාර්යයි
        if (!query && !['dog', 'cat'].includes(command)) {
            return reply(`❓ *කරුණාකර Image එක සඳහා විස්තරයක් ඇතුළත් කරන්න!*\n💡 උදා: \`.${command} a cyber futuristic city in neon colors\``);
        }

        try { await socket.sendMessage(sender, { react: { text: '🖼️', key: msg.key } }); } catch (_) {}

        const endpoint = imageEndpoints[command];
        const API_KEY = "wxa_f_4e840b5e42";
        let url = `https://apis.xwolf.space${endpoint}?key=${API_KEY}`;
        
        // ප්‍රොම්ප්ට් එකක් තියෙනම් URL එකට එකතු කරනවා
        if (query) {
            url += `&prompt=${encodeURIComponent(query)}`;
        }

        try {
            const response = await axios.get(url);
            const data = response.data;

            // API එකෙන් Image URL එක සාර්ථකව ආවොත්
            if (data && data.success && data.url) {
                const aiName = command.toUpperCase();
                
                let captionText = `*↳ ❝ [🖼️ ${aiName} 𝗜𝗠𝗔𝗚𝗘𝗦 ] ¡! ❞*\n\n`;
                if (query) captionText += `*✨ Prompt:* _${query}_\n\n`;
                captionText += `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                // පින්තූරය යවනවා
                await socket.sendMessage(sender, { 
                    image: { url: data.url }, 
                    caption: captionText 
                }, { quoted: msg });
                
                try { await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } }); } catch (_) {}
            } else {
                reply("❌ *Image එක ලබා ගැනීමට නොහැකි විය. කරුණාකර වෙනත් ප්‍රොම්ප්ට් එකක් ලබා දෙන්න.*");
            }
        } catch (err) {
            console.error(`[IMAGE API ERROR - ${command}]:`, err);
            reply(`❌ *API Error:* සේවාදායකයේ දෝෂයකි. පසුව නැවත උත්සාහ කරන්න.`);
            try { await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } }); } catch (_) {}
        }
    }
};
