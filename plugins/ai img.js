const axios = require('axios');

// 🔥 API එකේ Method එක සහ Parameter එක ගාණට වෙන් කරලා
const imageEndpoints = {
    'dalle': { path: '/api/ai/image/dall-e', method: 'POST', param: 'prompt' },
    'pixabay': { path: '/api/ai/image/pixabay', method: 'GET', param: 'q' },
    'picsum': { path: '/api/ai/image/lorem-picsum', method: 'GET', param: null },
    'flickr': { path: '/api/ai/image/lorem-flickr', method: 'GET', param: 'q' }, // මේකටත් ප්‍රොම්ප්ට් එකක් ඕනේ
    'dog': { path: '/api/ai/image/dog', method: 'GET', param: null },
    'cat': { path: '/api/ai/image/cat', method: 'GET', param: null },
    'bingimg': { path: '/api/ai/image/bing', method: 'POST', param: 'prompt' }
};

module.exports = {
    name: "ai-image-generator",
    category: 9, 
    description: "Generate and search images using AI",
    
    commands: Object.keys(imageEndpoints).map(cmd => ({
        cmd: cmd,
        desc: `Get images using ${cmd.toUpperCase()}`
    })),

    handler: async ({ socket, msg, sender, args, command, reply }) => {
        let query = args.join(' ');

        if (!query && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation) {
            query = msg.message.extendedTextMessage.contextInfo.quotedMessage.conversation;
        } else if (!query && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text) {
            query = msg.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage.text;
        }

        const apiConfig = imageEndpoints[command];

        // API එකට විස්තරයක් (Param) ඕනෙම නම් සහ Query එකක් දීලා නැත්නම්
        if (apiConfig.param && !query) {
            return reply(`❓ *කරුණාකර Image එක සඳහා විස්තරයක් ඇතුළත් කරන්න!*\n💡 උදා: \`.${command} a beautiful sunset\``);
        }

        try { await socket.sendMessage(sender, { react: { text: '🖼️', key: msg.key } }); } catch (_) {}

        const API_KEY = "wxa_f_4e840b5e42";
        let url = `https://apis.xwolf.space${apiConfig.path}?key=${API_KEY}`;
        
        // URL එකට අදාළ Parameter එක (q හෝ prompt) දානවා
        if (apiConfig.param && query) {
            url += `&${apiConfig.param}=${encodeURIComponent(query)}`;
        }

        // Picsum සහ Flickr වලට පළල සහ උස ඔටෝම දාමු (ලස්සනට එන්න)
        if (command === 'picsum' || command === 'flickr') {
            url += '&width=800&height=600';
        }

        try {
            let response;
            
            // 🔥 GET ද POST ද කියලා බලලා රික්වෙස්ට් එක යවනවා
            if (apiConfig.method === 'POST') {
                response = await axios.post(url, query ? { [apiConfig.param]: query } : {});
            } else {
                response = await axios.get(url);
            }

            const data = response.data;

            // 🔥 API එකෙන් එවන විදිහ කොහොම වුණත් Image URL එක අල්ලගන්න Smart Logic එක
            let imageUrl = null;
            if (data.url && typeof data.url === 'string') {
                imageUrl = data.url; // dall-e, bing
            } else if (data.image && typeof data.image === 'string') {
                imageUrl = data.image; // cat API
            } else if (data.image && data.image.url) {
                imageUrl = data.image.url; // picsum, flickr
            } else if (data.featured) {
                imageUrl = data.featured; // pixabay fallback
            } else if (data.images && Array.isArray(data.images) && data.images.length > 0) {
                imageUrl = data.images[0].url || data.images[0]; // pixabay
            } else if (data.result && typeof data.result === 'string') {
                imageUrl = data.result;
            }

            // අන්තිමට URL එකක් සෙට් වුණාද බලනවා
            if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) { 
                const aiName = command.toUpperCase();
                
                let captionText = `*↳ ❝ [🖼️ ${aiName} 𝗜𝗠𝗔𝗚𝗘𝗦 ] ¡! ❞*\n\n`;
                if (query && apiConfig.param) captionText += `*✨ Prompt:* _${query}_\n\n`;
                captionText += `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                await socket.sendMessage(sender, { 
                    image: { url: imageUrl }, 
                    caption: captionText 
                }, { quoted: msg });
                
                try { await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } }); } catch (_) {}
            } else {
                reply(`❌ *Image එක ලබා ගැනීමට නොහැකි විය!*\n\n_Server Response: ${JSON.stringify(data).slice(0, 80)}..._`);
                try { await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } }); } catch (_) {}
            }
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message;
            console.log(`[IMAGE API ERROR - ${command}]:`, errorMsg);
            
            reply(`❌ *API Error:* ${errorMsg}\n\nකරුණාකර පසුව නැවත උත්සාහ කරන්න.`);
            try { await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } }); } catch (_) {}
        }
    }
};
