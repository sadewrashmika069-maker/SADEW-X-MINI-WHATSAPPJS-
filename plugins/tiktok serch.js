const axios = require("axios");
const {
    generateWAMessageFromContent,
    prepareWAMessageMedia,
    proto,
} = require("baileys"); // Spacky eke @whiskeysockets/baileys kiyala thibba eka Sadew-Mini ekata match wenna haduwa

const TIKWM_SEARCH_API = "https://tikwm.com/api/feed/search";
const MAX_RESULTS = 5; // Loading time eka adu karanna 5k kara
const MAX_VIDEO_MB = 80;
const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;

const EMOJI_SEARCH = "🔍";
const EMOJI_SUCCESS = "⚡";
const EMOJI_ERROR = "❌";
const EMOJI_DOWNLOAD = "📥";
const OUTER_HEADER_TITLE = toFullWidth("𝐥𝐥ı𝐥𝐥ı ıllıllı ★彡 *👑ＳＡＤＥＷ－Ｘ－ＭＤ*🔥 彡★ ıllıı 𝐥𝐥ı𝐥𝐥ı");
const OUTER_FOOTER_TEXT = "| POWERED BY 👑𝙎𝘼𝘿𝙀𝙒-𝙓-𝙈𝘿🔥";
const CARD_FOOTER_TEXT = "👑𝙎𝘼𝘿𝙀𝙒-𝙓-𝙈𝘿🔥";

function toFullWidth(text) {
    return String(text).replace(/[A-Z0-9.]/g, (char) => {
        if (char === ".") return "\uFF0E";
        return String.fromCharCode(char.charCodeAt(0) + 0xfee0);
    });
}

function truncateText(value, maxLength) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1)}\u2026`;
}

function pickFirstString(...values) {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
}

function toAbsoluteTikwmUrl(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("/")) return `https://tikwm.com${url}`;
    return url;
}

function createProto(type, value) {
    if (type?.fromObject) return type.fromObject(value);
    if (type?.create) return type.create(value);
    return value;
}

function buildTikTokPageUrl(video) {
    const id = pickFirstString(video.id, video.video_id, video.aweme_id);
    const username = pickFirstString(
        video.author?.unique_id,
        video.author?.username,
        video.author_unique_id,
        video.username,
        video.unique_id
    );

    if (id && username) return `https://www.tiktok.com/@${username}/video/${id}`;
    return "";
}

function normalizeVideo(rawVideo, index) {
    const title = pickFirstString(
        rawVideo.title,
        rawVideo.caption,
        rawVideo.desc,
        rawVideo.description,
        rawVideo.text,
        `TikTok Result ${index + 1}`
    );
    const body = pickFirstString(
        rawVideo.caption,
        rawVideo.desc,
        rawVideo.hashtags,
        title
    );
    
    // HD Video ekata Priority denawa
    const directVideo = toAbsoluteTikwmUrl(
        pickFirstString(
            rawVideo.hdplay,
            rawVideo.play,
            rawVideo.wmplay,
            rawVideo.video,
            rawVideo.video_url,
            rawVideo.play_url
        )
    );
    const pageUrl = pickFirstString(
        rawVideo.url,
        rawVideo.link,
        buildTikTokPageUrl(rawVideo)
    );

    return { title, body, directVideo, url: pageUrl || directVideo };
}

async function fetchTikwmResults(searchQuery) {
    const body = newSearchParams({
        keywords: searchQuery,
        count: String(MAX_RESULTS),
        cursor: "0",
        hd: "1"
    });

    const { data } = await axios.post(TIKWM_SEARCH_API, body, {
        timeout: 15000,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0",
            Referer: "https://tikwm.com/",
        },
    });

    let results = [];
    if (Array.isArray(data?.data)) results = data.data;
    else if (Array.isArray(data?.data?.videos)) results = data.data.videos;

    return results.map(normalizeVideo);
}

async function downloadVideoBuffer(url) {
    const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 25000,
        maxContentLength: MAX_VIDEO_BYTES,
        maxBodyLength: MAX_VIDEO_BYTES,
        headers: { "User-Agent": "Mozilla/5.0", Referer: "https://tikwm.com/" },
    });

    const buffer = Buffer.from(response.data);
    if (!buffer.length) throw new Error("Downloaded video buffer is empty");
    return buffer;
}

async function prepareVideoHeader(socket, video) {
    if (!video.directVideo) throw new Error("Missing direct video URL");
    const buffer = await downloadVideoBuffer(video.directVideo);
    
    const media = await prepareWAMessageMedia(
        { video: buffer, mimetype: "video/mp4" },
        { upload: socket.waUploadToServer }
    );

    if (!media.videoMessage) throw new Error("Baileys did not create videoMessage");
    media.videoMessage.mimetype = "video/mp4";
    media.videoMessage.gifPlayback = false;

    return media.videoMessage;
}

