const { generateForwardMessageContent, generateWAMessageFromContent, getContentType } = require("@whiskeysockets/baileys");

// ෆයිල් නම හොයාගැනීමේ ෆන්ක්ශන්
function getTextFromQuoted(quoted) {
    const msg = quoted?.message || {};
    const doc = msg.documentMessage || msg.documentWithCaptionMessage?.message?.documentMessage;
    return (
        doc?.caption ||
        msg.conversation ||
        msg.extendedTextMessage?.text ||
        msg.imageMessage?.caption ||
        msg.videoMessage?.caption ||
        ""
    );
}

function sanitizeFileName(name) {
    return String(name || "")
        .replace(/[\\/:*?"<>|]/g, "_")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 150);
}

function inferFileName(quoted) {
    const msg = quoted?.message || {};
    const doc = msg.documentMessage || msg.documentWithCaptionMessage?.message?.documentMessage;

    if (doc?.fileName) return sanitizeFileName(doc.fileName);
    if (doc?.title) return sanitizeFileName(doc.title);

    const text = getTextFromQuoted(quoted);
    const fileMatch = text.match(/[^\n\r]+?\.(mp4|mkv|avi|mov|pdf|zip|rar|7z|mp3|m4a|jpg|jpeg|png|webp)/i);
    if (fileMatch) return sanitizeFileName(fileMatch[0]);

    const firstLine = text.split("\n").find(Boolean);
    if (firstLine) return sanitizeFileName(firstLine) + ".mp4";
    return "";
}

function applyFileName(content, fileName) {
    if (!fileName) return;

    if (content.documentMessage) {
        content.documentMessage.fileName = fileName;
        content.documentMessage.title = fileName;
    }
    if (content.documentWithCaptionMessage?.message?.documentMessage) {
        content.documentWithCaptionMessage.message.documentMessage.fileName = fileName;
        content.documentWithCaptionMessage.message.documentMessage.title = fileName;
    }
}

module.exports = {
    name: "forward-message",
    category: 5,
    description: "Forward any file up to 2GB instantly with Custom Caption",
    commands: ["forward", "foward", "fw"],

    handler: async ({ socket, msg, sender, args, reply }) => {
        let targetText = args.join(" ").trim();
        if (!targetText) {
            return reply("📤 *Forward කරන්න අවශ්‍ය Number එක හෝ JID එක ලබා දෙන්න.*\n\n💡 උදා:\n`.forward 94712345678`\n`.fw 120363xxxx@g.us` (Group)");
        }

        let targetJid = targetText;
        if (!targetJid.includes("@")) {
            targetJid = targetText.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        }

        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        if (!contextInfo || !contextInfo.quotedMessage) {
            return reply("📌 *Forward කිරීමට අවශ්‍ය Message, Photo, Video හෝ Document එකට Reply කර මෙම Command එක ලබා දෙන්න.*");
        }

        const quotedMsg = {
            key: {
                remoteJid: msg.key.remoteJid,
                id: contextInfo.stanzaId,
                participant: contextInfo.participant
            },
            message: contextInfo.quotedMessage
        };

        try {
            await socket.sendMessage(sender, { react: { text: '📤', key: msg.key } });

            const content = await generateForwardMessageContent(quotedMsg, false);
            const type = getContentType(content);

            if (!type || !content[type]) {
                throw new Error("Forward Content ජෙනරේට් කිරීමට නොහැකි විය.");
            }

            // 🔥 1. ෆයිල් නම සහ Fancy Text එක හැදීම
            let originalFileName = inferFileName(quotedMsg) || "Media File";
            const fancyName = "🎀 𝘚𝘢𝘥𝘦𝘸 𝘔𝘪𝘯𝘪 🎀"; 
            
            // Document එකේ නමට ඉස්සරහින් Fancy Name එක එකතු කිරීම
            const newFileName = `[${fancyName}] ${originalFileName}`;
            applyFileName(content, newFileName);

            // 🔥 2. Custom Caption එක හැදීම (Powered by SADEW X MINI)
            const customCaption = `*↳ ❝ [ ${fancyName} ] ¡! ❞*\n\n📁 *Name:* ${originalFileName}\n\n> * 💞𝘗𝘰𝘸𝘦𝘳𝘦𝘥 𝘣𝘺 𝘚𝘈𝘋𝘌𝘞 𝘟 𝘔𝘐𝘕𝘐 😍*`;

            // 🔥 3. Caption එක Content එකට ඇතුළු කිරීම (Documents, Images, Videos වලට)
            if (content.documentMessage) {
                content.documentMessage.caption = customCaption;
            } else if (content.documentWithCaptionMessage?.message?.documentMessage) {
                content.documentWithCaptionMessage.message.documentMessage.caption = customCaption;
            } else if (content.imageMessage) {
                content.imageMessage.caption = customCaption;
            } else if (content.videoMessage) {
                content.videoMessage.caption = customCaption;
            }

            if (typeof content[type] === "object") {
                content[type].contextInfo = {
                    ...(content[type].contextInfo || {}),
                    forwardingScore: 999,
                    isForwarded: true
                };
            }

            const waMessage = await generateWAMessageFromContent(targetJid, content, {
                userJid: socket.user.id
            });

            await socket.relayMessage(targetJid, waMessage.message, {
                messageId: waMessage.key.id
            });

            await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });
            
            let successMsg = `*↳ ❝ [🎀 𝗦𝗮𝗱𝗲𝘄 𝗙𝗼𝗿𝘄𝗮𝗿𝗱𝗲𝗿 🎀] ¡! ❞*\n\n`;
            successMsg += `✅ *සාර්ථකව Forward කරන ලදී!*\n📍 *Target:* ${targetJid.split('@')[0]}\n\n`;
            successMsg += `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;
            
            await reply(successMsg);

        } catch (err) {
            console.error("Forward command error:", err);
            await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
            await reply(`❌ *Forward කිරීමට නොහැකි විය.*\n\nහේතුව: ${err.message}`);
        }
    }
};
