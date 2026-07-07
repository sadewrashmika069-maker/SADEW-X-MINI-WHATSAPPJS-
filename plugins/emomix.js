const axios = require("axios");
const sharp = require("sharp");

// ═══════ HELPER FUNCTIONS ═══════
function extractEmojis(text) {
    if (!text) return [];
    const emojiRegex = /\p{Extended_Pictographic}/gu;
    const emojis = text.match(emojiRegex) || [];
    return emojis.slice(0, 2);
}

async function getImageBufferFromUrl(url) {
    const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 15000,
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "image/png,image/webp,image/*,*/*"
        },
        validateStatus: (status) => status >= 200 && status < 400
    });

    const contentType = String(res.headers["content-type"] || "").toLowerCase();

    if (contentType.includes("application/json")) {
        const json = JSON.parse(Buffer.from(res.data).toString("utf8"));
        const imageUrl =
            json.url ||
            json.image ||
            json.result ||
            json.data?.url ||
            json.data?.image ||
            json.data?.result;

        if (!imageUrl) throw new Error("JSON response එකේ image URL එකක් නෑ");
        return await getImageBufferFromUrl(imageUrl);
    }

    return Buffer.from(res.data);
}

async function makeStickerBuffer(imageBuffer) {
    return await sharp(imageBuffer)
        .resize(512, 512, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .webp({ quality: 90 })
        .toBuffer();
}

function buildEmojiMixUrls(emoji1, emoji2) {
    const e1 = encodeURIComponent(emoji1);
    const e2 = encodeURIComponent(emoji2);

    return [
        `https://emojik.vercel.app/s/${e1}_${e2}?size=512`,
        `https://emojik.vercel.app/s/${e2}_${e1}?size=512`,
        `https://emoji-kitchen.vercel.app/api/kitchen?emoji1=${e1}&emoji2=${e2}`,
        `https://emoji-kitchen.vercel.app/api/kitchen?emoji1=${e2}&emoji2=${e1}`,
        `https://emojimix-api.vercel.app/api/${e1}+${e2}`,
        `https://emojimix-api.vercel.app/api/${e2}+${e1}`,
        `https://tikolu.net/emojimix/${e1}+${e2}`,
        `https://tikolu.net/emojimix/${e2}+${e1}`
    ];
}

async function fetchEmojiMix(emoji1, emoji2) {
    const urls = buildEmojiMixUrls(emoji1, emoji2);
    let lastError = null;

    for (const url of urls) {
        try {
            const imageBuffer = await getImageBufferFromUrl(url);
            if (imageBuffer && imageBuffer.length > 1000) {
                return imageBuffer;
            }
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError || new Error("Emoji mix එක හදාගන්න බැරි වුණා");
}

// ═══════ PLUGIN EXPORT ═══════
module.exports = {
    name: "emoji-mixer",
    category: 5, // Tools & Edits Category එක
    description: "Emoji දෙකක් mix කරලා sticker එකක් හදන්න",
    commands: ["emo", "emix", "emojimix", "mixemoji"],

    handler: async ({ socket, msg, sender, args, reply }) => {
        try {
            // 1. Get input text or quoted message text
            const input = args.join(" ").trim();
            let quotedText = "";
            
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quoted) {
                quotedText = quoted.conversation || quoted.extendedTextMessage?.text || "";
            }
            
            const text = input || quotedText || "";
            const emojis = extractEmojis(text);

            if (emojis.length < 2) {
                return await reply("❓ *Emoji දෙකක් දෙන්න මචං.*\n\n💡 _උදා: .emo 😪😍_");
            }

            const [emoji1, emoji2] = emojis;

            // 2. React with a test tube emoji
            await socket.sendMessage(sender, { react: { text: "🧪", key: msg.key } });

            // 3. Process the emojis
            const imageBuffer = await fetchEmojiMix(emoji1, emoji2);
            const stickerBuffer = await makeStickerBuffer(imageBuffer);

            // 4. Send the sticker
            await socket.sendMessage(sender, {
                sticker: stickerBuffer
            }, { quoted: msg });

            // 5. React with success
            await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Emoji mix error:", err);
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });

            await reply(
                "❌ *මේ emoji දෙක mix කරන්න බැරි වුණා මචං.*\n\n" +
                "වෙන emoji pair එකක් try කරන්න.\n" +
                "💡 _උදා: .emo 😂❤️_"
            );
        }
    }
};
