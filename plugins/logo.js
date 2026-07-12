const axios = require("axios");

// 🔴 Global Context (Reply එක අල්ලගන්න)
if (!global.logoContexts) global.logoContexts = {};

// 🎨 ඔයා දීපු ලෝගෝ 100+ ලිස්ට් එක!
const logoList = [
    { name: "Neon Light Text", endpoint: "neon" }, { name: "Colorful Glow", endpoint: "colorfulglow" },
    { name: "Advanced Glow", endpoint: "advancedglow" }, { name: "Neon Online", endpoint: "neononline" },
    { name: "Blue Neon", endpoint: "blueneon" }, { name: "Neon Text", endpoint: "neontext" },
    { name: "Neon Light", endpoint: "neonlight" }, { name: "Green Neon", endpoint: "greenneon" },
    { name: "Green Light Neon", endpoint: "greenlightneon" }, { name: "Blue Neon Logo", endpoint: "blueneonlogo" },
    { name: "Galaxy Neon", endpoint: "galaxyneon" }, { name: "Retro Neon", endpoint: "retroneon" },
    { name: "Multicolor Neon", endpoint: "multicolorneon" }, { name: "Hacker Neon", endpoint: "hackerneon" },
    { name: "Devil Wings", endpoint: "devilwings" }, { name: "Glow Text", endpoint: "glowtext" },
    { name: "Neon Glitch", endpoint: "neonglitch" }, { name: "Neon Wall", endpoint: "neonwall" },
    { name: "LED Screen", endpoint: "led" }, { name: "Write on Wet Glass", endpoint: "writeonwetglass" },
    { name: "Deadpool", endpoint: "deadpool" }, { name: "Dragonball", endpoint: "dragonball" },
    { name: "Typography Pavement", endpoint: "typographypavement" }, { name: "Blackpink Logo", endpoint: "blackpinklogo" },
    { name: "Born Pink", endpoint: "bornpink" }, { name: "Frozen", endpoint: "frozen" },
    { name: "Gold", endpoint: "gold" }, { name: "Horror", endpoint: "horror" },
    { name: "Blood", endpoint: "blood" }, { name: "Lava", endpoint: "lava" },
    { name: "Thunder", endpoint: "thunder" }, { name: "Matrix", endpoint: "matrix" },
    { name: "Smoke", endpoint: "smoke" }, { name: "Naruto", endpoint: "naruto" },
    { name: "Avengers 3D", endpoint: "avengers3d" }, { name: "American Flag 3D", endpoint: "americanflag3d" },
    { name: "Wooden 3D", endpoint: "wooden3d" }, { name: "Cubic 3D", endpoint: "cubic3d" },
    { name: "Wooden 3D Online", endpoint: "wooden3donline" }, { name: "Water 3D", endpoint: "water3d" },
    { name: "Text 3D", endpoint: "text3d" }, { name: "Graffiti 3D", endpoint: "graffiti3d" },
    { name: "Silver 3D", endpoint: "silver3d" }, { name: "Style 3D", endpoint: "style3d" },
    { name: "Metal 3D", endpoint: "metal3d" }, { name: "Comic 3D", endpoint: "comic3d" },
    { name: "Hologram 3D", endpoint: "hologram3d" }, { name: "Gradient 3D", endpoint: "gradient3d" },
    { name: "Stone 3D", endpoint: "stone3d" }, { name: "Space 3D", endpoint: "space3d" },
    { name: "Sand 3D", endpoint: "sand3d" }, { name: "Snow 3D", endpoint: "snow3d" },
    { name: "Papercut 3D", endpoint: "papercut3d" }, { name: "Balloon 3D", endpoint: "balloon3d" },
    { name: "Christmas 3D", endpoint: "christmas3d" }, { name: "Christmas Sparkles", endpoint: "christmas-sparkles" },
    { name: "Christmas Snow 3D", endpoint: "christmas-snow3d" }, { name: "Christmas Frozen", endpoint: "christmas-frozen" },
    { name: "Christmas Gold", endpoint: "christmas-gold" }, { name: "New Year Gold", endpoint: "newyear-gold" },
    { name: "PUBG Logo", endpoint: "pubglogo" }, { name: "Valorant Banner", endpoint: "valorantbanner" },
    { name: "Birthday 3D", endpoint: "birthday3d" }, { name: "PUBG Birthday", endpoint: "pubgbirthday" },
    { name: "Flower Birthday", endpoint: "flowerbirthday" }, { name: "Fire Text", endpoint: "fire" },
    { name: "Flame Lettering", endpoint: "flamelettering" }, { name: "Horror Cemetery", endpoint: "horrorcemetery" },
    { name: "Halloween Theme", endpoint: "halloweentheme" }, { name: "Blood Wall", endpoint: "bloodwall" },
    { name: "Frankenstein Text", endpoint: "frankensteintext" }, { name: "Horror Metal", endpoint: "horrormetal" },
    { name: "Halloween Text", endpoint: "halloweentext" }, { name: "Halloween Effect", endpoint: "halloweeneffect" },
    { name: "Horror Text", endpoint: "horrortext" }, { name: "Halloween Card", endpoint: "halloweencard" },
    { name: "Name Tattoo", endpoint: "nametattoo" }, { name: "Foil Balloon 3D", endpoint: "foilballoon3d" },
    { name: "Colorful Paint 3D", endpoint: "colorfulpaint3d" }, { name: "Blackpink Signature", endpoint: "blackpinksignature" },
    { name: "Dragonball Text", endpoint: "dragonballtext" }, { name: "Glossy Silver 3D", endpoint: "glossysilver3d" },
    { name: "Typography Art", endpoint: "typographyart" }, { name: "Foggy Glass", endpoint: "foggyglass" },
    { name: "Naruto Logo", endpoint: "narutologo" }, { name: "Chocolate Cake", endpoint: "chocolatecake" },
    { name: "Rose Cake", endpoint: "rosecake" }, { name: "Amazing Flower Cake", endpoint: "amazingflowercake" },
    { name: "Red Rose Birthday", endpoint: "redrosebirthday" }, { name: "Greeting Cake", endpoint: "greetingcake" },
    { name: "Anniversary Cake", endpoint: "anniversarycake" }, { name: "Romantic Flower Cake", endpoint: "romanticflowercake" },
    { name: "PUBG Logo 2", endpoint: "pubglogo2" }, { name: "PUBG Esports", endpoint: "pubgesports" },
    { name: "Warzone Cover", endpoint: "warzonecover" }, { name: "AOV Banner", endpoint: "aovbanner" },
    { name: "Sunlight Shadow", endpoint: "sunlightshadow" }, { name: "Heart Wing GIF", endpoint: "heartwinggif" },
    { name: "Love Balloons", endpoint: "loveballoons" }, { name: "CF Cover", endpoint: "cfcover" },
    { name: "LOL Cover", endpoint: "lolcover" }, { name: "CS:GO Cover", endpoint: "csgocover" },
    { name: "Dota 2 Cover", endpoint: "dota2cover" }, { name: "Overwatch Cover", endpoint: "overwatchcover" },
    { name: "One Piece Cover", endpoint: "onepiececover" }, { name: "Dragonball Cover", endpoint: "dragonballcover" },
    { name: "YouTube Button", endpoint: "youtubebutton" }, { name: "Exam Crank", endpoint: "examcrank" }
];

