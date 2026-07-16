const puppeteer = require("puppeteer");
const { PuppeteerScreenRecorder } = require("puppeteer-screen-recorder");
const ffmpegPath = require("ffmpeg-static");
const fs = require("fs");
const path = require("path");
const os = require("os");

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    name: "svideo",
    category: 5, 
    description: "📹 වෙබ් අඩවියක් ස්ක්‍රෝල් කරලා Video එකක් හදන්න",
    commands: ["svideo", "webvideo", "scrollvideo"],

    handler: async ({ socket, msg, sender, command, args, reply }) => {
        
        let input = args.join(" ").trim();
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!input && quoted) {
            input = quoted.conversation || quoted.extendedTextMessage?.text || "";
        }

        const urlMatch = String(input).match(/https?:\/\/[^\s]+/i) || String(input).match(/[a-z0-9-\.]+\.[a-z]{2,}(\/[^\s]*)?/i);

        if (!urlMatch) {
            return reply(`📹 *Web Scrolling Video Generator*\n\n*Usage:* .svideo <website_url>\n*Example:* .svideo google.com\n_(හෝ ලින්ක් එකක් ඇති Message එකකට Reply කරන්න)_`);
        }

        let url = urlMatch[0];
        if (!url.startsWith("http")) url = "https://" + url;

        try {
            await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });
            await reply(`📹 _Capturing scrolling video of ${url}..._\n_This may take 20–40 seconds._`);

            const tempDir = os.tmpdir();
            const outputFile = path.join(tempDir, `scroll_${Date.now()}.mp4`);

            let browser = null;
            let page = null;
            let recorder = null;

            try {
                // සර්වර් එකේ Crash වෙන එක නවත්තන්න විශේෂිත විධානයන් (Server-optimized args)
                browser = await puppeteer.launch({
                    headless: true, // Server එකේ අනිවාර්යයෙන් true විය යුතුය
                    args: [
                        '--no-sandbox', 
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage', // RAM එක පිරෙන එක වලක්වයි
                        '--disable-gpu',           // Server එකට GPU නැති නිසා මේක අත්‍යවශ්‍යයි
                        '--single-process'
                    ]
                });
                
                page = await browser.newPage();
                await page.setViewport({ width: 1280, height: 800 });
                
                await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
                await wait(3000);

                recorder = new PuppeteerScreenRecorder(page, {
                    ffmpegPath: ffmpegPath,
                    fps: 24, // RAM භාවිතය අඩු කිරීමට FPS 24ට අඩු කළා
                    videoFrame: { width: 1280, height: 800 },
                    aspectRatio: '16:9',
                    videoCrf: 28, // Quality එක ගාණට තියලා Size එක අඩු කරනවා
                    videoCodec: 'libx264',
                    videoPreset: 'ultrafast',
                    videoBitrate: 1000, 
                    followNewTab: false,
                });

                await recorder.start(outputFile);
                await wait(2000); 

                await page.evaluate(async () => {
                    await new Promise((resolve) => {
                        let totalHeight = 0;
                        const distance = 400; 
                        const timer = setInterval(() => {
                            window.scrollBy(0, distance);
                            totalHeight += distance;
                            if (totalHeight >= document.body.scrollHeight) {
                                clearInterval(timer);
                                resolve();
                            }
                        }, 300); 
                    });
                });

                await wait(5000); 
                await recorder.stop();

                const buffer = fs.readFileSync(outputFile);
                const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
                
                if (buffer.length < 10000) throw new Error("Video too small or failed to record");

                const caption = `*↳ ❝ [📹 𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗪𝗲𝗯-𝗩𝗶𝗱𝗲𝗼 📹] ¡! ❞*\n\n` +
                                `🔗 *URL:* ${url}\n` +
                                `📦 *Size:* ${fileSizeMB} MB\n\n` +
                                `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                await socket.sendMessage(sender, {
                    document: buffer,
                    mimetype: "video/mp4",
                    fileName: `Sadew_Scroll_${Date.now()}.mp4`,
                    caption: caption
                }, { quoted: msg });

                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

            } finally {
                if (recorder) await recorder.stop().catch(() => {});
                if (browser) await browser.close().catch(() => {});
                if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
            }

        } catch (error) {
            console.error("Scroll video error:", error);
            await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
            
            // Error එක WhatsApp එකට එවනවා
            reply(`❌ *Video Capture Failed!*\n\n_ඔබගේ Hosting Server එකේ Google Chrome/Puppeteer ධාවනය කිරීමට අවශ්‍ය පහසුකම් නොමැත හෝ RAM එක ප්‍රමාණවත් නොවේ._\n\n*(Error: ${error.message.substring(0, 100)})*`);
        }
    }
};
