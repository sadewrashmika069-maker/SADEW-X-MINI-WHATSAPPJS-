const fs = require("fs");
const path = require("path");
const os = require("os");

// Packages තියෙනවද කියලා මුලින්ම චෙක් කරනවා (නැත්නම් බොට් ලෝඩ් වෙන්නේ නෑ)
let puppeteer, PuppeteerScreenRecorder, ffmpegPath;
let isInstalled = false;

try {
    puppeteer = require("puppeteer");
    PuppeteerScreenRecorder = require("puppeteer-screen-recorder").PuppeteerScreenRecorder;
    ffmpegPath = require("ffmpeg-static");
    isInstalled = true;
} catch (err) {
    isInstalled = false; // Packages නැත්නම් False කරනවා
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    name: "svideo",
    category: 5,
    description: "📹 වෙබ් අඩවියක් ස්ක්‍රෝල් කරලා Video එකක් හදන්න",
    commands: ["svideo", "webvideo", "scrollvideo"],

    handler: async ({ socket, msg, sender, command, args, reply }) => {
        
        // 🔴 Package එක නැත්නම් කෙලින්ම දැනුවත් කරනවා
        if (!isInstalled) {
            return reply(`❌ *Packages Missing!*\n\nමෙම කමාන්ඩ් එක භාවිතා කිරීමට පෙර ඔබගේ සර්වර් එකේ පහත විධානය (Command) ලබාදී Packages Install කළ යුතුය:\n\n*Terminal/Console එකේ Type කරන්න:*\n\`\`\`npm install puppeteer puppeteer-screen-recorder ffmpeg-static\`\`\`\n\nඉන්පසු බොට්ව Restart කරන්න.`);
        }

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
                browser = await puppeteer.launch({
                    headless: "new",
                    args: [
                        '--no-sandbox', 
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage', 
                        '--disable-gpu',           
                        '--single-process'
                    ]
                });
                
                page = await browser.newPage();
                await page.setViewport({ width: 1280, height: 800 });
                
                await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
                await wait(3000);

                recorder = new PuppeteerScreenRecorder(page, {
                    ffmpegPath: ffmpegPath,
                    fps: 24,
                    videoFrame: { width: 1280, height: 800 },
                    aspectRatio: '16:9',
                    videoCrf: 28,
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
            reply(`❌ *Video Capture Failed!*\n\n_(Error: ${error.message.substring(0, 100)})*`);
        }
    }
};
