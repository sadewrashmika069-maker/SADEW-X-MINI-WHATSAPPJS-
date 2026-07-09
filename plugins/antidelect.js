const { jidNormalizedUser } = require("baileys"); // Baileys JID decoder

// 💾 මැසේජ් මතක තියාගන්න Global Cache එක (RAM එක පිරෙන එක නවත්තන්න)
if (!global.adCache) global.adCache = [];
let isSystemActive = false;

// වෙනත් Baileys බොට් කෙනෙක්ගෙන් ආපු මැසේජ් එකක්ද කියලා ID එකෙන් අල්ලගන්න function එක
const isBotId = (id) => {
    if (!id) return false;
    // Zanta MD, Spacky වැනි බොට්ස් BAE5 හෝ 3EB0 වලින් පටන් ගන්නා ID පාවිච්චි කරයි
    return id.startsWith("BAE5") || id.startsWith("3EB0") || id.length === 16;
};

module.exports = {
    name: "antidelete",
    category: "system",
    description: "Anti-Delete + Zanta Collision Fix (All-in-One)",
    commands: ["ad", "antidelete"],
    on: "message", // හැම මැසේජ් එකකදිම Background එකේ ඔටෝම On වෙනවා

    handler: async ({ socket, reply, msg }) => {
        try {
            // Framework එකට හොරෙන් WhatsApp Core එකටම සම්බන්ධ වීම
            if (!isSystemActive && socket && socket.ev) {
                isSystemActive = true;
                console.log("✅ Sadew-Mini: Anti-Delete & Multi-Bot Collision Fix Active!");

                socket.ev.on("messages.upsert", async (chatUpdate) => {
                    try {
                        const m = chatUpdate.messages[0];
                        if (!m || !m.message) return;

                        // ViewOnce සහ Ephemeral මැසේජ් හැංගිලා එන නිසා ඒවා හරියටම අල්ලගන්නවා
                        let actualMessage = m.message?.ephemeralMessage?.message || 
                                            m.message?.viewOnceMessage?.message || 
                                            m.message;

                        const messageId = m.key.id || "";
                        const remoteJid = m.key.remoteJid;
                        const isMe = m.key.fromMe;
                        const needsFix = !isMe && actualMessage; 
                        
                        const sessionJid = jidNormalizedUser(socket.user.id);

                        // ==========================================
                        // 🛑 1. ANTI-COLLISION SYSTEM (Multi-Bot Collision Fix) 
                        // ==========================================
                        if (needsFix && isBotId(messageId)) {
                            console.log(`[COLLISION-FIX] Baileys බොට් කෙනෙක් (ID: ${messageId}) inbox detects. Applying 2.2s delay...`);
                            // Zanta MD එකට රිප්ලයි කරලා session update වෙන්න තත්පර 2.2 ක Delay එකක් දෙනවා
                            await new Promise(resolve => setTimeout(resolve, 2200)); 
                        }


                        // ==========================================
                        // 🚫 2. ANTI-DELETE SYSTEM (Text + Media Ready)
                        // ==========================================
                        let isRevoke = actualMessage?.protocolMessage?.type === 0 || 
                                       actualMessage?.protocolMessage?.type === "REVOKE" || 
                                       actualMessage?.protocolMessage?.type === 14;

                        if (needsFix && isRevoke) {
                            let deletedId = actualMessage.protocolMessage.key.id;

                            // Cache එකේ තියෙනවද හොයනවා
                            let foundMsg = global.adCache.find(c => c.id === deletedId);

                            if (foundMsg) {
                                let deletedBy = foundMsg.sender.split("@")[0];
                                let isGroup = foundMsg.chat.endsWith("@g.us");

                                let textMsg = `🚫 *DELETED MESSAGE DETECTED* 🚫\n\n`;
                                textMsg += `👤 *Sender:* @${deletedBy}\n`;
                                textMsg += `📌 *Chat:* ${isGroup ? "Group" : "Private Inbox"}\n`;
                                textMsg += `⏳ *Time:* ${new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Colombo" })}\n\n`;
                                textMsg += `👇 *මැකූ පණිවිඩය පහතින් ඇත* 👇`;

                                // විස්තරේ යවනවා (බොට්ව පාවිච්චි කරන User ගේ 'You' චැට් එකට)
                                await socket.sendMessage(sessionJid, { 
                                    text: textMsg, 
                                    mentions: [foundMsg.sender] 
                                });

                                // ඇත්තම මැසේජ් එක (ෆොටෝ/වීඩියෝ/Text/Sticker) ඒ විදිහටම එවනවා
                                await socket.relayMessage(sessionJid, foundMsg.message, { messageId: deletedId });
                            }
                        } 
                        // මකන එකක් නෙමෙයි නම්, හැම මැසේජ් එකක්ම Cache එකට දානවා
                        else if (actualMessage && needsFix && remoteJid !== 'status@broadcast') {
                            const exists = global.adCache.find(c => c.id === messageId);
                            if (!exists) {
                                global.adCache.push({
                                    id: messageId,
                                    message: m.message, 
                                    sender: m.participant || m.key.participant || remoteJid,
                                    chat: remoteJid
                                });
                                
                                // මතකය පිරෙන එක නවත්තන්න සේව් කරගන්න මැසේජ් 500කට සීමා කරනවා
                                if (global.adCache.length > 500) {
                                    global.adCache.shift();
                                }
                            }
                        }
                    } catch (err) {
                        console.log("Anti-Delete/Collision Fix Event Error:", err);
                    }
                });
            } else if (isSystemActive && msg && msg.key && msg.key.id && (msg.key.id === "SADEW_AD_ON_CMD_999")) {
                await reply("✅ Anti-Delete & Collision Fix System දැනටමත් ක්‍රියාකාරීව පවතී!");
            }
        } catch (e) {
            console.log("Logic Error:", e);
        }
    }
};
