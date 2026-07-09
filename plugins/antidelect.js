const { jidNormalizedUser } = require("baileys"); 

if (!global.adCache) global.adCache = [];
let isSystemActive = false;

module.exports = {
    name: "antidelete",
    category: "system",
    description: "Anti-Delete System (Text + Media Ready)",
    commands: ["ad", "antidelete"],
    on: "message",

    handler: async ({ socket, reply, msg }) => {
        try {
            if (!isSystemActive && socket && socket.ev) {
                isSystemActive = true;
                console.log("✅ Sadew-Mini: Anti-Delete System Active!");

                socket.ev.on("messages.upsert", async (chatUpdate) => {
                    try {
                        const m = chatUpdate.messages[0];
                        if (!m || !m.message) return;

                        let actualMessage = m.message?.ephemeralMessage?.message || 
                                            m.message?.viewOnceMessage?.message || 
                                            m.message;

                        const messageId = m.key.id || "";
                        const remoteJid = m.key.remoteJid;
                        const isMe = m.key.fromMe;
                        const needsFix = !isMe && actualMessage; 
                        
                        const sessionJid = jidNormalizedUser(socket.user.id);

                        // 🚫 ANTI-DELETE SYSTEM
                        let isRevoke = actualMessage?.protocolMessage?.type === 0 || 
                                       actualMessage?.protocolMessage?.type === "REVOKE" || 
                                       actualMessage?.protocolMessage?.type === 14;

                        if (needsFix && isRevoke) {
                            let deletedId = actualMessage.protocolMessage.key.id;
                            let foundMsg = global.adCache.find(c => c.id === deletedId);

                            if (foundMsg) {
                                let deletedBy = foundMsg.sender.split("@")[0];
                                let isGroup = foundMsg.chat.endsWith("@g.us");

                                let textMsg = `🚫 *DELETED MESSAGE DETECTED* 🚫\n\n`;
                                textMsg += `👤 *Sender:* @${deletedBy}\n`;
                                textMsg += `📌 *Chat:* ${isGroup ? "Group" : "Private Inbox"}\n`;
                                textMsg += `⏳ *Time:* ${new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Colombo" })}\n\n`;
                                textMsg += `👇 *මැකූ පණිවිඩය පහතින් ඇත* 👇`;

                                await socket.sendMessage(sessionJid, { text: textMsg, mentions: [foundMsg.sender] });
                                await socket.relayMessage(sessionJid, foundMsg.message, { messageId: deletedId });
                            }
                        } 
                        else if (actualMessage && needsFix && remoteJid !== 'status@broadcast') {
                            const exists = global.adCache.find(c => c.id === messageId);
                            if (!exists) {
                                global.adCache.push({
                                    id: messageId,
                                    message: m.message, 
                                    sender: m.participant || m.key.participant || remoteJid,
                                    chat: remoteJid
                                });
                                if (global.adCache.length > 500) global.adCache.shift();
                            }
                        }
                    } catch (err) {}
                });
            } else if (isSystemActive && msg && msg.key && msg.key.id === "SADEW_AD_ON_CMD_999") {
                await reply("✅ Anti-Delete System දැනටමත් ක්‍රියාකාරීව පවතී!");
            }
        } catch (e) {}
    }
};
