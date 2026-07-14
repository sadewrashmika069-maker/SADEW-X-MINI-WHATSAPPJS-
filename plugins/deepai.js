const axios = require("axios");
const FormData = require("form-data");
const { downloadContentFromMessage, getContentType } = require("@whiskeysockets/baileys");

// 🔄 DeepAI Bypass Endpoint & Token
const AI_EDIT_API_URL = "https://whiteshadow-x-api.onrender.com/api/ai/deepai-edit";
const API_TOKEN = "VK4fry"; 

/**
 * ⚡ AI-Friendly Image Uploader
 */
async function uploadImageToPublicServer(buffer) {
  console.log("[SADEW-MINI UPLOADER] Uploading start...");
  const filename = `sadew_edit_${Date.now()}.jpg`;

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

  // --- Uguu.se ---
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
    name: "ai_image_editor",
    category: "ai",
    description: "Reply to an image with a prompt to edit it using DeepAI.",
    commands: ["edit", "editimg", "imgedit", "deepai"],

    handler: async ({ socket, msg, sender, command, args }) => {
        try {
            console.log("[SADEW-MINI BOT] .edit command execution started.");
            const prompt = args.join(" ").trim();

            if (!prompt) {
                return await socket.sendMessage(sender, { 
                    text: `❌ *Usage:* Reply to an image and type:\n.${command} <your prompt>\n\nExample:\n.${command} make it cyberpunk\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*` 
                }, { quoted: msg });
            }

            // 🛑 Reply කරපු Image එක අල්ලගන්නවා
            const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
            const quotedMsg = contextInfo?.quotedMessage;
            
            if (!quotedMsg) {
                return await socket.sendMessage(sender, { text: "❌ *Error:* Please reply to an *Image* to edit it." }, { quoted: msg });
            }

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

            await socket.sendMessage(sender, { react: { text: "⏳", key: msg.key } });
            await socket.sendMessage(sender, { text: "⏳ _Downloading original image..._" }, { quoted: msg });

            // 1. Image Download (Baileys Buffer)
            console.log("[SADEW-MINI BOT] Downloading media from WhatsApp...");
            const stream = await downloadContentFromMessage(imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            if (!buffer.length) {
                throw new Error("Downloaded buffer is empty.");
            }

            // 2. Image Upload
            console.log("[SADEW-MINI BOT] Triggering public uploader...");
            await socket.sendMessage(sender, { text: "📤 _Generating public URL..._" }, { quoted: msg });
            const publicImageUrl = await uploadImageToPublicServer(buffer);

            if (!publicImageUrl) {
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                return await socket.sendMessage(sender, { text: "❌ *Error:* Failed to generate a clean public image link." }, { quoted: msg });
            }

            // 3. API Request
            console.log("[SADEW-MINI BOT] Sending request to WhiteShadow DeepAI URL:", publicImageUrl);
            await socket.sendMessage(sender, { 
                text: `🤖 _DeepAI (Bypass) Editing image: "${prompt}"..._\n\n⚠️ _Note: If the server is sleeping, this might take up to 60 seconds._` 
            }, { quoted: msg });
            
            const apiUrl = `${AI_EDIT_API_URL}?url=${encodeURIComponent(publicImageUrl)}&prompt=${encodeURIComponent(prompt)}&apitoken=${API_TOKEN}`;

            try {
                const response = await axios.get(apiUrl, { timeout: 60000 });
                const apiData = response.data;
                console.log("[SADEW-MINI BOT] API Data Received:", JSON.stringify(apiData).substring(0, 100));

                if (apiData.status !== "success" || !apiData.result?.edited_image_url) {
                    throw new Error(apiData.msg || apiData.result?.message || "DeepAI API returned an invalid response.");
                }

                const editedImageUrl = apiData.result.edited_image_url;

                // 4. Send Edited Image
                console.log("[SADEW-MINI BOT] Sending final image to user...");
                
                const finalCaption = `✨ *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 DeepAI Edit*\n\n📝 *Prompt:* ${prompt}\n🛡️ *Bypass System:* Active\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                await socket.sendMessage(sender, {
                    image: { url: editedImageUrl },
                    caption: finalCaption
                }, { quoted: msg });

                await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });

            } catch (apiError) {
                console.error("[SADEW-MINI BOT] Inner API Error Caught:", apiError.message);
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                
                let serverRawError = apiError.message;
                if (apiError.response?.data) {
                    serverRawError = typeof apiError.response.data === "object" 
                      ? JSON.stringify(apiError.response.data, null, 2) 
                      : String(apiError.response.data).slice(0, 200);
                }
                
                const errMsg = apiError.message.includes("timeout") 
                    ? "❌ *Timeout:* WhiteShadow Render server took too long to wake up. Please try again now!"
                    : `❌ *Error:* ${apiError.message}\n\n📊 *Server Response:* \`\`\`${serverRawError}\`\`\``;
                    
                await socket.sendMessage(sender, { text: errMsg }, { quoted: msg });
            }

        } catch (globalError) {
            console.error("[SADEW-MINI BOT] CRITICAL GLOBAL ERROR OCCURRED:", globalError);
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
            await socket.sendMessage(sender, { 
                text: `❌ *Sadew-Mini Internal Error:* ${globalError.message}\n\nPlease check logs.` 
            }, { quoted: msg });
        }
    }
};
