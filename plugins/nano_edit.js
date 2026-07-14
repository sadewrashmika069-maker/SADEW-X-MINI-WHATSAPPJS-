const axios = require("axios");
const FormData = require("form-data");
const { downloadContentFromMessage, getContentType } = require("baileys");

/**
 * ⚡ AI-Friendly Image Uploader (Sadew-Mini System)
 */
async function uploadImageToPublicServer(buffer) {
    console.log("[SADEW-MINI UPLOADER] Uploading start...");
    const filename = `sadew_nano_${Date.now()}.jpg`;

    // --- Envs.sh ---
    try {
        const formData = new FormData();
        formData.append("file", buffer, { filename, contentType: "image/jpeg" });

        const response = await axios.post("https://envs.sh", formData, {
            headers: formData.getHeaders(),
            timeout: 20000,
        });

        if (response.data && String(response.data).includes("https://envs.sh/")) {
            let directUrl = String(response.data).trim();
            if (!directUrl.endsWith(".jpg") && !directUrl.endsWith(".jpeg")) {
                 directUrl = directUrl + "?ext=.jpg";
            }
            console.log("[SADEW-MINI UPLOADER] Envs.sh Success:", directUrl);
            return directUrl;
        }
    } catch (error) {
        console.error("[SADEW-MINI UPLOADER] Envs.sh Failed:", error.message);
    }

    // --- Uguu.se Backup ---
    try {
        const formData = new FormData();
        formData.append("files[]", buffer, { filename, contentType: "image/jpeg" });

        const response = await axios.post("https://uguu.se/upload.php", formData, {
            headers: formData.getHeaders(),
            timeout: 20000,
        });

        if (response.data?.success && response.data?.files?.[0]?.url) {
            const directUrl = response.data.files[0].url;
            console.log("[SADEW-MINI UPLOADER] Uguu.se Success:", directUrl);
            return directUrl;
        }
    } catch (error) {
        console.error("[SADEW-MINI UPLOADER] Uguu.se Failed:", error.message);
    }

    return null;
}

module.exports = {
    name: "nano_banana_editor",
    category: "ai",
    description: "Reply to an image with a prompt to edit it using Nano Banana API.",
    commands: ["nano", "nanoedit"], // කමාන්ඩ් එක .nano

    handler: async ({ socket, msg, sender, command, args }) => {
        try {
            console.log("[SADEW-MINI BOT] .nano command execution started.");
            const prompt = args.join(" ").trim();

            if (!prompt) {
                return await socket.sendMessage(sender, { 
                    text: `❌ *Usage:* Reply to an image and type:\n.${command} <your prompt>\n\nExample:\n.${command} make her hair blue\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*` 
                }, { quoted: msg });
            }

            // 🛑 Reply කරපු Image එක අල්ලගන්නවා
            const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
            const quotedMsg = contextInfo?.quotedMessage;
            
            if (!quotedMsg) {
                return await socket.sendMessage(sender, { text: "❌ *Error:* Please reply to an *Image* to edit it." }, { quoted: msg });
            }

            // ViewOnce Check
            const isViewOnce = quotedMsg.viewOnceMessage || quotedMsg.viewOnceMessageV2 || quotedMsg.viewOnceMessageV2Extension;
            let actualMessage = quotedMsg;
            
            if (isViewOnce) {
                actualMessage = quotedMsg.viewOnceMessage?.message || quotedMsg.viewOnceMessageV2?.message || quotedMsg.viewOnceMessageV2Extension?.message;
            }

            const type = getContentType(actualMessage);
            if (type !== 'imageMessage') {
                return await socket.sendMessage(sender, { text: "❌ *Error:* Please reply to a valid *Image*." }, { quoted: msg });
            }

            const imageMessage = actualMessage[type];

            // ⏳ Processing Start
            await socket.sendMessage(sender, { react: { text: "⏳", key: msg.key } });
            await socket.sendMessage(sender, { text: "⏳ _Downloading and processing image..._" }, { quoted: msg });

            // 1. Download WhatsApp Image to Buffer
            console.log("[SADEW-MINI BOT] Downloading media from WhatsApp...");
            const stream = await downloadContentFromMessage(imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            if (!buffer.length) {
                throw new Error("Downloaded buffer is empty.");
            }

            // 2. Upload to Public Server
            console.log("[SADEW-MINI BOT] Triggering public uploader...");
            const publicImageUrl = await uploadImageToPublicServer(buffer);

            if (!publicImageUrl) {
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                return await socket.sendMessage(sender, { text: "❌ *Error:* Failed to generate a public image link for the API." }, { quoted: msg });
            }

            // 3. API Request to Nano Banana
            console.log("[SADEW-MINI BOT] Sending request to Nano Banana API...");
            await socket.sendMessage(sender, { 
                text: `🍌 _Nano Banana is editing your image: "${prompt}"..._\n_Please wait a moment._` 
            }, { quoted: msg });
            
            const apiUrl = `https://apis.davidcyril.name.ng/nanobanana?url=${encodeURIComponent(publicImageUrl)}&prompt=${encodeURIComponent(prompt)}`;

            try {
                // Fetch from Nano Banana API
                const response = await axios.get(apiUrl, { timeout: 60000 });
                const apiData = response.data;
                console.log("[SADEW-MINI BOT] API Response:", JSON.stringify(apiData).substring(0, 150));

                if (!apiData.success || !apiData.result?.image) {
                    throw new Error("Nano Banana API failed to return the edited image.");
                }

                const editedImageUrl = apiData.result.image;

                // 4. Send Edited Image
                console.log("[SADEW-MINI BOT] Sending final image to user...");
                
                const finalCaption = `🍌 *Nano Banana Edit*\n\n📝 *Prompt:* ${prompt}\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                await socket.sendMessage(sender, {
                    image: { url: editedImageUrl },
                    caption: finalCaption
                }, { quoted: msg });

                await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

            } catch (apiError) {
                console.error("[SADEW-MINI BOT] API Error Caught:", apiError.message);
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                
                const errMsg = apiError.message.includes("timeout") 
                    ? "❌ *Timeout:* The API server took too long to respond. Please try again."
                    : `❌ *API Error:* ${apiError.message}`;
                    
                await socket.sendMessage(sender, { text: errMsg }, { quoted: msg });
            }

        } catch (globalError) {
            console.error("[SADEW-MINI BOT] GLOBAL ERROR OCCURRED:", globalError);
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
            await socket.sendMessage(sender, { 
                text: `❌ *Internal Error:* ${globalError.message}` 
            }, { quoted: msg });
        }
    }
};
