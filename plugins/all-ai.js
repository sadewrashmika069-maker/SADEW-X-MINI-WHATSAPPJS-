const axios = require('axios');

// 🔥 ඔක්කොම AI ලින්ක් ටිකයි, ඒවට අදාළ කෙටි කමාන්ඩ් (Short Commands) ටිකයි මෙතන තියෙනවා.
const aiEndpoints = {
    'gpt': '/api/ai/gpt',
    'claude': '/api/ai/claude',
    'mistral': '/api/ai/mistral',
    'gemini': '/api/ai/gemini',
    'deepseek': '/api/ai/deepseek',
    'venice': '/api/ai/venice',
    'groq': '/api/ai/groq',
    'cohere': '/api/ai/cohere',
    'llama': '/api/ai/llama',
    'mixtral': '/api/ai/mixtral',
    'phi': '/api/ai/phi',
    'qwen': '/api/ai/qwen',
    'falcon': '/api/ai/falcon',
    'vicuna': '/api/ai/vicuna',
    'openchat': '/api/ai/openchat',
    'wizard': '/api/ai/wizard',
    'zephyr': '/api/ai/zephyr',
    'codellama': '/api/ai/codellama',
    'starcoder': '/api/ai/starcoder',
    'dolphin': '/api/ai/dolphin',
    'nous': '/api/ai/nous',
    'openhermes': '/api/ai/openhermes',
    'neural': '/api/ai/neural',
    'solar': '/api/ai/solar',
    'yi': '/api/ai/yi',
    'tinyllama': '/api/ai/tinyllama',
    'orca': '/api/ai/orca',
    'command': '/api/ai/command',
    'nemotron': '/api/ai/nemotron',
    'internlm': '/api/ai/internlm',
    'chatglm': '/api/ai/chatglm',
    'wormgpt': '/api/ai/wormgpt',
    'blackbox': '/api/ai/blackbox',
    'replit': '/api/ai/replit',
    'notegpt': '/api/ai/notegpt',
    'ndseek': '/api/ai/notegpt-deepseek', 
    'npro': '/api/ai/notegpt-pro'         
};

module.exports = {
    name: "all-ai-collection",
    category: 2, 
    description: "Multiple AI Models with Sinhala/English Mix",

    commands: Object.keys(aiEndpoints).map(cmd => ({
        cmd: cmd,
        desc: `Chat with ${cmd.toUpperCase()} AI Model`
    })),

    handler: async ({ socket, msg, sender, args, command, reply }) => {
        let query = args.join(' ');

        if (!query && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation) {
            query = msg.message.extendedTextMessage.contextInfo.quotedMessage.conversation;
        } else if (!query && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text) {
            query = msg.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage.text;
        }

        if (!query) {
            return reply(`❓ *කරුණාකර ප්‍රශ්නයක් ඇතුළත් කරන්න!*\n💡 උදා: \`.${command} ඔයාට කොහොමද?\``);
        }

        try { await socket.sendMessage(sender, { react: { text: '🧠', key: msg.key } }); } catch (_) {}

        // 🔥 1. AI එක හිතන ගමන් ඉද්දි උඩින් 'Typing...' කියලා පෙන්නන කෑල්ල මෙතනට ඇඩ් කළා
        await socket.sendPresenceUpdate('composing', sender);

        const systemPrompt = "Reply in a natural Sinhala and English mixed style.nutural sinhala kind friendly sinhala latters.don'tUse singlish.use friendly clear Sinhala-English mix like a Sri Lankan WhatsApp chat. System instruction end. User Query: ";
        const fullQuery = `${systemPrompt} \n\n${query}`;

        const endpoint = aiEndpoints[command];
        const API_KEY = "wxa_f_4e840b5e42";
        const url = `https://apis.xwolf.space${endpoint}?q=${encodeURIComponent(fullQuery)}&key=${API_KEY}`;

        try {
            const response = await axios.get(url);
            const data = response.data;

            if (data && data.status && data.result) {
                const aiName = command.toUpperCase();

                let replyText = `*↳ ❝ [🧠 ${aiName} 𝗔𝗜 ] ¡! ❞*\n\n`;
                replyText += `${data.result}\n\n`;
                replyText += `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                // 🔥 2. අලුත් AI Badge එකත් එක්ක මැසේජ් එක යවන විදිහ මෙතන හැදුවා
                await socket.sendMessage(sender, { 
                    text: replyText,
                    ai: true // ඔරිජිනල් AI ලාංඡනය වැටෙන්න මේකයි ඕනේ!
                }, { quoted: msg });
                
                try { await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } }); } catch (_) {}
            } else {
                reply("❌ *AI ප්‍රතිචාරයක් නොලැබුණි. කරුණාකර වෙනත් AI එකක් (උදා: .gemini හෝ .claude) භාවිතා කරන්න.*");
            }
        } catch (err) {
            console.error(`[AI ERROR - ${command}]:`, err);
            reply(`❌ *API Error:* සේවාදායකයේ දෝෂයකි. පසුව නැවත උත්සාහ කරන්න.`);
            try { await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } }); } catch (_) {}
        }
    }
};