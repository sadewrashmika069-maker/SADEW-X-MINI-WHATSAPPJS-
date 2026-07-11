const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: "audio_editor",
    category: "audio",
    description: "Audio Editor (Bass, Slowed, Speedup, Volume)",
    // කමාන්ඩ් 4ම මෙතනට දාලා තියෙන්නේ
    commands: ["bass", "slowed", "speedup", "volume"],
    on: "message",

    handler: async ({ socket, reply, msg, sender, args }) => {
        try {
            // 🛑 ටයිප් කරපු කමාන්ඩ් එක මොකක්ද කියලා අඳුරගන්නවා (.bass ද, .slowed ද කියලා)
            let text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
            const command = text.split(" ")[0].toLowerCase().replace(".", ""); 

            // 🛑 Audio එකකට Reply කරලා තියෙනවද කියලා බලනවා
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const audioMsg = quotedMsg?.audioMessage;

            if (!audioMsg) {
                return await reply(`⚠️ Audio එකකට හෝ Voice Note එකකට Reply කරලා \`.${command}\` කියලා ගහන්න!`);
            }

            await socket.sendMessage(sender, { react: { text: '🎧', key: msg.key } });

            // 📥 Aldio එක Download කරගන්නවා
            const stream = await downloadContentFromMessage(audioMsg, 'audio');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // Temp files (තාවකාලික ෆයිල්) හැදීම - එකම වෙලාවට දෙන්නෙක් කමාන්ඩ් එක ගැහුවොත් අවුල් නොයන්න Random නමක් දෙනවා
            const sessionId = Math.random().toString(36).substring(7);
            const inputPath = path.join(__dirname, `../temp_in_${sessionId}.mp3`);
            const outputPath = path.join(__dirname, `../temp_out_${sessionId}.mp3`);

            fs.writeFileSync(inputPath, buffer);

            // 🎛️ කමාන්ඩ් එක අනුව ෆිල්ටර් (Filter) එක තෝරනවා
            let filter = "";
            if (command === "bass") {
                filter = "-af bass=g=20:f=110:w=0.3"; // Bass එක පට්ටෙටම වැඩි කරනවා
            } else if (command === "slowed") {
                filter = "-filter:a atempo=0.8,asetrate=44100*0.85"; // Slowed & Reverb වගේ Pitch එකත් අඩු කරනවා
            } else if (command === "speedup") {
                filter = "-filter:a atempo=1.5"; // 1.5x Speed කරනවා
            } else if (command === "volume") {
                filter = "-filter:a volume=4.0"; // සද්දෙ 4 ගුණයකින් වැඩි කරනවා (Meme Loud)
            }

            // 🚀 FFmpeg මගින් Audio එක Edit කරනවා
            const execCommand = `ffmpeg -i ${inputPath} ${filter} -c:a libmp3lame -q:a 2 ${outputPath}`;

            exec(execCommand, async (error) => {
                if (error) {
                    console.error("FFmpeg Error:", error);
                    fs.unlinkSync(inputPath); // Error එකක් ආවොත් ෆයිල් මකනවා
                    return await reply("❌ Audio එක Edit කරන්න බැරි වුණා. සර්වර් එකේ FFmpeg අවුලක්!");
                }

                // ✅ Edit කරපු Audio එක ගන්නවා
                const editedAudio = fs.readFileSync(outputPath);

                // 📩 audio එක ආපහු යවනවා (Voice Note එකක් විදිහටම)
                await socket.sendMessage(sender, {
                    audio: editedAudio,
                    mimetype: 'audio/mp4',
                    ptt: true // ptt: true දුන්නම Voice Note එකක් වගේ පේන්නේ, false කරොත් Normal Audio එකක් වෙයි
                }, { quoted: msg });

                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

                // 🧹 වැඩේ ඉවර වුණාම තාවකාලික ෆයිල් ටික මකලා දානවා (සර්වර් එක පිරෙන එක නවත්තන්න)
                fs.unlinkSync(inputPath);
                fs.unlinkSync(outputPath);
            });

        } catch (err) {
            console.error("Audio Editor Error:", err.message);
            await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
            await reply("❌ අවුලක් ගියා මචං! කමාන්ඩ් එක හරියටම Audio එකකට Reply කරලා ගැහුවද බලන්න.");
        }
    }
};