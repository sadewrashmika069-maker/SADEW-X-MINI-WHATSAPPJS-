const { jidNormalizedUser } = require("@whiskeysockets/baileys");

// 💾 Global Cache + Listener Tracking (hot-reload safe)
if (!global.adCache) global.adCache = [];
if (!global.adActiveListeners) global.adActiveListeners = new Map();

// Baileys bot ID detection
const isBotId = (id) => {
    if (!id) return false;
    return id.startsWith("BAE5") || id.startsWith("3EB0") || id.length === 16;
};

// ══════════════════════════════════════════════════════
// CORE FUNCTION — pair.js එකෙන් call කරනවා (auto-on)
// socket connect වෙද්දී ඔටෝම Anti-Delete On වෙනවා
// ══════════════════════════════════════════════════════
function initAntiDelete(socket) {
    try {
        if (!socket || !socket.user || !socket.user.id) return;

        const sessionJid = jidNormalizedUser(socket.user.id);
        const socketId = sessionJid.split('@')[0];

        // Already active for this socket? Skip.
        if (global.adActiveListeners.has(socketId)) {
            console.log(`🛡️ Anti-Delete already active for ${socketId}`);
            return;
        }

        const adListener = async (chatUpdate) => {
            try {
                const m = chatUpdate.messages[0];
                if (!m || !m.message) return;

                // ViewOnce + Ephemeral unwrap
                let actualMessage = m.message?.ephemeralMessage?.message ||
                                    m.message?.viewOnceMessage?.message ||
                                    m.message?.viewOnceMessageV2?.message ||
                                    m.message;

                const messageId = m.key.id || "";
                const remoteJid = m.key.remoteJid;
                const isMe = m.key.fromMe;

                // Status broadcast skip
                if (remoteJid === 'status@broadcast') return;

                const needsFix = !isMe && actualMessage;

                // ==========================================
                // 🛑 1. ANTI-COLLISION (Multi-Bot Fix)
                // ==========================================
                if (needsFix && isBotId(messageId)) {
                    await new Promise(resolve => setTimeout(resolve, 2200));
                }

                // ==========================================
                // 🚫 2. ANTI-DELETE DETECTION
                // ==========================================
                const protoMsg = actualMessage?.protocolMessage;
                const isRevoke = protoMsg && (
                    protoMsg.type === 0 ||
                    protoMsg.type === "REVOKE"
                );

                if (isRevoke && protoMsg.key && protoMsg.key.id) {
                    const deletedId = protoMsg.key.id;
                    const foundMsg = global.adCache.find(c => c.id === deletedId);

                    if (foundMsg) {
                        const deletedBy = foundMsg.sender.split("@")[0];
                        const isGroup = foundMsg.chat.endsWith("@g.us");
                        const chatLabel = isGroup ? "Group" : "Private Inbox";

                        let textMsg = `🚫 *DELETED MESSAGE DETECTED* 🚫\n\n`;
                        textMsg += `👤 *Deleted By:* @${deletedBy}\n`;
                        textMsg += `📌 *Chat:* ${chatLabel}\n`;
                        if (isGroup) textMsg += `👥 *Group:* ${foundMsg.chat.split('@')[0]}\n`;
                        textMsg += `⏳ *Time:* ${new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Colombo" })}\n\n`;
                        textMsg += `👇 *මැකූ පණිවිඩය පහතින් ඇත* 👇`;

                        // 📩 Notification ALWAYS goes to bot owner's inbox
                        await socket.sendMessage(sessionJid, {
                            text: textMsg,
                            mentions: [foundMsg.sender]
                        });

                        // Forward the actual deleted message
                        try {
                            await socket.relayMessage(sessionJid, foundMsg.message, {});
                        } catch (relayErr) {
                            // Relay fail? Extract and describe the content
                            try {
                                const cached = foundMsg.message?.ephemeralMessage?.message ||
                                               foundMsg.message?.viewOnceMessage?.message ||
                                               foundMsg.message?.viewOnceMessageV2?.message ||
                                               foundMsg.message;

                                if (cached?.conversation) {
                                    await socket.sendMessage(sessionJid, { text: `💬 *මැකූ Text:*\n\n${cached.conversation}` });
                                } else if (cached?.extendedTextMessage?.text) {
                                    await socket.sendMessage(sessionJid, { text: `💬 *මැකූ Text:*\n\n${cached.extendedTextMessage.text}` });
                                } else if (cached?.imageMessage) {
                                    await socket.sendMessage(sessionJid, { text: `🖼️ *මැකූ පණිවිඩය Image එකකි.*\n📝 Caption: ${cached.imageMessage.caption || 'N/A'}` });
                                } else if (cached?.videoMessage) {
                                    await socket.sendMessage(sessionJid, { text: `🎥 *මැකූ පණිවිඩය Video එකකි.*\n📝 Caption: ${cached.videoMessage.caption || 'N/A'}` });
                                } else if (cached?.stickerMessage) {
                                    await socket.sendMessage(sessionJid, { text: `🎨 *මැකූ පණිවිඩය Sticker එකකි.*` });
                                } else if (cached?.audioMessage) {
                                    await socket.sendMessage(sessionJid, { text: `🎵 *මැකූ පණිවිඩය Voice/Audio එකකි.*` });
                                } else if (cached?.documentMessage) {
                                    await socket.sendMessage(sessionJid, { text: `📄 *මැකූ පණිවිඩය Document එකකි.*\nFileName: ${cached.documentMessage.fileName || 'N/A'}` });
                                } else {
                                    await socket.sendMessage(sessionJid, { text: `⚠️ *මැකූ පණිවිඩය Forward කළ නොහැක.*` });
                                }
                            } catch (fbErr) {
                                console.log("AD fallback error:", fbErr.message);
                            }
                        }
                    }
                }
                // ==========================================
                // 💾 3. CACHE ALL MESSAGES (Group + Inbox)
                // ==========================================
                else if (actualMessage && !isMe && !protoMsg) {
                    const exists = global.adCache.find(c => c.id === messageId);
                    if (!exists) {
                        global.adCache.push({
                            id: messageId,
                            message: m.message,
                            sender: m.key.participant || remoteJid,
                            chat: remoteJid
                        });

                        // RAM overflow prevention — keep last 500
                        if (global.adCache.length > 500) {
                            global.adCache.shift();
                        }
                    }
                }
            } catch (err) {
                // Silent — don't spam logs
            }
        };

        // Register listener
        socket.ev.on("messages.upsert", adListener);
        global.adActiveListeners.set(socketId, adListener);
        console.log(`🛡️ Anti-Delete AUTO-ACTIVATED for ${socketId}`);

    } catch (e) {
        console.log("AD init error:", e.message);
    }
}

