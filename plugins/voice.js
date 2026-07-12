const axios = require("axios");

// 🔴 Global Context එක (Reply අල්ලගන්න)
if (!global.voiceContexts) global.voiceContexts = {};

// 🎙️ API එකේ තියෙන Voice Characters ලිස්ට් එක 
const voiceList = [
    "Ana", "Andrew", "Andrew Multilingual", "Aria", "Ava Multilingual",
    "Brian Multilingual", "Emma Multilingual", "Libby", "Maisie",
    "Keita", "Nanami", "InJoon", "SunHi"
];

module.exports = {
    name: "text_to_speech",
    category: "ai",
    description: "Convert text to speech using David Cyril API",
    commands: ["voice", "tts"],

    handler: async ({ socket, msg, sender, command, args }) => {
        const textToSpeak = args.join(" ").trim();

        if (!textToSpeak) {
            return await socket.sendMessage(sender, {
                text: `🎙️ *Text to Speech*\n\n*භාවිතය:*\n• .${command} <text>\n\n*උදාහරණ:*\n.${command} hello sadew mini\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
            }, { quoted: msg });
        }

        let listMsg = `🎙️ *Text to Speech (Voice Setup)*\n\n📝 *Text:* ${textToSpeak}\n\n*Available Voices:*\n`;
        
        voiceList.forEach((voice, i) => {
            listMsg += `*${i + 1}.* ${voice}\n`;
        });
        
        listMsg += `\n> 💡 *ඔබට අවශ්‍ය කටහඬේ අංකය මෙම පණිවිඩයට Reply කරන්න.*\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

        let sentMsg = await socket.sendMessage(sender, { text: listMsg }, { quoted: msg });

        global.voiceContexts[sender] = { 
            quotedId: sentMsg.key.id, 
            text: textToSpeak 
        };

        const replyListener = async ({ messages }) => {
            try {
                const replyMsg = messages[0];
                if (!replyMsg.message || replyMsg.key.remoteJid !== sender) return;

                const ctx = replyMsg.message.extendedTextMessage?.contextInfo;
                if (!ctx) return;

                const context = global.voiceContexts[sender];
                if (!context) return;

                if (ctx.stanzaId === context.quotedId) {
                    const replyText = (replyMsg.message.extendedTextMessage?.text || '').trim();
                    const num = parseInt(replyText);

                    if (isNaN(num) || num < 1 || num > voiceList.length) {
                        return await socket.sendMessage(sender, { text: "❌ *වැරදි අංකයක්! කරුණාකර නිවැරදි අංකය Reply කරන්න.*" }, { quoted: replyMsg });
                    }

                    const selectedVoice = voiceList[num - 1];
                    const savedText = context.text;

                    socket.ev.off('messages.upsert', replyListener);
                    delete global.voiceContexts[sender];

                    await socket.sendMessage(sender, { react: { text: "⏳", key: replyMsg.key } });
                    await socket.sendPresenceUpdate('recording', sender);

                    try {
                        const apiUrl = `https://apis.davidcyril.name.ng/tools/speechma?text=${encodeURIComponent(savedText)}&voice=${encodeURIComponent(selectedVoice)}&pitch=2&rate=1`;
                        
                        const audioRes = await axios.get(apiUrl, {
                            responseType: 'arraybuffer',
                            timeout: 20000 
                        });

                        const buffer = Buffer.from(audioRes.data);
                        
                        if (buffer.length < 1000) {
                            throw new Error("Invalid audio received from API.");
                        }

                        // 🛑 මෙන්න මෙතන තමයි වෙනස් කළේ! 
                        // ptt: true අයින් කරලා, .mp3 ෆයිල් එකක් විදිහටම යවනවා.
                        await socket.sendMessage(sender, {
                            audio: buffer,
                            mimetype: 'audio/mpeg',
                            fileName: 'SadewMini_Voice.mp3'
                        }, { quoted: replyMsg });

                        await socket.sendMessage(sender, { react: { text: "✅", key: replyMsg.key } });

                    } catch (audioErr) {
                        console.error("TTS Audio Error:", audioErr);
                        await socket.sendMessage(sender, { react: { text: "❌", key: replyMsg.key } });
                        await socket.sendMessage(sender, { text: `❌ *Voice generation failed:*\n_${audioErr.message}_` }, { quoted: replyMsg });
                    }
                }
            } catch (listenerErr) {
                console.error("TTS Listener Error:", listenerErr);
            }
        };

        socket.ev.on('messages.upsert', replyListener);
        
        setTimeout(() => {
            socket.ev.off('messages.upsert', replyListener);
            if (global.voiceContexts[sender]) delete global.voiceContexts[sender];
        }, 5 * 60 * 1000);
    }
};
