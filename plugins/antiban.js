/*
 * 🛡️ ANTI-BAN STEALTH SYSTEM v2
 * SADEW-MINI by Sadew Rashmika
 * 
 * ✅ Cmd run කරද්දි online → cmd ඉවර වුනාම offline
 * ✅ Typing indicator + Read receipts
 * ✅ Random delays (human-like)
 * ❌ Rate limiting නෑ (අයින් කළා)
 * ❌ 30sec auto online නෑ (අයින් කළා)
 */

// ═══════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════
const CONFIG = {
    MIN_TYPING_DELAY: 500,
    MAX_TYPING_DELAY: 1500,
    MIN_MSG_DELAY: 800,
    MAX_MSG_DELAY: 2000,
    MARK_READ: true,
};

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════
function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Track active command count per session
const activeCmds = {};

module.exports = {
    name: "antiban",
    category: "system",
    description: "Anti-Ban Stealth System — WhatsApp detection bypass",
    commands: ["antiban"],

    // ═══════════════════════════════════════════
    // AUTO-INIT
    // ═══════════════════════════════════════════
    init: (socket) => {
        const phoneNumber = socket.user?.id?.split(":")[0] || 'unknown';

        if (socket._antibanWrapped) {
            console.log(`🛡️ Anti-Ban already active for ${phoneNumber}`);
            return;
        }

        if (!activeCmds[phoneNumber]) activeCmds[phoneNumber] = 0;

        // ═══ WRAP sendMessage ═══
        const originalSendMessage = socket.sendMessage.bind(socket);

        socket.sendMessage = async (jid, content, options = {}) => {
            try {
                const isReaction = content.react !== undefined;
                const isStatusBroadcast = jid === 'status@broadcast';

                if (!isReaction && !isStatusBroadcast) {
                    // Simulate typing (inbox only)
                    const isGroup = jid.endsWith('@g.us');
                    if (!isGroup) {
                        try {
                            await socket.presenceSubscribe(jid);
                            await socket.sendPresenceUpdate('composing', jid);
                            await sleep(randomDelay(CONFIG.MIN_TYPING_DELAY, CONFIG.MAX_TYPING_DELAY));
                            await socket.sendPresenceUpdate('paused', jid);
                        } catch (_) {}
                    }

                    // Random delay
                    await sleep(randomDelay(CONFIG.MIN_MSG_DELAY, CONFIG.MAX_MSG_DELAY));
                }

                return await originalSendMessage(jid, content, options);
            } catch (e) {
                console.log(`🛡️ Anti-ban bypass: ${e.message}`);
                return await originalSendMessage(jid, content, options);
            }
        };

        // ═══ GO ONLINE when cmd starts, OFFLINE when cmd ends ═══
        socket.antiban_goOnline = async () => {
            activeCmds[phoneNumber]++;
            if (activeCmds[phoneNumber] === 1) {
                // First active cmd → go online
                try { await socket.sendPresenceUpdate('available'); } catch (_) {}
            }
        };

        socket.antiban_goOffline = async () => {
            activeCmds[phoneNumber] = Math.max(0, activeCmds[phoneNumber] - 1);
            if (activeCmds[phoneNumber] === 0) {
                // No more active cmds → go offline
                try { await socket.sendPresenceUpdate('unavailable'); } catch (_) {}
            }
        };

        // ═══ MARK MESSAGES AS READ ═══
        if (CONFIG.MARK_READ) {
            socket.ev.on('messages.upsert', async ({ messages }) => {
                try {
                    for (const msg of messages) {
                        if (!msg.key.fromMe && msg.key.remoteJid) {
                            setTimeout(async () => {
                                try { await socket.readMessages([msg.key]); } catch (_) {}
                            }, randomDelay(1000, 3000));
                        }
                    }
                } catch (_) {}
            });
        }

        // Start as offline
        try { socket.sendPresenceUpdate('unavailable'); } catch (_) {}

        socket._antibanWrapped = true;
        console.log(`🛡️ Anti-Ban Stealth v2 ACTIVATED for ${phoneNumber}`);
        console.log(`🛡️ Online: CMD time only | Rate Limit: NONE`);
    },

    // ═══════════════════════════════════════════
    // .antiban status command
    // ═══════════════════════════════════════════
    handler: async ({ socket, msg, sender }) => {
        const phoneNumber = socket.user?.id?.split(":")[0] || 'unknown';
        const isActive = socket._antibanWrapped ? '✅ Active' : '❌ Inactive';
        const cmdCount = activeCmds[phoneNumber] || 0;
        const onlineStatus = cmdCount > 0 ? '🟢 Online (CMD running)' : '⚫ Offline';

        await socket.sendMessage(sender, {
            text: `*↳ ❝ [🛡️ 𝗔𝗻𝘁𝗶-𝗕𝗮𝗻 𝗦𝘁𝗮𝘁𝘂𝘀 🛡️] ¡! ❞*\n\n` +
                  `🛡️ *Status:* ${isActive}\n` +
                  `📱 *Session:* ${phoneNumber}\n` +
                  `🌐 *Presence:* ${onlineStatus}\n` +
                  `🔄 *Active Commands:* ${cmdCount}\n\n` +
                  `⚙️ *Settings:*\n` +
                  `┊ 💬 Typing Delay: ${CONFIG.MIN_TYPING_DELAY}-${CONFIG.MAX_TYPING_DELAY}ms\n` +
                  `┊ ⏳ Message Gap: ${CONFIG.MIN_MSG_DELAY}-${CONFIG.MAX_MSG_DELAY}ms\n` +
                  `┊ 👀 Read Receipts: ${CONFIG.MARK_READ ? '✅' : '❌'}\n` +
                  `┊ 🟢 Online Mode: CMD time only\n` +
                  `┊ 📊 Rate Limit: NONE\n\n` +
                  `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`
        }, { quoted: msg });
    }
};
