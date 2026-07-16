const puppeteer = require("puppeteer");
const { PuppeteerScreenRecorder } = require("puppeteer-screen-recorder");
const ffmpegPath = require("ffmpeg-static");
const fs = require("fs");
const path = require("path");
const os = require("os");

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    name: "svideo",
    category: 5, // Tools & Edits
    description: "📹 වෙබ් අඩවියක් ස්ක්‍රෝල් කරලා Video එකක් හදන්න",
    commands: ["svideo", "webvideo", "scrollvideo"],

    handler: async ({ socket, msg, sender, command, args, reply }) => {
        
        // 1. Get the URL from args or quoted message
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

            // සර්වර් එකේ Temp ෆෝල්ඩරය පාවිච්චි කිරීම වඩාත් ආරක්ෂිතයි (Errors එන එක අඩුයි)
            const tempDir = os.tmpdir();
            const outputFile = path.join(tempDir, `scroll_${Date.now()}.mp4`);

            let browser = null;
            let page = null;
            let recorder = null;

            try {
                // Puppeteer Browser එක විවෘත කිරීම
                browser = await puppeteer.launch({
                    headless: "new", // අලුත්ම Headless Mode එක
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
                page = await browser.newPage();
                await page.setViewport({ width: 1280, height: 800 });
                
                // වෙබ් අඩවියට පිවිසීම
                await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
                await wait(3000);

                // Recorder එක සකස් කිරීම
                recorder = new PuppeteerScreenRecorder(page, {
                    ffmpegPath: ffmpegPath,
                    fps: 30,
                    videoFrame: { width: 1280, height: 800 },
                    aspectRatio: '16:9',
                    videoCrf: 18,
                    videoCodec: 'libx264',
                    videoPreset: 'ultrafast',
                    videoBitrate: 2000,
                    followNewTab: false,
                });

                // Record වීම ආරම්භ කිරීම
                await recorder.start(outputFile);
                await wait(2000); 

                // Smooth Scrolling 
                await page.evaluate(async () => {
                    await new Promise((resolve) => {
                        let totalHeight = 0;
                        const distance = 400; // එක පාරක් යටට යන ප්‍රමාණය
                        const timer = setInterval(() => {
                            window.scrollBy(0, distance);
                            totalHeight += distance;
                            if (totalHeight >= document.body.scrollHeight) {
                                clearInterval(timer);
                                resolve();
                            }
                        }, 300); // වේගය
                    });
                });

                await wait(5000); // අන්තිමට ටිකක් වෙලා ඉඳලා රෙකෝඩින් එක නවත්තන්න
                await recorder.stop();

                // ෆයිල් එක කියවීම
                const buffer = fs.readFileSync(outputFile);
                const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
                
                if (buffer.length < 10000) throw new Error("Video too small or failed to record");

                const caption = `*↳ ❝ [📹 𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗪𝗲𝗯-𝗩𝗶𝗱𝗲𝗼 📹] ¡! ❞*\n\n` +
                                `🔗 *URL:* ${url}\n` +
                                `📦 *Size:* ${fileSizeMB} MB\n\n` +
                                `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                // WhatsApp Quality එක අඩුවෙන එක වලක්වන්න Document එකක් විදිහටම යවනවා
                await socket.sendMessage(sender, {
                    document: buffer,
                    mimetype: "video/mp4",
                    fileName: `Sadew_Scroll_${Date.now()}.mp4`,
                    caption: caption
                }, { quoted: msg });

                await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });

            } finally {
                // වැඩේ ඉවර වුණාම Browser එක වහලා Temp ෆයිල් මකලා දානවා (Server එකේ ඉඩ පිරෙන එක නවත්තන්න)
                if (recorder) await recorder.stop().catch(() => {});
                if (browser) await browser.close().catch(() => {});
                if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
            }

        } catch (error) {
            console.error("Scroll video error:", error);
            await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
            reply(`❌ *Failed to capture scrolling video*\n\n_අදාළ වෙබ් අඩවියට පිවිසීමට නොහැක හෝ සේවාදායකයේ දෝෂයකි._\n(Error: ${error.message.substring(0, 100)})`);
        }
    }
};
