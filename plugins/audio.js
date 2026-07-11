const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

module.exports = {
    name: "audio_editor",
    category: "audio",
    description: "Audio Editor (Bass, Slowed, Speedup, Volume)",
    // 🛑 අකුරු වැරදුණත් වැඩ කරන්න මම base සහ slow කියන ඒවත් මේකට ඇඩ් කළා
    commands: ["bass", "base", "slowed", "slow", "speedup", "volume"],
    on: "message",

    handler: async ({ socket, reply, msg, sender, args }) => {
        try {
            // කමාන්ඩ් එක මොකක්ද කියලා අඳුරගන්නවා (Prefix එකත් එක්කම අයින් කරලා)
            let text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
            let command = text.split(" ")[0].toLowerCase().replace(/^[.#!]/, "");

            // Audio එකකට Reply කරලා තියෙනවද කියලා බලනවා
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const audioMsg = quotedMsg?.audioMessage;

            if (!audioMsg) {
                return await reply(`⚠️ Audio එකකට හෝ Voice Note එකකට Reply කරලා \`.${command}\` කියලා ගහන්න!`);
            }

            await socket.sendMessage(sender, { react: { text: '🎧', key: msg.key } });

            // 🛑 බොට් ක්‍රෑෂ් වෙන එක නවත්තන්න Package එක ඩයිනමික් විදිහට ලෝඩ් කරනවා
            let downloadContentFromMessage;
            try {
                downloadContentFromMessage = require('@whiskeysockets/baileys').downloadContentFromMessage;
            } catch (e) {
                downloadContentFromMessage = require('@adiwajshing/baileys').downloadContentFromMessage;
            }

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

            // 🚀 FFmpeg මගින් Audio එක Edit කරනවා
            const execCommand = `ffmpeg -i ${inputPath} ${filter} -c:a libmp3lame -q:a 2 ${outputPath}`;

            exec(execCommand, async (error) => {
                if (error) {
                    console.error("FFmpeg Error:", error);
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); 
                    return await reply("❌ Audio එක Edit කරන්න බැරි වුණා. (සමහරවිට ඔයාගේ සර්වර් එකේ FFmpeg ඉන්ස්ටෝල් කරලා නෑ!)");
                }

                // ✅ Edit කරපු Audio එක ගන්නවා
                const editedAudio = fs.readFileSync(outputPath);

                // 📩 Audio එක ආපහු යවනවා (Voice Note එකක් විදිහට)
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
        }
    }
};