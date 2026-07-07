const axios = require("axios");

module.exports = {
    name: "text-art",
    category: 5, // Tools & Edits Category
    description: "Text එක ASCII art style එකට convert කරන්න (No Lag API Version)",
    commands: ["art", "ascii", "textart"],

    handler: async ({ socket, msg, sender, args, reply }) => {
        try {
            // 1. අකුරු ටික හොයාගැනීම
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

            // 3. බොට් හිරවෙන්නේ නැති වෙන්න API එක හරහා Art එක ලබාගැනීම
            const apiUrl = `https://networkcalc.com/api/ascii?text=${encodeURIComponent(textInput)}&font=standard`;
            const response = await axios.get(apiUrl, { timeout: 15000 });

            if (response.data && response.data.status === "OK" && response.data.ascii) {
                // 4. සාර්ථකව ආවොත් මැසේජ් එක යැවීම
                const art = response.data.ascii;
                const finalMessage = "```\n" + art + "\n```\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*";
                
                await reply(finalMessage);
                await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });
            } else {
                throw new Error("API Server එකෙන් ප්‍රතිචාරයක් නොලැබුණි.");
            }

        } catch (err) {
            console.error("Art command error:", err.message);
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
            await reply("❌ *Art එක හදන්න බැරි වුණා.*\n\nහේතුව: " + err.message);
        }
    }
};
