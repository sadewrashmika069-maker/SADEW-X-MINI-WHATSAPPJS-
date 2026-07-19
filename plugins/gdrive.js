const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_TOKEN = "VK4fry";
const API_BASE = "https://whiteshadow-x-api.onrender.com/api/download/gdrive";

function extractFileId(url) {
    let match = url.match(/\/file\/d\/([^\/]+)/);
    if (match) return match[1];
    match = url.match(/[?&]id=([^&]+)/);
    if (match) return match[1];
    match = url.match(/\/d\/([^\/]+)/);
    if (match) return match[1];
    return null;
}

module.exports = {
    name: "gdrive",
    category: 1, 
    description: "📁 Google Drive file එකක් ඩවුන්ලෝඩ් කරන්න (up to 2GB)",
    commands: ["gdrive", "gd", "googledrive"],

    handler: async ({ socket, msg, sender, command, args, reply }) => {
        const url = args.join(" ").trim();
        
        if (!url) {
            return reply(`📁 *Google Drive Downloader*\n\n*Usage:* .gdrive <google_drive_link>\n*Example:* .gdrive https://drive.google.com/file/d/xxxxx/view\n\n*Supports files up to 2GB*`);
        }

        // 🔥 FIX: drive.usercontent.google.com කියන එකත් අල්ලගන්නවා!
        if (!url.includes("drive.google.com") && !url.includes("drive.usercontent.google.com")) {
            return reply(`❌ *Invalid URL*\n\nPlease provide a valid Google Drive link.`);
        }

        const fileId = extractFileId(url);
        if (!fileId) {
            return reply(`❌ *Invalid Google Drive URL*\n\nCould not extract file ID.`);
        }

        await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });
        await reply(`🔍 *Processing Google Drive file...*\n📎 File ID: ${fileId}`);

        let tempFilePath;

        try {
            // 🔥 FIX: API එකට යවන්න කලින් ලින්ක් එක Standard විදිහට හදාගන්නවා
            const standardUrl = `https://drive.google.com/file/d/${fileId}/view`;
            const apiUrl = `${API_BASE}?url=${encodeURIComponent(standardUrl)}&apitoken=${API_TOKEN}`;
            
            const response = await axios.get(apiUrl, { timeout: 20000 });
            const data = response.data;

            if (!data || data.success !== true) {
                const errorMsg = data?.error || data?.message || "Unknown API error";
                throw new Error(errorMsg);
            }

            let downloadUrl = data.downloadUrl || data.download_url || data.url || data.result?.downloadUrl || data.result?.download_url || data.result?.url;

            const fileName = data.fileName || data.file_name || data.filename || data.result?.fileName || data.result?.file_name || `gdrive_${fileId}`;
            const fileSize = data.fileSize || data.file_size || data.size || data.result?.fileSize || data.result?.file_size || null;

            if (!downloadUrl) throw new Error("No download URL received from API");
            if (!downloadUrl.startsWith("http")) throw new Error("Invalid download URL format");

            let sizeMB = 0;
            if (fileSize) {
                if (typeof fileSize === 'string' && fileSize.includes('MB')) {
                    sizeMB = parseFloat(fileSize);
                } else if (typeof fileSize === 'string' && fileSize.includes('GB')) {
                    sizeMB = parseFloat(fileSize) * 1024;
                } else if (typeof fileSize === 'number') {
                    sizeMB = fileSize / (1024 * 1024);
                } else if (typeof fileSize === 'string') {
                    sizeMB = parseFloat(fileSize) || 0;
                }
            }

            if (sizeMB > 2000) {
                await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                return reply(`❌ *File is too large!*\n📦 Size: ${sizeMB.toFixed(2)} MB\n⚠️ WhatsApp document limit is 2GB.`);
            }

            await reply(`📥 *Downloading file...*\n📄 File: ${fileName}${fileSize ? `\n📦 Size: ${fileSize}` : ''}\n⏳ Please wait, this may take a few minutes for large files...`);

            let ext = 'file';
            let mimetype = 'application/octet-stream';
            const nameParts = fileName.split('.');
            if (nameParts.length > 1) {
                ext = nameParts.pop().toLowerCase();
            }

            const extMimeMap = {
                'apk': 'application/vnd.android.package-archive', 'mp4': 'video/mp4', 'mkv': 'video/x-matroska',
                'avi': 'video/x-msvideo', 'mov': 'video/quicktime', 'mp3': 'audio/mpeg', 'm4a': 'audio/mp4',
                'wav': 'audio/wav', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
                'gif': 'image/gif', 'webp': 'image/webp', 'pdf': 'application/pdf', 'zip': 'application/zip',
                'rar': 'application/x-rar-compressed', '7z': 'application/x-7z-compressed', 'txt': 'text/plain',
                'doc': 'application/msword', 'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'xls': 'application/vnd.ms-excel', 'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'ppt': 'application/vnd.ms-powerpoint', 'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'srt': 'text/plain'
            };
            mimetype = extMimeMap[ext] || 'application/octet-stream';
            const finalFileName = `${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

            tempFilePath = path.join(__dirname, finalFileName);
            const writer = fs.createWriteStream(tempFilePath);

            const fileRes = await axios({
                method: 'GET',
                url: downloadUrl,
                responseType: 'stream', 
                timeout: 0, 
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': '*/*'
                },
                maxRedirects: 5
            });

            fileRes.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            const stats = fs.statSync(tempFilePath);
            const actualSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

            if (stats.size > 2000 * 1024 * 1024) {
                await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
                if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
                return reply(`❌ *File is too large!*\n📦 Size: ${actualSizeMB} MB\n⚠️ WhatsApp document limit is 2GB.`);
            }

            const caption = `📁 *Google Drive Download Complete*\n\n📄 *File:* ${finalFileName}\n📦 *Size:* ${actualSizeMB} MB\n🔗 *File ID:* ${fileId}\n\n> *Powered by WhiteShadow API*`;

            await socket.sendMessage(sender, {
                document: { stream: fs.createReadStream(tempFilePath) },
                mimetype: mimetype,
                fileName: finalFileName,
                caption: caption
            }, { quoted: msg });

            await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });
            await reply(`✅ *Download complete!* (${actualSizeMB} MB)`);

            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }

        } catch (error) {
            console.error("GDrive error:", error);
            await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
            
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
            
            let errorMsg = `❌ *Download failed*\n\n`;
            if (error.message.includes("quota") || error.message.includes("limit")) {
                errorMsg += `Google Drive download limit reached.\n\n💡 Try again after a few minutes.`;
            } else if (error.message.includes("HTML")) {
                errorMsg += `File requires authentication.\n\n💡 Make sure the file is publicly shared.`;
            } else {
                errorMsg += `Error: ${error.message.substring(0, 150)}`;
            }
            await reply(errorMsg);
        }
    }
};