module.exports = {
    name: "antidelete",
    category: 7,
    description: "Anti-Delete System (Auto-On)",
    commands: ["ad", "antidelete"],

    // 🔑 pair.js එකෙන් call කරන init function එක
    init: initAntiDelete,

    // .ad command එක type කළොත් status පෙන්වනවා විතරයි
    handler: async ({ socket, msg, sender }) => {
        try {
            const sessionJid = jidNormalizedUser(socket.user.id);
            const socketId = sessionJid.split('@')[0];

            // If somehow not active, activate now
            if (!global.adActiveListeners.has(socketId)) {
                initAntiDelete(socket);
            }

            const cacheCount = global.adCache.length;

            await socket.sendMessage(sender, {
                text: `*↳ ❝ [🛡️ 𝗔𝗻𝘁𝗶-𝗗𝗲𝗹𝗲𝘁𝗲 𝗦𝘁𝗮𝘁𝘂𝘀 🛡️] ¡! ❞*\n\n` +
                      `✅ *System:* Active (Auto-On)\n` +
                      `📦 *Cached Messages:* ${cacheCount}/500\n` +
                      `👥 *Group Detection:* ✅ Active\n` +
                      `📩 *Inbox Detection:* ✅ Active\n` +
                      `🔄 *Collision Fix:* ✅ Active\n\n` +
                      `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
            }, { quoted: msg });

        } catch (e) {
            console.log("AD status error:", e.message);
        }
    }
};