module.exports = {
    name: "ephoto360_logo",
    category: "image",
    description: "Create premium Ephoto360 text logos via text reply",
    commands: ["logo"],

    handler: async ({ socket, msg, sender, command, args }) => {
        const textToLogo = args.join(" ").trim();

        if (!textToLogo) {
            return await socket.sendMessage(sender, {
                text: `🎨 *Premium Logo Maker*\n\n*භාවිතය:*\n• .logo <ඔබේ නම>\n\n*උදාහරණ:*\n.logo sadew x mini\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
            }, { quoted: msg });
        }

        // 1. ලිස්ට් එක යවනවා
        let listMsg = `🎨 *HD Logo Generator*\n\n📝 *Text:* ${textToLogo}\n\n*ඔබට අවශ්‍ය Logo Style එකේ අංකය Reply කරන්න.*\n\n`;
        
        logoList.forEach((logo, i) => {
            listMsg += `*${i + 1}.* ${logo.name}\n`;
        });
        
        listMsg += `\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

        const sentMsg = await socket.sendMessage(sender, { text: listMsg }, { quoted: msg });

        // Context එක සේව් කරනවා
        global.logoContexts[sender] = {
            quotedId: sentMsg.key.id,
            text: textToLogo
        };

        // ==========================================
        // 🔥 DYNAMIC REPLY LISTENER (අංකය අල්ලගැනීම)
        // ==========================================
        const replyListener = async ({ messages }) => {
            try {
                const replyMsg = messages[0];
                if (!replyMsg.message || replyMsg.key.remoteJid !== sender) return;

                const ctx = replyMsg.message.extendedTextMessage?.contextInfo;
                if (!ctx) return;

                const context = global.logoContexts[sender];
                if (!context) return;

                // රිප්ලයි කරලා තියෙන්නේ අපේ ලිස්ට් එකටමද බලනවා
                if (ctx.stanzaId === context.quotedId) {
                    const replyText = (replyMsg.message.extendedTextMessage?.text || '').trim();
                    const num = parseInt(replyText);

                    // අංකය වැරදි නම්
                    if (isNaN(num) || num < 1 || num > logoList.length) {
                        return await socket.sendMessage(sender, { text: `❌ *වැරදි අංකයක්! කරුණාකර 1 සිට ${logoList.length} අතර අංකයක් Reply කරන්න.*` }, { quoted: replyMsg });
                    }

                    const selectedLogo = logoList[num - 1];
                    const savedText = context.text;

                    // 🛑 වැඩේ හරි නිසා Listener එක අයින් කරනවා
                    socket.ev.off('messages.upsert', replyListener);
                    delete global.logoContexts[sender];

                    await socket.sendMessage(sender, { react: { text: "⏳", key: replyMsg.key } });
                    await socket.sendMessage(sender, { text: `🎨 _Generating "${selectedLogo.name}" Logo... Please wait._` }, { quoted: replyMsg });

                    try {
                        // API එකෙන් Logo එක හදනවා
                        const apiUrl = `https://apis.xwolf.space/api/ephoto/${selectedLogo.endpoint}?key=wxa_f_4e840b5e42&text=${encodeURIComponent(savedText)}`;
                        const res = await axios.get(apiUrl, { timeout: 30000 });

                        if (res.data && res.data.success && res.data.imageUrl) {
                            await socket.sendMessage(sender, {
                                image: { url: res.data.imageUrl },
                                caption: `🎨 *Logo Generated Successfully!*\n✨ *Style:* ${selectedLogo.name}\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
                            }, { quoted: replyMsg });

                            await socket.sendMessage(sender, { react: { text: "✅", key: replyMsg.key } });
                        } else {
                            throw new Error("API එකෙන් නිවැරදි ප්‍රතිචාරයක් නොලැබුණි.");
                        }
                    } catch (err) {
                        console.error("Logo Generation Error:", err);
                        await socket.sendMessage(sender, { react: { text: "❌", key: replyMsg.key } });
                        await socket.sendMessage(sender, { text: `❌ *Error:* API Server දෝෂයක්. පසුව උත්සාහ කරන්න.` }, { quoted: replyMsg });
                    }
                }
            } catch (listenerErr) {
                console.error("Logo Listener Error:", listenerErr);
            }
        };

        // Listener එක On කරනවා
        socket.ev.on('messages.upsert', replyListener);
        
        // විනාඩි 5කින් Auto Clear වෙන්න හදනවා 
        setTimeout(() => {
            socket.ev.off('messages.upsert', replyListener);
            if (global.logoContexts[sender]) delete global.logoContexts[sender];
        }, 5 * 60 * 1000);
    }
};