async function buildCarouselCards(socket, videos) {
    const InteractiveMessage = proto.Message.InteractiveMessage;
    const cards = [];

    for (const video of videos) {
        try {
            const videoMessage = await prepareVideoHeader(socket, video);
            const card = createProto(InteractiveMessage, {
                header: createProto(InteractiveMessage.Header, {
                    title: truncateText(video.title, 30),
                    hasMediaAttachment: true,
                    videoMessage,
                }),
                body: createProto(InteractiveMessage.Body, {
                    text: truncateText(video.body, 60),
                }),
                footer: createProto(InteractiveMessage.Footer, {
                    text: CARD_FOOTER_TEXT,
                }),
                nativeFlowMessage: createProto(InteractiveMessage.NativeFlowMessage, {
                    buttons: [{
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                            display_text: `${EMOJI_DOWNLOAD} Download Video`,
                            id: `.tt ${video.url}`,
                        }),
                    }],
                }),
            });
            cards.push(card);
        } catch (error) {
            console.error(`TS video card skipped: ${video.title}`, error.message);
        }
    }
    return cards;
}

module.exports = {
    name: "tiktok-carousel-search",
    category: 1, 
    description: "Search TikTok videos and display in a beautiful HD carousel grid.",
    commands: ["ts", "tiktoksearch", "tsearch"],

    handler: async ({ socket, msg, sender, args, reply }) => {
        const searchQuery = args.join(" ").trim();

        if (!searchQuery) {
            return reply(`${EMOJI_ERROR} *Usage:* \`.ts sadew\` හෝ \`.ts trending\``);
        }

        try {
            await socket.sendMessage(sender, { react: { text: EMOJI_SEARCH, key: msg.key } });

            // Only TikWM (Dead WhiteShadow අයින් කලා)
            const videos = await fetchTikwmResults(searchQuery);
            const usable = videos.filter((video) => video.url && video.directVideo).slice(0, MAX_RESULTS);

            if (!usable.length) throw new Error("No downloadable TikTok videos found");

            try {
                const InteractiveMessage = proto.Message.InteractiveMessage;
                const CarouselMessage = InteractiveMessage?.CarouselMessage || proto.Message.CarouselMessage;

                const cards = await buildCarouselCards(socket, usable);
                if (!cards.length) throw new Error("Could not process any video cards");

                const interactiveMessage = createProto(InteractiveMessage, {
                    header: createProto(InteractiveMessage.Header, {
                        title: OUTER_HEADER_TITLE,
                        hasMediaAttachment: false,
                    }),
                    body: createProto(InteractiveMessage.Body, {
                        text: `${EMOJI_SEARCH} TikTok Search: ${searchQuery}`,
                    }),
                    footer: createProto(InteractiveMessage.Footer, {
                        text: OUTER_FOOTER_TEXT,
                    }),
                    carouselMessage: createProto(CarouselMessage, {
                        cards,
                        messageVersion: 1,
                    }),
                });

                const message = generateWAMessageFromContent(
                    sender,
                    {
                        viewOnceMessage: {
                            message: {
                                messageContextInfo: {
                                    deviceListMetadata: {},
                                    deviceListMetadataVersion: 2,
                                },
                                interactiveMessage,
                            },
                        },
                    },
                    { quoted: msg }
                );

                await socket.relayMessage(sender, message.message, {
                    messageId: message.key.id,
                });

            } catch (carouselError) {
                console.error("Carousel failed, sending text fallback:", carouselError);
                
                // යම් හෙයකින් Carousel එක බ්ලොක් වුණොත්, Spacky එකේ වගේම ඔටෝමැටික් Text List එක එවනවා
                const lines = [
                    `${EMOJI_SEARCH} TikTok search results for: ${searchQuery}`,
                    "",
                    ...usable.map((video, index) => {
                        const title = truncateText(video.title || `TikTok Result ${index + 1}`, 80);
                        return `*${index + 1}.* ${title}\n📥 Download: .tt ${video.url}`;
                    }),
                ];
                await reply(lines.join("\n\n"));
            }

            await socket.sendMessage(sender, { react: { text: EMOJI_SUCCESS, key: msg.key } });

        } catch (error) {
            console.error("Main TS Command Error:", error);
            await socket.sendMessage(sender, { react: { text: EMOJI_ERROR, key: msg.key } });
            return reply(`${EMOJI_ERROR} TikTok search failed.\nReason: API දෝෂයකි, පසුව උත්සාහ කරන්න.`);
        }
    }
};
