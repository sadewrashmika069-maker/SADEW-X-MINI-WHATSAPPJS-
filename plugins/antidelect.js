const { jidNormalizedUser } = require("baileys"); // Baileys JID decoder

// 💾 මැසේජ් මතක තියාගන්න Global Cache එක (RAM එක පිරෙන එක නවත්තන්න global. adCache variable එක use karam)
if (!global.adCache) global.adCache = [];
// Anti-Delete logic එක control කරන්න variables
let isAdActive = false;

// වෙනත් Baileys බොට් කෙනෙක්ගෙන් ආපු මැසේජ් එකක්ද කියලා ID එකෙන් අල්ලගන්න function එක
const isBaileysId = (id) => {
    if (!id) return false;
    // Zanta MD, Spacky වැනි ගොඩක් බොට්ස් BAE5 හෝ 3EB0 වලින් පටන් ගන්නා ID පාවිච්චි කරයි
    return id.startsWith("BAE5") || id.startsWith("3EB0") || id.length === 16;
};

module.exports = {
    name: "antidelete",
    category: "system",
    description: "Multi-Bot Collision Fix & Anti-Delete System (Text + Media Ready)",
    commands: ["ad", "antidelete", "collisionfix"],
    on: "message", // ප්ලගින් එක හැම මැසේජ් එකකදිම Background එකේ ඔටෝම On වෙනවා

    handler: async ({ socket, reply, msg }) => {
        try {
            // Framework එකට හොරෙන් WhatsApp Core එකටම සම්බන්ධ වීම
            if (!isAdActive && socket && socket.ev) {
                isAdActive = true;
                console.log("✅ Sadew-Mini Anti-Delete & Collision Fix System: Active!");
                
                // කමාන්ඩ් එක ගහලා On කරොත් විතරක් රිප්ලයි කරනවා
                if (msg && msg.key && msg.key.id && (msg.key.id === "SADEW_AD_ON_CMD_999")) {
                    await reply("🚀 *Multi-Bot Collision Fix & Anti-Delete System Activated!*\nදැන් Background එකේ මැසේජ් සේව් වෙනවා. වෙන බොට්ලාව හිතාමතා Ignore කරලා හැප්පීම් නවත්වනවා.");
                }

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
                        const needsFix = !isMe && actualMessage; // මම එවපු එකක් නොවන, මැසේජ් එකක් තියෙන දේවල්

                        // Determine if we are running in an active socket (multi-session handling)
                        const botJid = jidNormalizedUser(socket.user.id);
                        const userNumber = botJid.split('@')[0];
                        const sessionJid = botJid;

                        // ==========================================
                        // 🛑 1. ANTI-COLLISION SYSTEM (Multi-Bot Collision Fix) 🛑
                        // ==========================================
                        // ඔයා ඉන්න චැට් එකක (Inbox / Group) වෙන බොට් කෙනෙක්ගෙන් (BAE5 / 3EB0) මැසේජ් එකක් ආවොත්, 
                        // SADEW-MINI එයාලත් එක්ක හැප්පෙන එක නවත්තන්න මම 2.2s Delay එකක් දානවා.
                        if (needsFix && isBaileysId(messageId)) {
                            console.log(`[COLLISION-FIX] Baileys බොට් කෙනෙක් (ID: ${messageId}) inbox detects in remote ${remoteJid}. Applying 2.2s delay to prevent collision...`);
                            await new Promise(resolve => setTimeout(resolve, 2200)); 
                            // delay එකෙන් පස්සේ බොට් reply කරොත් session Key collision වෙන්නෙ නෑ. පට්ට ආරක්ෂිතයි!
                        }


                        // ==========================================
                        // 🚫 2. ANTI-DELETE SYSTEM (Text + Media Ready) 🚫
                        // ==========================================
                        // මේක මැසේජ් එකක් මකන (REVOKE) සිග්නල් එකක්ද කියලා බලනවා
                        let isRevoke = actualMessage?.protocolMessage?.type === 0 || 
                                       actualMessage?.protocolMessage?.type === "REVOKE" || 
                                       actualMessage?.protocolMessage?.type === 14;

                        if (needsFix && isRevoke) {
                            let deletedId = actualMessage.protocolMessage.key.id;

                            // Cache එකේ තියෙනවද හොයනවා
                            let foundMsg = global.adCache.find(cachedMsg => cachedMsg.id === deletedId);

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
                        // මකන එකක් නෙමෙයි නම්, හැම මැසේජ් එකක්ම (Media/Text ඔක්කොම) Cache එකට දානවා
                        else if (actualMessage && needsFix && remoteJid !== 'status@broadcast') {
                            const exists = global.adCache.find(cachedMsg => cachedMsg.id === messageId);
                            if (!exists) {
                                global.adCache.push({
                                    id: messageId,
                                    message: m.message, // සම්පූර්ණ මැසේජ් එකම සේව් කරනවා
                                    sender: m.participant || m.key.participant || remoteJid,
                                    chat: remoteJid
                                });
                                
                                // මතකය (RAM එක) පිරෙන එක නවත්තන්න සේව් කරගන්න මැසේජ් 500කට සීමා කරනවා
                                if (global.adCache.length > 500) {
                                    global.adCache.shift();
                                }
                            }
                        }
                    } catch (err) {
                        console.log("Anti-Delete / Collision Fix Event Error:", err);
                    }
                });
            } else if (isAdActive && msg && msg.key && msg.key.id && (msg.key.id === "SADEW_AD_ON_CMD_999")) {
                await reply("✅ Sadew-Mini: Multi-Bot Fix System දැනටමත් ක්‍රියාකාරීව පවතී!");
            }
        } catch (e) {
            console.log("Anti-Delete / Collision Fix Logic Error:", e);
        }
    }
};
