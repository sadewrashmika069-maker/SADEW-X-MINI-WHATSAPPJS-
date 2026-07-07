const figlet = require("figlet");

// ═══════ HELPER FUNCTION ═══════
function makeArt(text) {
    return new Promise((resolve, reject) => {
        figlet.text(text, {
            font: "Standard",
            horizontalLayout: "default",
            verticalLayout: "default",
            width: 80,
            whitespaceBreak: true
        }, (err, data) => {
            if (err) return reject(err);
            resolve(data);
        });
    });
}

// ═══════ PLUGIN EXPORT ═══════
module.exports = {
    name: "text-art",
    category: 5, // Tools & Edits Category
    description: "Text එක ASCII art style එකට convert කරන්න",
    commands: ["art", "ascii", "textart"],

    handler: async ({ socket, msg, sender, args, reply }) => {
        try {
            // 1. අකුරු ටික හොයාගැනීම (කමාන්ඩ් එකෙන් හෝ රිප්ලයි කරපු මැසේජ් එකෙන්)
            let textInput = args.join(" ").trim();
            
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!textInput && quoted) {
                textInput = quoted.conversation || quoted.extendedTextMessage?.text || "";
            }

            if (!textInput) {
                return await reply("🎨 *Art කරන්න text එකක් දෙන්න මචං.*\n\n💡 _උදා: .art sadew_");
            }

            if (textInput.length > 20) {
                return await reply("❌ *Text එක දිග වැඩියි මචං. අකුරු 20 ට අඩුවෙන් දෙන්න.*");
            }

            // 2. React කිරීම
            await socket.sendMessage(sender, { react: { text: "🎨", key: msg.key } });

            // 3. Art එක හැදීම
            const art = await makeArt(textInput);

            // 4. මැසේජ් එක යැවීම
            const finalMessage = "```\n" + art + "\n```\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*";
            await reply(finalMessage);

            // 5. සාර්ථක බව React කිරීම
            await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            console.error("Art command error:", err);
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
            await reply("❌ *Art එක හදන්න බැරි වුණා.*\n\nහේතුව: " + err.message);
        }
    }
};
