const axios = require('axios');
const FormData = require('form-data');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// 🎵 Music Recognition API Keys
const API_KEYS = [
    "8d48a5d0f1c1f94d56cde6edf1b2bf00", // ප්‍රධාන AudD Key එක
    "test"                              // Backup Test Token
];

// 🌐 WhiteShadow YT APIs & Token
const API_TOKEN = "VK4fry";
const YT_SEARCH_API = "https://whiteshadow-x-api.onrender.com/api/search/yt";
const YT_DOWNLOAD_API = "https://whiteshadow-x-api.onrender.com/api/download/ytmp3";

// ── Quoted Media Download කිරීම සඳහා Function එක ──
const downloadQuotedMedia = async (quoted) => {
    let type = Object.keys(quoted)[0];
    let msgObj = quoted[type];
    
    // ViewOnce මැසේජ් එකක් නම් ඒක ඇතුළට යන්න
    if (type === 'viewOnceMessage' || type === 'viewOnceMessageV2') {
        type = Object.keys(msgObj.message)[0];
        msgObj = msgObj.message[type];
    }

    if (!msgObj || !type) return null;

    // 'audioMessage' හෝ 'videoMessage' වලින් 'audio' / 'video' වෙන් කර ගැනීම
    const mediaType = type.replace('Message', '');
    const stream = await downloadContentFromMessage(msgObj, mediaType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    
    return { buffer, type };
};

module.exports = {
    name: "shazam-find-song",
    category: 8, // 'Song & Music' කැටගරි එකට වැටෙයි
    description: "Identify song from video/audio and download 320kbps MP3",
    commands: ["find", "shazam", "whatsong", "findsong", "songfind"],

    handler: async ({ socket, msg, sender, command, reply }) => {
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        const quotedMessage = contextInfo?.quotedMessage;

        // 1. වීඩියෝවකට හෝ ඕඩියෝ එකකට රිප්ලයි කරලද බලනවා
        const isQuotedMedia = quotedMessage && (
            quotedMessage.audioMessage || 
            quotedMessage.videoMessage || 
            quotedMessage.viewOnceMessage?.message?.videoMessage
        );

        if (!isQuotedMedia) {
            return reply("❌ *Error:* කරුණාකර සින්දුව සෙවීමට අවශ්‍ය වීඩියෝවකට (Video) හෝ ඕඩියෝවකට (Audio) Reply කර මෙම Command එක ලබා දෙන්න.");
        }

        try {
            await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });
            await reply("🎵 _*👑𝙎𝘼𝘿𝙀𝙒-𝙓-𝙈𝘿🔥*_  _වීඩියෝව Analyze කරමින් පවතී..._");

            // 2. Media එක RAM එකට Download කිරීම
            const mediaData = await downloadQuotedMedia(quotedMessage);
            if (!mediaData || !mediaData.buffer) {
                throw new Error("වීඩියෝව හෝ ඕඩියෝව ඩවුන්ලෝඩ් කරගැනීමට නොහැකි විය.");
            }

            const mimetype = mediaData.type === 'audioMessage' ? 'audio/mp4' : 'video/mp4';

            // 3. Audio Tracking (AudD API) - සින්දුව හොයනවා
            let songData = null;
            for (let i = 0; i < API_KEYS.length; i++) {
                try {
                    const form = new FormData();
                    form.append("api_token", API_KEYS[i]);
                    form.append("file", mediaData.buffer, { filename: "media.mp4", contentType: mimetype });
                    form.append("return", "apple_music,spotify");

                    const response = await axios.post("https://api.audd.io/", form, {
                        headers: form.getHeaders(),
                        timeout: 20000
                    });

                    if (response.data && response.data.status === "success" && response.data.result) {
                        songData = response.data.result;
                        break; // හරියට ආවොත් ලූප් එක නවත්වනවා
                    }
                } catch (apiErr) {
                    console.error(`[AudD API Warning - Key ${i + 1}]:`, apiErr.message);
                }
            }

            if (!songData) {
                try { await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } }); } catch (_) {}
                return reply("❌ *Error:* කණගාටුයි, මෙම වීඩියෝවේ ඇති සින්දුව හඳුනා ගැනීමට අපොහොසත් වුණා.");
            }

            const songTitle = songData.title || "Unknown Song";
            const songArtist = songData.artist || "Unknown Artist";
            const searchQuery = `${songTitle} ${songArtist}`;

            await reply(`🎵 *සින්දුව අහුවුණා:* _${songTitle} - ${songArtist}_\n\n🚀 _Searching on YouTube for matching audio..._`);
            try { await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } }); } catch (_) {}

            // 4. YouTube Search (WhiteShadow YT Search API)
            let youtubeUrl = null;
            try {
                const searchResponse = await axios.get(`${YT_SEARCH_API}?q=${encodeURIComponent(searchQuery)}&apitoken=${API_TOKEN}`, { timeout: 20000 });
                if (searchResponse.data?.success && searchResponse.data?.result?.length > 0) {
                    youtubeUrl = searchResponse.data.result[0].url;
                }
            } catch (searchErr) {
                console.error("[YT Search Error]:", searchErr.message);
            }

            if (!youtubeUrl) {
                let fallbackMsg = `*↳ ❝ [🎀 𝗦𝗮𝗱𝗲𝘄 𝗠𝘂𝘀𝗶𝗰 𝗙𝗶𝗻𝗱𝗲𝗿 🎀] ¡! ❞*\n\n📌 *නම:* ${songTitle}\n👤 *ගායකයා:* ${songArtist}\n\n⚠️ _YouTube සෙවුම ක්‍රියා විරහිත බැවින් ඕඩියෝ එක ලබා දිය නොහැක._\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;
                try { await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } }); } catch (_) {}
                return reply(fallbackMsg);
            }

            // 5. YouTube MP3 Download (WhiteShadow YTMP3 API)
            let audioDownloadUrl = null;
            try {
                const downloadResponse = await axios.get(`${YT_DOWNLOAD_API}?url=${encodeURIComponent(youtubeUrl)}&quality=320&apitoken=${API_TOKEN}`, { timeout: 30000 });
                if (downloadResponse.data?.success && downloadResponse.data?.result?.download_url) {
                    audioDownloadUrl = downloadResponse.data.result.download_url;
                }
            } catch (dlErr) {
                console.error("[YT Download Error]:", dlErr.message);
            }

            if (!audioDownloadUrl) {
                let fallbackMsg = `*↳ ❝ [🎀 𝗦𝗮𝗱𝗲𝘄 𝗠𝘂𝘀𝗶𝗰 𝗙𝗶𝗻𝗱𝗲𝗿 🎀] ¡! ❞*\n\n📌 *නම:* ${songTitle}\n👤 *ගායකයා:* ${songArtist}\n\n⚠️ _320kbps ඕඩියෝ ලින්ක් එක ජෙනරේට් කරගැනීමට නොහැකි විය._\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;
                try { await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } }); } catch (_) {}
                return reply(fallbackMsg);
            }

            // 6. WhatsApp හරහා ඕඩියෝ එක යැවීම
            await reply("⬆️ _Uploading and sending audio file to WhatsApp..._");
            try { await socket.sendMessage(sender, { react: { text: '📥', key: msg.key } }); } catch (_) {}

            const songInfoText = `*↳ ❝ [🎀 𝗦𝗮𝗱𝗲𝘄 𝗠𝘂𝘀𝗶𝗰 𝗙𝗶𝗻𝗱𝗲𝗿 🎀] ¡! ❞*\n\n📌 *Title:* ${songTitle}\n👤 *Artist:* ${songArtist}\n💿 *Quality:* 320kbps High-Quality\n🚀 *System:* Auto YT-Bypass Active\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

            // විස්තරය වෙනම යවනවා (Audio වලට යටින් WhatsApp එකේ Caption එන්නේ නැති නිසා)
            await reply(songInfoText);

            // MP3 එක යැවීම
            const cleanFileName = songTitle.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60) + ".mp3";
            await socket.sendMessage(
                sender,
                {
                    audio: { url: audioDownloadUrl },
                    mimetype: "audio/mpeg", 
                    ptt: false, // Voice Note එකක් විදිහට නෙමෙයි Song එකක් විදිහට ප්ලේ වෙන්න
                    fileName: cleanFileName
                },
                { quoted: msg }
            );

            try { await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } }); } catch (_) {}

        } catch (error) {
            console.error("[FIND SONG CRITICAL ERROR]:", error);
            try { await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } }); } catch (_) {}
            await reply(`❌ *Sadew-MD V2 Internal Error:*\n${error.message}`);
        }
    }
};
