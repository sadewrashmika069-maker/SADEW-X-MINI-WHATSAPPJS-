const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 🛑 ඔයාගේ package.json එකට හරියන්නම හදපු Imports ටික
const { downloadContentFromMessage } = require('baileys');
const ffmpegPath = require('ffmpeg-static'); // ඔයාගේ බොට්ගෙම තියෙන FFmpeg එක

module.exports = {
    name: "audio_editor",
    category: "audio",
    description: "Audio Editor (Bass, Slowed, Speedup, Volume)",
    commands: ["bass", "base", "slowed", "slow", "speedup", "volume"],
    on: "message",

    handler: async ({ socket, reply, msg, sender, args }) => {
        try {
            // කමාන්ඩ් එක අඳුරගන්නවා
            let text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
            let command = text.split(" ")[0].toLowerCase().replace(/^[.#!]/, "");

            // Audio එකකට Reply කරලා තියෙනවද කියලා බලනවා
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const audioMsg = quotedMsg?.audioMessage;

            if (!audioMsg) {
                return await reply(`⚠️ Audio එකකට හෝ Voice Note එකකට Reply කරලා \`.${command}\` කියලා ගහන්න!`);
            }

            await socket.sendMessage(sender, { react: { text: '🎧', key: msg.key } });

            // 📥 Audio එක Download කරගන්නවා
            const stream = await downloadContentFromMessage(audioMsg, 'audio');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // Temp files හැදීම
            const sessionId = Math.random().toString(36).substring(7);
            const inputPath = path.join(__dirname, `../temp_in_${sessionId}.mp3`);
            const outputPath = path.join(__dirname, `../temp_out_${sessionId}.mp3`);

            fs.writeFileSync(inputPath, buffer);

            // 🎛️ කමාන්ඩ් එක අනුව ෆිල්ටර් (Filter) එක තෝරනවා
            let filter = "";
            if (command === "bass" || command === "base") {
                filter = "-af bass=g=20:f=110:w=0.3"; 
            } else if (command === "slowed" || command === "slow") {
                filter = "-filter:a atempo=0.8,asetrate=44100*0.85"; 
            } else if (command === "speedup") {
                filter = "-filter:a atempo=1.5"; 
            } else if (command === "volume") {
                filter = "-filter:a volume=4.0"; 
            }

            // 🚀 ඔයාගේ Package.json එකේ තියෙන FFmpeg එකෙන්ම වැඩේ කරනවා (කවදාවත් ෆේල් වෙන්නේ නෑ!)
            const execCommand = `"${ffmpegPath}" -i "${inputPath}" ${filter} -c:a libmp3lame -q:a 2 "${outputPath}"`;

            exec(execCommand, async (error) => {
                if (error) {
                    console.error("FFmpeg Error:", error);
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); 
                    return await reply("❌ Audio එක Edit කරන්න බැරි වුණා මචං!");
                }

                // ✅ Edit කරපු Audio එක ගන්නවා
                const editedAudio = fs.readFileSync(outputPath);

                // 📩 Audio එක ආපහු යවනවා (Voice Note එකක් විදිහටම)
                await socket.sendMessage(sender, {
                    audio: editedAudio,
                    mimetype: 'audio/mp4',
                    ptt: true 
                }, { quoted: msg });

                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

                // 🧹 තාවකාලික ෆයිල් ටික මකලා දානවා
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            });

        } catch (err) {
            console.error("Audio Editor Error:", err.message);
            await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
            await reply("❌ අවුලක් ගියා මචං! කමාන්ඩ් එක හරියටම Audio එකකට Reply කරලා ගැහුවද බලන්න.");
        }
    }
};