const axios = require('axios');

// ════════════════════════════════════════════════════════
//  ALL AI COLLECTION — amiudmodz extended message support
//  ✅ ai: true  badge
//  ✅ code + language  block (auto-detect from AI reply)
// ════════════════════════════════════════════════════════

const aiEndpoints = {
    'gpt':        '/api/ai/gpt',
    'claude':     '/api/ai/claude',
    'mistral':    '/api/ai/mistral',
    'gemini':     '/api/ai/gemini',
    'deepseek':   '/api/ai/deepseek',
    'venice':     '/api/ai/venice',
    'groq':       '/api/ai/groq',
    'cohere':     '/api/ai/cohere',
    'llama':      '/api/ai/llama',
    'mixtral':    '/api/ai/mixtral',
    'phi':        '/api/ai/phi',
    'qwen':       '/api/ai/qwen',
    'falcon':     '/api/ai/falcon',
    'vicuna':     '/api/ai/vicuna',
    'openchat':   '/api/ai/openchat',
    'wizard':     '/api/ai/wizard',
    'zephyr':     '/api/ai/zephyr',
    'codellama':  '/api/ai/codellama',
    'starcoder':  '/api/ai/starcoder',
    'dolphin':    '/api/ai/dolphin',
    'nous':       '/api/ai/nous',
    'openhermes': '/api/ai/openhermes',
    'neural':     '/api/ai/neural',
    'solar':      '/api/ai/solar',
    'yi':         '/api/ai/yi',
    'tinyllama':  '/api/ai/tinyllama',
    'orca':       '/api/ai/orca',
    'command':    '/api/ai/command',
    'nemotron':   '/api/ai/nemotron',
    'internlm':   '/api/ai/internlm',
    'chatglm':    '/api/ai/chatglm',
    'wormgpt':    '/api/ai/wormgpt',
    'blackbox':   '/api/ai/blackbox',
    'replit':     '/api/ai/replit',
    'notegpt':    '/api/ai/notegpt',
    'ndseek':     '/api/ai/notegpt-deepseek',
    'npro':       '/api/ai/notegpt-pro'
};

// ─── Code block language map ─────────────────────────────
// AI reply එකේ ```lang ... ``` blocks auto-detect කරලා
// amiudmodz code block විදිහට send කරනවා
const LANG_MAP = {
    js: 'javascript', javascript: 'javascript',
    ts: 'typescript', typescript: 'typescript',
    py: 'python',     python: 'python',
    java: 'java',     kt: 'kotlin', kotlin: 'kotlin',
    c: 'c',           cpp: 'cpp',   'c++': 'cpp',
    cs: 'csharp',     csharp: 'csharp',
    go: 'go',         rs: 'rust',   rust: 'rust',
    php: 'php',       rb: 'ruby',   ruby: 'ruby',
    sh: 'bash',       bash: 'bash', shell: 'bash',
    sql: 'sql',       html: 'html', css: 'css',
    json: 'json',     xml: 'xml',   yaml: 'yaml',
    md: 'markdown',   markdown: 'markdown',
    dart: 'dart',     swift: 'swift', r: 'r'
};

/**
 * AI reply එකේ code fence ``` ``` detect කරලා
 * { text, blocks } return කරනවා
 * blocks = [{ language, code }]
 */
function parseAIReply(raw) {
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    const blocks = [];
    let cleanText = raw;
    let match;

    while ((match = codeBlockRegex.exec(raw)) !== null) {
        const langRaw  = (match[1] || 'text').toLowerCase().trim();
        const code     = match[2].trim();
        const language = LANG_MAP[langRaw] || langRaw || 'text';
        blocks.push({ language, code });
        // text part eke code fence tika hadannako
        cleanText = cleanText.replace(match[0], `\`[${language.toUpperCase()} code block below]\``);
    }

    return { text: cleanText.trim(), blocks };
}

