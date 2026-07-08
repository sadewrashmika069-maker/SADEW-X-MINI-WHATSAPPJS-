const { jidNormalizedUser } = require("baileys"); // User ගේ නම්බර් එක ගන්න

// 💾 මැසේජ් මතක තියාගන්න Cache එක
if (!global.msgCache) global.msgCache = [];

// Event Listener එක දෙපාරක් රන් වෙන එක නවත්තන්න
let isListenerAdded = false;

module.exports = {
    name: "antidelete",
    category: "system",
    description: "Advanced Anti-Delete System for Text & Media",
    commands: ["ad", "antidelete"], // මේ කමාන්ඩ් එක ගහලත් On කරන්න පුළුවන්
    on: "message", // ගොඩක් වෙලාවට මේකෙන් ඔටෝම හැම මැසේජ් එකකදිම On වෙනවා

    handler: async ({ socket, reply }) => {
        try {
            // Framework එකට හොරෙන් කෙලින්ම Baileys (WhatsApp Core) එකටම සම්බන්ධ වීම
            if (!isListenerAdded && socket && socket.ev) {
                isListenerAdded = true;
                console.log("✅ Sadew-Mini: Advanced Anti-Delete System Active!");
                
                // කමාන්ඩ් එක ගහලා On කරොත් මැසේජ් එකක් යවනවා
                if (reply) {
                    await reply("🚀 *Anti-Delete System Activated!*\nදැන් Background එකේ මැසේජ් සේව් වෙනවා. මැකුවොත් ඔයාගේ 'You' චැට් එකට එයි.");
                }

                socket.ev.on("messages.upsert", async (chatUpdate) => {
                    try {
                        for (let rawMsg of chatUpdate.messages) {
                            if (!rawMsg.message) continue;

                            // ViewOnce සහ Ephemeral මැසේජ් හැංගිලා එන නිසා ඒවා හරියටම ගන්නවා
                            let actualMessage = rawMsg.message?.ephemeralMessage?.message || 
                                                rawMsg.message?.viewOnceMessage?.message || 
                                                rawMsg.message;

                            // 1. මේක මැසේජ් එකක් මකන (REVOKE) සිග්නල් එකක්ද කියලා බලනවා
                            let isRevoke = actualMessage?.protocolMessage?.type === 0 || 
                                           actualMessage?.protocolMessage?.type === "REVOKE" || 
                                           actualMessage?.protocolMessage?.type === 14;

                            if (isRevoke) {
                                let deletedId = actualMessage.protocolMessage.key.id;

                                // Cache එකේ තියෙනවද හොයනවා
                                let foundMsg = global.msgCache.find(msg => msg.id === deletedId);

                                if (foundMsg) {
                                    // 🔥 බොට්ව ලොග් කරන් ඉන්න කෙනාගේ (User ගේ) නම්බර් එක ඔටෝමැටික් ගන්නවා
                                    let sessionOwnerJid = jidNormalizedUser(socket.user.id); 

                                    let deletedBy = foundMsg.sender.split("@")[0];
                                    let isGroup = foundMsg.chat.endsWith("@g.us");

                                    let textMsg = `🚫 *DELETED MESSAGE DETECTED* 🚫\n\n`;
                                    textMsg += `👤 *Sender:* @${deletedBy}\n`;
                                    textMsg += `📌 *Chat:* ${isGroup ? "Group" : "Private Inbox"}\n`;
                                    textMsg += `⏳ *Time:* ${new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Colombo" })}\n\n`;
                                    textMsg += `👇 *මැකූ පණිවිඩය පහතින් ඇත* 👇`;

                                    // විස්තරේ යවනවා (User ගේ You චැට් එකට)
                                    await socket.sendMessage(sessionOwnerJid, { 
                                        text: textMsg, 
                                        mentions: [foundMsg.sender] 
                                    });

                                    // ඇත්තම මැසේජ් එක (ෆොටෝ/වීඩියෝ/Text/Sticker) ඒ විදිහටම එවනවා
                                    await socket.relayMessage(sessionOwnerJid, foundMsg.message, { messageId: deletedId });
                                }
                            } 
                            // 2. මකන එකක් නෙමෙයි නම්, Cache එකට දානවා (ඔයා යවන මැසේජ් වුණත් දැන් අල්ලනවා)
                            else if (actualMessage && rawMsg.key.remoteJid !== 'status@broadcast') {
                                const exists = global.msgCache.find(msg => msg.id === rawMsg.key.id);
                                if (!exists) {
                                    global.msgCache.push({
                                        id: rawMsg.key.id,
                                        message: rawMsg.message, // සම්පූර්ණ මැසේජ් එකම සේව් කරනවා
                                        sender: rawMsg.participant || rawMsg.key.participant || rawMsg.key.remoteJid,
                                        chat: rawMsg.key.remoteJid
                                    });
                                    
                                    // මතකය පිරෙන එක නවත්තන්න 500කට සීමා කරනවා
                                    if (global.msgCache.length > 500) {
                                        global.msgCache.shift();
                                    }
                                }
                            }
                        }
                    } catch (err) {
                        console.log("Anti-Delete Event Error:", err);
                    }
                });
            } else if (isListenerAdded && reply) {
                // යම් හෙයකින් ආයෙමත් කමාන්ඩ් එක ගැහුවොත්
                await reply("✅ Anti-Delete System දැනටමත් ක්‍රියාකාරීව පවතී!");
            }
        } catch (e) {
            console.log("Anti-Delete Logic Error:", e);
        }
    }
};
