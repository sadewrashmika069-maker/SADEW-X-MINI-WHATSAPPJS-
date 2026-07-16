const axios = require("axios");

// ---------------- Helper Functions ----------------
function extractUrl(text) {
    const match = String(text || "").match(/https?:\/\/[^\s]+/i);
    return match ? match[0] : "";
}

function formatSize(bytes) {
    bytes = Number(bytes || 0);
    if (!bytes) return "Unknown";
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(2)} KB`;
}

function sanitizeFileName(name) {
    return String(name || "download_file")
        .replace(/[\\/:*?"<>|]/g, "_")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120);
}

function getFileInfo(url, contentType = "") {
    const cleanUrl = url.split("?")[0].toLowerCase();
    const ct = contentType.toLowerCase();

    if (ct.includes("video") || /\.(mp4|mkv|avi|mov|webm)$/.test(cleanUrl)) {
        return { mimetype: "video/mp4", ext: "mp4" };
    }
    if (ct.includes("audio") || /\.(mp3|m4a|ogg|wav|aac)$/.test(cleanUrl)) {
        return { mimetype: "audio/mpeg", ext: "mp3" };
    }
    if (ct.includes("image") || /\.(jpg|jpeg|png|webp)$/.test(cleanUrl)) {
        return { mimetype: "image/jpeg", ext: "jpg" };
    }
    if (ct.includes("pdf") || cleanUrl.endsWith(".pdf")) {
        return { mimetype: "application/pdf", ext: "pdf" };
    }
    if (/\.(zip|rar|7z)$/.test(cleanUrl)) {
        return { mimetype: "application/zip", ext: "zip" };
    }
    return { mimetype: "application/octet-stream", ext: "bin" };
}

function getNameFromUrl(url) {
    try {
        const parsed = new URL(url);
        const last = parsed.pathname.split("/").filter(Boolean).pop();
        return last ? decodeURIComponent(last) : "download_file";
    } catch {
        return "download_file";
    }
}

async function getRemoteFileMeta(url) {
    let fileSize = 0;
    let fileName = getNameFromUrl(url);
    let contentType = "";

    try {
        const res = await axios.head(url, {
            timeout: 15000,
            maxRedirects: 5,
            headers: { "User-Agent": "Mozilla/5.0" },
            validateStatus: (status) => status >= 200 && status < 400
        });

        fileSize = Number(res.headers["content-length"] || 0);
        contentType = String(res.headers["content-type"] || "");

        const cd = String(res.headers["content-disposition"] || "");
        const match = cd.match(/filename\*?=(?:UTF-8''|["']?)([^"';\n]+)/i);
        if (match?.[1]) fileName = decodeURIComponent(match[1].replace(/["']/g, ""));
    } catch (err) {
        // Some servers block HEAD request. It will proceed with default values.
    }

    const fileInfo = getFileInfo(url, contentType);
    fileName = sanitizeFileName(fileName);

    if (!/\.[a-z0-9]{2,5}$/i.test(fileName)) {
        fileName = `${fileName}.${fileInfo.ext}`;
    }

    return { fileSize, fileName, ...fileInfo };
}
// --------------------------------------------------

module.exports = {
    name: "directdl",
    category: 1, // Download Menu
    description: "📥 Direct URL එකක file එක WhatsApp document එකක් විදිහට ලබාගන්න",
    commands: ["dl", "download", "directdl"],

    handler: async ({ socket, msg, sender, command, args, reply }) => {
        
        // 1. Get the URL from args or quoted message
        let input = args.join(" ").trim();
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!input && quoted) {
            input = quoted.conversation || quoted.extendedTextMessage?.text || "";
        }

        const url = extractUrl(input);

        if (!url) {
            return reply(`❌ *Valid direct URL එකක් ලබා දෙන්න.*\n\n💡 *Usage:* .dl <url>\n*Example:* .dl https://example.com/file.mp4\n_(හෝ ලින්ක් එකක් ඇති Message එකකට Reply කරන්න)_`);
        }

        try {
            await socket.sendMessage(sender, { react: { text: '⬇️', key: msg.key } });

            // 2. Fetch File Metadata
            const meta = await getRemoteFileMeta(url);

            // WhatsApp limit is typically 2GB maximum for documents
            if (meta.fileSize > 1950 * 1024 * 1024) {
                await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                return reply(`❌ *මෙම File එක 2GB වලට වඩා විශාලයි.*\n\n📦 *Size:* ${formatSize(meta.fileSize)}`);
            }

            const downloadMsg = `*↳ ❝ [📥 𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗗𝗶𝗿𝗲𝗰𝘁-𝗗𝗟 📥] ¡! ❞*\n\n` +
                                `📄 *File:* ${meta.fileName}\n` +
                                `📦 *Size:* ${formatSize(meta.fileSize)}\n\n` +
                                `_⏳ WhatsApp වෙත Upload වෙමින් පවතී. කරුණාකර රැඳී සිටින්න..._\n\n` +
                                `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;
            
            await reply(downloadMsg);

            // 3. Send the file directly from URL
            await socket.sendMessage(sender, {
                document: { url: url },
                mimetype: meta.mimetype,
                fileName: meta.fileName,
                caption: `✅ *Download Complete*\n\n📄 ${meta.fileName}\n📦 ${formatSize(meta.fileSize)}\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄*`
            }, { quoted: msg });

            await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

        } catch (err) {
            console.error("Direct DL error:", err);
            await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });

            await reply(`❌ *Download Failed!*\n\n*හේතුව:* ${err.message}\n\n_Link එක expire වී, Private වී හෝ Server එක මගින් WhatsApp Upload block කර තිබිය හැක._`);
        }
    }
};