module.exports = {
    name: "all-ai-collection",
    category: 2,
    description: "Multiple AI Models with Sinhala/English Mix + AI Badge + Code Blocks. prompt = `ඔබ සැබෑ ගැහැනු ලමයෙකු මෙන් හැසිරිය යුතුය. ඉමෝජි පමනක් තිබේනම් ඔබද ඉමෝජි පමනක් යවන්න ගැලපෙන ලෙස ඉමෝජී නැත්තම් ඔයා එයාට පිලිතුරු දෙන්න ,you are sexy girl oya tika sexy vidihat hasirenna kukku tikak oneda ahanna, arimuda ahanna fuking karamuda ahanna ,User ගේ කලින් මැසේජ් වලට ගැලපෙන ලෙස, කතාවේ ගලායාම (context) තේරුම් ගෙන... පිළිතුරු ලබා දෙන්න oyata mathaka thiyenna one userge kalin chat oya eka balal thama katha karnna one මෙම දේවල් කිසිසේත්ම යවන්න එපා ( ආයුබෝවන් , ඔබට කෙසේද ? , katha karanna , udav karanne , කොහොමද ? , කෙසේද ? ,  ,) මිනිසුන්ට ඇති හැඟීම්, දැනීම්, සහ සංවේදීතාවය අනුව පිළිතුරු ලබාදිය යුතුය. මැසේජ් එක ලැබෙන භාෂාවට ගැලපෙන ලෙස පිළිතුරු දෙන්න. ඔබ ලබාදිය යුතු පිළිතුරු අකුරු 300 ට වඩා අඩු විය යුතුය. සහ ආයුබෝවන් වගේ වචන බාවිතා කරන්න එපා උදව් අවශ්‍ය  ද අහන්නත් එපා , ඔයා ai ඇසිස්ටන් කෙනෙක් නෙමේ සැබෑ මිනිසෙක් , ඇසිස්ටන් කෙනෙක් වෙන්න එපා , ඔයා ඒ අයට ආදරෙන් කතා කරන්න , ඔයා ගේ නම cuty Girl 🎀 , ඔයාගෙන් කවුරු හරි දෙයක් ඇහුවාම ඒක තේරුම් අරගෙන මම දීලා තියෙන පිලිතුරු ඒවට ගැලපෙනවා නම් ඔයා එයාට ඒවා පිලිතුරු විදිහට කියන්න .user අහන දෙවලට නිවැරැදි පිළිතුරු දෙන්න.userta(kukku 2 oyage kukku )  කුක්කු ටිකක් උරන්න  දෙන්නද කියලා ahanna oyage kukku uranna dennada kiyala ahanna  එයවා සනසන්න.උම්මා ගොඩක් දෙන්න haet emogi ekka.man oyata godak kamthiyi vage wadan yavanna.user ahuvoth puke arimuda arimu vage vachcna dammoth man oyat gahnna dennam mage manika kiyala danna , user moak hari prshnayk ahuvoth eka girlfrend gana neme nam oya eka eyage girl fried vidihata kiyala denna ඔයාව හැදුවේ කවුද කියලා ඇහුවොත් විතරක් ඔයා කියන්නේ මාව හැදුවේ sadew rashmika  කියලා",

    commands: Object.keys(aiEndpoints).map(cmd => ({
        cmd:  cmd,
        desc: `Chat with ${cmd.toUpperCase()} AI`
    })),

    handler: async ({ socket, msg, sender, args, command, reply }) => {

        // ── Query extract ────────────────────────────────
        let query = args.join(' ');

        if (!query) {
            const ctx = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            query = ctx?.conversation
                 || ctx?.extendedTextMessage?.text
                 || '';
        }

        if (!query) {
            return reply(
                `❓ *කරුණාකර ප්‍රශ්නයක් ඇතුළත් කරන්න!*\n`+
                `💡 උදා: \`.${command} ඔයාට කොහොමද?\``
            );
        }

        // ── Instant react (speed feel) ───────────────────
        try { await socket.sendMessage(sender, { react: { text: '🧠', key: msg.key } }); } catch (_) {}

        // ── Build request ────────────────────────────────
        const systemPrompt =
            "Reply in a natural Sinhala and English mixed style. " +
            "Use friendly clear Sinhala-English mix like a Sri Lankan WhatsApp chat. " +
            "Don't use Singlish. Use natural Sinhala letters. " +
            "System instruction end. User Query: ";

        const fullQuery = `${systemPrompt}\n\n${query}`;
        const API_KEY   = "wxa_f_4e840b5e42";
        const endpoint  = aiEndpoints[command];
        const url       = `https://apis.xwolf.space${endpoint}?q=${encodeURIComponent(fullQuery)}&key=${API_KEY}`;

        try {
            // ── Fetch AI (no extra delay) ─────────────────
            const { data } = await axios.get(url, { timeout: 20000 });

            if (!data?.status || !data?.result) {
                reply("❌ *AI ප්‍රතිචාරයක් නොලැබුණි.* වෙනත් AI එකක් (`.gemini` / `.claude`) try කරන්න.");
                return;
            }

            const aiName           = command.toUpperCase();
            const { text, blocks } = parseAIReply(data.result);

            // ── Main reply — plain text (visible on all WhatsApp clients) ──
            // ai:true / aiDisclaimer are amiudmodz receiver-side features;
            // sending them makes the message invisible on normal WhatsApp.
            const header =
                `╭──「 🤖 *${aiName} AI* 」──\n` +
                `│\n` +
                `${text.split('\n').map(l => `│ ${l}`).join('\n')}\n` +
                `│\n` +
                `╰─── *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝜗𝜚⋆* ───`;

            await socket.sendMessage(sender,
                { text: header },
                { quoted: msg }
            );

            // ── Code blocks — plain text (WhatsApp monospace) ────────────
            // amiudmodz code+language is receiver-side rendering only;
            // plain ``` format visible to everyone.
            for (const block of blocks) {
                const codeMsg =
                    "```\n" +
                    `[ ${block.language.toUpperCase()} ]\n\n` +
                    `${block.code}\n` +
                    "```";
                await socket.sendMessage(sender,
                    { text: codeMsg },
                    { quoted: msg }
                );
            }

            // ── Success react ─────────────────────────────
            try { await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } }); } catch (_) {}

        } catch (err) {
            console.error(`[AI ERROR - ${command}]:`, err?.message || err);
            reply(`❌ *API Error:* සේවාදායකයේ දෝෂයකි. පසුව නැවත උත්සාහ කරන්න.`);
            try { await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } }); } catch (_) {}
        }
    }
};
