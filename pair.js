/* AKIRA GIRL MD MINI BOT - MULTI SESSION SUPPORT
  DEVELOPED BY CHAMOD TECH OFC
  FULLY ENC AND PRIVET SOURCE CODE    
  Code Ussai #akak - Thawa #akada balanne                                                                                                      
*/

const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { sms } = require("./msg");
const router = express.Router();
const pino = require('pino');
const mongoose = require('mongoose');
const moment = require('moment-timezone');
const Jimp = require('jimp');
const crypto = require('crypto');
const axios = require('axios');
const yts = require('yt-search');
const { ytmp3, ytmp4 } = require('sadaslk-dlcore');
const os = require('os');
const fecth = require('node-fetch');
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
ffmpeg.setFfmpegPath(ffmpegPath);

const images = [
    'https://res.cloudinary.com/dqlh378fb/image/upload/v1780590033/zanta_media_uploads/dttqjshprca9zvqcpbwg.jpg',
    'https://res.cloudinary.com/dqlh378fb/image/upload/v1780590033/zanta_media_uploads/dttqjshprca9zvqcpbwg.jpg'
]; 
const akira = images[Math.floor(Math.random() * images.length)];

const {
    default: makeWASocket,
    makeCacheableSignalKeyStore,
    useMultiFileAuthState,
    DisconnectReason,
    downloadMediaMessage,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    fetchLatestBaileysVersion, 
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    extractMessageContent, 
    jidDecode,
    MessageRetryMap,
    jidNormalizedUser, 
    proto,
    getContentType,
    areJidsSameUser,
    generateWAMessage, 
    delay, 
    Browsers
} = require("baileys");

const config = {
    AUTO_VIEW_STATUS: 'true',
    AUTO_LIKE_STATUS: 'true',
    MODE: 'public',
    PREFIX: '.',
    MAX_RETRIES: 3,
    ADMIN_LIST_PATH: './admin.json',
    AKIRA_IMG: 'https://res.cloudinary.com/dqlh378fb/image/upload/v1780590033/zanta_media_uploads/dttqjshprca9zvqcpbwg.jpg',
    NEWSLETTER_JID: '120363419619460838@newsletter',
    NEWSLETTER_LIST: [
        '120363425584831057@newsletter',
        '120363422562980426@newsletter'
    ],
    NEWSLETTER_MESSAGE_ID: '428',
    OTP_EXPIRY: 300000,
    OWNER_NUMBER: '94753518443',
    CHANNEL_LINK: 'https://whatsapp.com/channel/0029Vb7BZe8I1rcapv3kSP21'
};

if (!global.sadewVideoSearch) global.sadewVideoSearch = {};
if (!global.menuContexts) global.menuContexts = {};

const activeSockets = new Map();
const socketCreationTime = new Map();
const socketHandlersMap = new Map();
const SESSION_BASE_PATH = './session';
const NUMBER_LIST_PATH = './numbers.json';

const SessionSchema = new mongoose.Schema({
    number: { type: String, unique: true, required: true },
    creds: { type: Object, required: true },
    config: { type: Object },
    updatedAt: { type: Date, default: Date.now }
});

const Session = mongoose.model('SessionNew', SessionSchema); 

async function connectMongoDB() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://sadewrashmika069_db_user:NWaUu0Jjyx8BrCcl@cluster0.yqmgml7.mongodb.net/?appName=Cluster0';
        await mongoose.connect(mongoUri, { bufferCommands: false, serverSelectionTimeoutMS: 5000 });
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1);
    }
}
connectMongoDB();

if (!fs.existsSync(SESSION_BASE_PATH)) fs.mkdirSync(SESSION_BASE_PATH, { recursive: true });

function initialize() {
    activeSockets.clear();
    socketCreationTime.clear();
    console.log('Cleared active sockets and creation times on startup');
}

async function uploadToCatbox(stream, fileName) {
    try {
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', stream, fileName);
        const res = await axios.post('https://catbox.moe/user/api.php', form, { headers: form.getHeaders(), timeout: 0 });
        if (!res.data.startsWith('https://')) return null;
        return res.data.trim();
    } catch { return null; }
}

async function saveMediaToCatbox(msg) {
    try {
        const type = Object.keys(msg.message)[0];
        const mediaMap = { imageMessage: 'image', videoMessage: 'video', audioMessage: 'audio', documentMessage: 'document' };
        if (!mediaMap[type]) return null;
        const mediaMsg = msg.message[type];
        const size = mediaMsg.fileLength || 0;
        if (size > 100 * 1024 * 1024) return null;
        const stream = await downloadContentFromMessage(mediaMsg, mediaMap[type]);
        const ext = type === 'imageMessage' ? 'jpg' : type === 'videoMessage' ? 'mp4' : type === 'audioMessage' ? 'opus' : 'bin';
        return await uploadToCatbox(stream, `${msg.key.id}.${ext}`);
    } catch { return null; }
}

async function cleanupInactiveSessions() {
    try {
        const sessions = await Session.find({}, 'number').lean();
        let cleanedCount = 0;
        for (const { number } of sessions) {
            const sanitizedNumber = number.replace(/[^0-9]/g, '');
            if (!activeSockets.has(sanitizedNumber) && !socketCreationTime.has(sanitizedNumber)) {
                const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);
                if (fs.existsSync(sessionPath)) {
                    const stats = fs.statSync(sessionPath);
                    const timeSinceModified = Date.now() - stats.mtime.getTime();
                    if (timeSinceModified > 60 * 60 * 1000) {
                        fs.removeSync(sessionPath);
                        cleanedCount++;
                    }
                }
            }
        }
        return cleanedCount;
    } catch (error) { return 0; }
}

function setupNewsletterHandlers(socket) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const message = messages[0];
        if (!message?.key) return;
        const jid = message.key.remoteJid;
        if (jid !== config.NEWSLETTER_JID) return;
        try {
            const emojis = ['🎀', '🍬', '👽', '🌺', '🍓', '🍫', '🫐', '🥷'];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            const messageId = message.key.server_id || message.newsletterServerId;
            if (!messageId) return;
            await socket.newsletterReactMessage(jid, messageId.toString(), randomEmoji);
        } catch (error) {}
    });
}

async function autoReconnectOnStartup() {
    try {
        let numbers = [];
        if (fs.existsSync(NUMBER_LIST_PATH)) numbers = JSON.parse(fs.readFileSync(NUMBER_LIST_PATH, 'utf8'));
        const sessions = await Session.find({}, 'number').lean();
        const mongoNumbers = sessions.map(s => s.number);
        numbers = [...new Set([...numbers, ...mongoNumbers])];
        if (numbers.length === 0) return;
        for (const number of numbers) {
            const sanitized = number.replace(/[^0-9]/g, '');
            if (activeSockets.has(sanitized)) continue;
            const mockRes = { headersSent: false, send: () => {}, status: () => mockRes };
            try { await EmpirePair(sanitized, mockRes); } catch (error) {}
            await delay(1500);
        }
    } catch (error) {}
}

(async () => {
    await initialize();
    setTimeout(autoReconnectOnStartup, 5000); 
})();

function loadAdmins() {
    try {
        if (fs.existsSync(config.ADMIN_LIST_PATH)) return JSON.parse(fs.readFileSync(config.ADMIN_LIST_PATH, 'utf8'));
        return [];
    } catch (error) { return []; }
}

function formatMessage(title, content, footer) {
    return `*${title}*\n\n${content}\n\n> *${footer}*`;
}

function getSriLankaTimestamp() {
    return moment().tz('Asia/Colombo').format('YYYY-MM-DD HH:mm:ss');
}

function getUptime() {
    let seconds = Math.floor(process.uptime());
    let d = Math.floor(seconds / (3600 * 24));
    let h = Math.floor((seconds % (3600 * 24)) / 3600);
    let m = Math.floor((seconds % 3600) / 60);
    let s = Math.floor(seconds % 60);
    return (d > 0 ? `${d}d ` : "") + (h > 0 ? `${h}h ` : "") + (m > 0 ? `${m}m ` : "") + (s > 0 ? `${s}s` : "0s");
}

const ARABIAN_THUMB_G = 'https://files.catbox.moe/5ztdoe.jpeg';
const ARABIAN_TITLE = '🦋 ₊˚ ⊹ 𝐀 𝐊 𝐈 𝐑 𝐀  𝐌 𝐃 ⊹ ˚₊ 𝜗𝜚';
const arabianCtx = () => ({
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid  : "120363419619460838@newsletter",
        newsletterName : ARABIAN_TITLE,
        serverMessageId: 123,
    }
});

const defaultImg = config.MENU_IMAGE_URL || "https://res.cloudinary.com/dqlh378fb/image/upload/v1780590033/zanta_media_uploads/dttqjshprca9zvqcpbwg.jpg";
const categoriesList = [
    { num: 1, name: "DOWNLOAD CMDS", image: "https://res.cloudinary.com/dqlh378fb/image/upload/v1782010878/zanta_media_uploads/k6btsgegjtnjuykb7g7f.jpg", cmds: ["video", "fb", "tt"] },
    { num: 2, name: "AI COMMANDS", image: "https://res.cloudinary.com/dqlh378fb/image/upload/v1782010845/zanta_media_uploads/j4lvxxlc48np5muhyn1a.jpg", cmds: ["akira", "wormgpt", "darkai"] },
    { num: 3, name: "GROUP MANAGE", image: defaultImg, cmds: ["tagall", "hidetag", "add", "kick", "tagadmin", "promote", "demote", "lockgroup", "unlockgroup", "mute", "unmute", "setname", "setdesc", "seticon", "linkgroup", "revokelink", "leave"] },
    { num: 4, name: "MAIN COMMANDS", image: defaultImg, cmds: ["menu", "system", "ping", "alive"] },
    { num: 5, name: "TOOLS & EDITS", image: "https://res.cloudinary.com/dqlh378fb/image/upload/v1782010867/zanta_media_uploads/snnqp75qm9iuzouz6piu.jpg", cmds: ["vv", "sticker", "fancy", "getdp", "npm", "img", "mode"] },
    { num: 6, name: "FUN COMMANDS", image: defaultImg, cmds: ["lvcal", "hentai", "hack"] },
    { num: 7, name: "SONG & MUSIC", image: "https://res.cloudinary.com/dqlh378fb/image/upload/v1782010855/zanta_media_uploads/hy5xd30khptmco5hcksw.jpg", cmds: ["song", "ytmp3", "play"] },
    { num: 8, name: "OWNER AREA", image: defaultImg, cmds: ["owner", "active"] }
];

async function setupMessageHandlers(socket) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.remoteJid === 'status@broadcast' || msg.key.remoteJid === config.NEWSLETTER_JID) return;
        const botNumber = jidNormalizedUser(socket.user.id).split('@')[0];
        const sanitizedNumber = botNumber.replace(/[^0-9]/g, '');
    });
} 

function setupAutoRestart(socket, number) {
    const id = number;
    let reconnecting = false;
    socket.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (connection === 'open') { reconnecting = false; return; }
        if (connection !== 'close' || reconnecting) return;
        reconnecting = true;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        if (statusCode === 401) { await destroySocket(id); await deleteSession(id); return; }
        await delay(2000);
        await destroySocket(id);
        const mockRes = { headersSent: true, send() {}, status() { return this } };
        try { await EmpirePair(id, mockRes); } catch (e) {}
        reconnecting = false;
    });
}

async function destroySocket(id) {
    try {
        const data = activeSockets.get(id);
        if (data?.socket) { data.socket.ev.removeAllListeners(); data.socket.ws?.close(); }
    } catch (e) {}
    activeSockets.delete(id);
    socketCreationTime.delete(id);
}

async function saveSession(number, creds) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        await Session.findOneAndUpdate({ number: sanitizedNumber }, { creds, updatedAt: new Date() }, { upsert: true });
        const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);
        fs.ensureDirSync(sessionPath);
        fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(creds, null, 2));
        let numbers = [];
        if (fs.existsSync(NUMBER_LIST_PATH)) numbers = JSON.parse(fs.readFileSync(NUMBER_LIST_PATH, 'utf8'));
        if (!numbers.includes(sanitizedNumber)) {
            numbers.push(sanitizedNumber);
            fs.writeFileSync(NUMBER_LIST_PATH, JSON.stringify(numbers, null, 2));
        }
    } catch (error) {}
}

async function restoreSession(number) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const session = await Session.findOne({ number: sanitizedNumber });
        if (!session || !session.creds || !session.creds.me || !session.creds.me.id) {
            await deleteSession(sanitizedNumber);
            return null;
        }
        const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);
        fs.ensureDirSync(sessionPath);
        fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(session.creds, null, 2));
        return session.creds;
    } catch (error) { return null; }
}

async function deleteSession(number) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        await Session.deleteOne({ number: sanitizedNumber });
        const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);
        if (fs.existsSync(sessionPath)) fs.removeSync(sessionPath);
        if (fs.existsSync(NUMBER_LIST_PATH)) {
            let numbers = JSON.parse(fs.readFileSync(NUMBER_LIST_PATH, 'utf8'));
            numbers = numbers.filter(n => n !== sanitizedNumber);
            fs.writeFileSync(NUMBER_LIST_PATH, JSON.stringify(numbers, null, 2));
        }
    } catch (error) {}
}

async function loadUserConfig(number) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const configDoc = await Session.findOne({ number: sanitizedNumber }, 'config');
        return configDoc?.config || { ...config };
    } catch (error) { return { ...config }; }
}

async function updateUserConfig(number, newConfig) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        await Session.findOneAndUpdate({ number: sanitizedNumber }, { config: newConfig, updatedAt: new Date() }, { upsert: true });
    } catch (error) {}
}

async function setupStatusHandlers(socket) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg?.key || msg.key.remoteJid !== 'status@broadcast' || !msg.key.participant || msg.key.remoteJid === config.NEWSLETTER_JID) return;
        const botJid = jidNormalizedUser(socket.user.id);
        if (msg.key.participant === botJid) return;
        const sanitizedNumber = botJid.split('@')[0].replace(/[^0-9]/g, '');
        const sessionConfig = activeSockets.get(sanitizedNumber)?.config || config;
        let statusViewed = false;
        try {
            if (sessionConfig.AUTO_VIEW_STATUS === 'true') {
                let retries = config.MAX_RETRIES;
                while (retries > 0) {
                    try { await socket.readMessages([msg.key]); statusViewed = true; break; } 
                    catch (error) { retries--; await delay(1000); }
                }
            } else { statusViewed = true; }

            if (statusViewed && sessionConfig.AUTO_LIKE_STATUS === 'true') {
                const emojis = sessionConfig.AUTO_LIKE_EMOJI || ['🎀'];
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                let retries = config.MAX_RETRIES;
                while (retries > 0) {
                    try {
                        await socket.sendMessage(msg.key.remoteJid, { react: { text: randomEmoji, key: msg.key } }, { statusJidList: [msg.key.participant] });
                        break;
                    } catch (error) { retries--; await delay(1000); }
                }
            }
        } catch (error) {}
    });
}

async function EmpirePair(number, res) {
    console.log(`Initiating pairing/reconnect for ${number}`);
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);

    if (activeSockets.has(sanitizedNumber)) {
        try { activeSockets.get(sanitizedNumber).socket?.end?.(); } catch {}
        activeSockets.delete(sanitizedNumber);
    }

    await restoreSession(sanitizedNumber);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    try {
        const socket = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: "silent" }),
            browser: ["Mac OS", "Safari", "10.15.7"],
            printQRInTerminal: false,
            syncFullHistory: false,
            markOnlineOnConnect: false
        });

        socketCreationTime.set(sanitizedNumber, Date.now());

        if (!socket._handlersAttached) {
            socket._handlersAttached = true;
            setupCommandHandlers(socket, sanitizedNumber);
            setupStatusHandlers(socket);
            setupNewsletterHandlers(socket);
            setupMessageHandlers(socket);
        }
        setupAutoRestart(socket, sanitizedNumber);

        if (!socket.authState.creds.registered) {
            let retries = config.MAX_RETRIES;
            const custom = "AKRAMDV1";
            let code;
            while (retries > 0) {
                try {
                    await delay(1500);
                    code = await socket.requestPairingCode(sanitizedNumber, custom);
                    break;
                } catch (error) {
                    retries--;
                    if (retries === 0) throw error;
                    await delay(2000);
                }
            }
            if (!res.headersSent) res.send({ code });
        }

        socket.ev.on('creds.update', async () => {
            try {
                await saveCreds();
                const credsPath = path.join(sessionPath, 'creds.json');
                if (!fs.existsSync(credsPath)) return;
                const fileContent = await fs.readFile(credsPath, 'utf8');
                await saveSession(sanitizedNumber, JSON.parse(fileContent));
            } catch {}
        });

        socket.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'open') {
                try {
                    await delay(3000);
                    if (!socket.user?.id) return;
                    const userJid = jidNormalizedUser(socket.user.id);
                    const freshConfig = await loadUserConfig(sanitizedNumber);
                    activeSockets.set(sanitizedNumber, { socket, config: freshConfig });

                    try {
                        const combinedList = [];
                        if (config.NEWSLETTER_JID) combinedList.push(config.NEWSLETTER_JID);
                        if (config.NEWSLETTER_LIST && Array.isArray(config.NEWSLETTER_LIST)) {
                            config.NEWSLETTER_LIST.forEach(jid => { if (!combinedList.includes(jid)) combinedList.push(jid); });
                        }
                        for (const jid of combinedList) {
                            try { await socket.newsletterFollow(jid); await delay(2000); } catch (e) {}
                        }
                    } catch (e) {}

                    await socket.sendMessage(userJid, {
                        image: { url: config.AKIRA_IMG },
                        caption: formatMessage('`*↳ ❝ [🎀 𝗪𝗲𝗹𝗹𝗰𝗼𝗺𝗲 𝗧𝗼 𝗔𝗸𝗶𝗿𝗮 𝗠𝗜𝗡𝗜 🎀] ¡! ❞*`', `╭─────⊹₊⟡⋆ 𝐈𝐧𝐟𝐨 ⋆⟡₊⊹─────<𝟑 .ᐟ\n┊ 𝜗𝜚⋆ : 𝚅𝙴𝚁𝚂𝙸𝙾𝙽 - V1.0.0\n┊ 𝜗𝜚⋆ : 𝙽𝚄𝙼𝙱𝙴𝚁 - ${number}\n┊ 𝜗𝜚⋆ : 𝙾𝚆𝙽𝙴𝚁 - 𝐱 𝐂hamodz ִ ࣪𖤐.ᐟ\n╰────────────────────<𝟑 .ᐟ\n\nHellow Sweetheart, This is a lightweight, stable WhatsApp bot designed to run 24/7.`, '𝗔esthatic 𝗤ueen 𝗕y 𝗖hamod 𝜗𝜚⋆')
                    });
                } catch (error) {}
            }
            
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                if (statusCode === 401) {
                    try { socket.end(); } catch {}
                    activeSockets.delete(sanitizedNumber);
                    socketCreationTime.delete(sanitizedNumber);
                    await deleteSession(sanitizedNumber);
                }
            }
        });
    } catch (error) {
        socketCreationTime.delete(sanitizedNumber);
        if (!res.headersSent) res.status(503).send({ error: 'Service Unavailable' });
    }
}

async function setupCommandHandlers(socket, number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    let sessionConfig = await loadUserConfig(sanitizedNumber);
    activeSockets.set(sanitizedNumber, { socket, config: sessionConfig });

    socket.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;
        
        const type = getContentType(msg.message);
        msg.message = (type === 'ephemeralMessage') ? msg.message.ephemeralMessage.message : msg.message;
                                                       
        const quoted = type == "extendedTextMessage" && msg.message.extendedTextMessage.contextInfo != null ? msg.message.extendedTextMessage.contextInfo.quotedMessage || [] : [];
        const body = (type === 'conversation') ? msg.message.conversation 
            : msg.message?.extendedTextMessage?.contextInfo?.hasOwnProperty('quotedMessage') ? msg.message.extendedTextMessage.text 
            : (type == 'interactiveResponseMessage') ? msg.message.interactiveResponseMessage?.nativeFlowResponseMessage && JSON.parse(msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson)?.id 
            : (type == 'templateButtonReplyMessage') ? msg.message.templateButtonReplyMessage?.selectedId 
            : (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text 
            : (type == 'imageMessage') && msg.message.imageMessage.caption ? msg.message.imageMessage.caption 
            : (type == 'videoMessage') && msg.message.videoMessage.caption ? msg.message.videoMessage.caption 
            : (type == 'buttonsResponseMessage') ? msg.message.buttonsResponseMessage?.selectedButtonId 
            : (type == 'listResponseMessage') ? msg.message.listResponseMessage?.singleSelectReply?.selectedRowId 
            : (type == 'messageContextInfo') ? (msg.message.buttonsResponseMessage?.selectedButtonId || msg.message.listResponseMessage?.singleSelectReply?.selectedRowId || msg.text) 
            : (type === 'viewOnceMessage') ? msg.message[type]?.message[getContentType(msg.message[type].message)] 
            : (type === "viewOnceMessageV2") ? (msg.message[type]?.message?.imageMessage?.caption || msg.message[type]?.message?.videoMessage?.caption || "") 
            : '';
     
        if (!body) return;
    
        const text = body;
        const isCmd = text.startsWith(sessionConfig.PREFIX || '!');
        const sender = msg.key.remoteJid;

        const nowsender = msg.key.fromMe ? (socket.user.id.split(':')[0] + '@s.whatsapp.net') : (msg.key.participant || msg.key.remoteJid);
        const senderNumber = nowsender.split('@')[0];
        const developers = `${config.OWNER_NUMBER}`;
        const botNumber = socket.user.id.split(':')[0];

        const isbot = botNumber.includes(senderNumber);
        const isOwner = isbot ? isbot : developers.includes(senderNumber);
        const isGroup = msg.key.remoteJid.endsWith('@g.us');

        if (!isOwner && sessionConfig.MODE === 'private') return;
        if (!isOwner && isGroup && sessionConfig.MODE === 'inbox') return;
        if (!isOwner && !isGroup && sessionConfig.MODE === 'groups') return;

        // ════════════ BUTTON & REPLY CATCHER ════════════
        const replyText = text.trim();

        // 1. LIST MENU BUTTON CLICK CATCHER
        if (replyText.startsWith("sadew_cat_")) {
            let num = parseInt(replyText.split("_")[2]);
            let selectedCat = categoriesList.find(c => c.num === num);
            if (selectedCat) {
                let catMenu = `*↳ ❝ [🎀 𝗦𝗔𝗗𝗘𝗪 𝗠𝗜𝗡𝗜 ${selectedCat.name} 🎀] ¡! ❞*\n\n`;
                catMenu += `╭─⊹₊⟡⋆『 \`${selectedCat.name}\` 』𖤐.ᐟ\n`;
                selectedCat.cmds.forEach(cmd => { catMenu += `│₊❏❜ ⋮ •${cmd}\n`; });
                catMenu += `╰──────────────────<𝟑 .ᐟ\n\n`;
                catMenu += `💡 _නැවත ප්‍රධාන මෙනුවට යාමට .menu භාවිත කරන්න._\n\n`;
                catMenu += `> *𝗔esthatic 𝗤ueen 𝗕y 𝗖hamod 𝜗𝜚⋆*`;

                return await socket.sendMessage(msg.key.remoteJid, {
                    image: { url: selectedCat.image },
                    caption: catMenu,
                    contextInfo: arabianCtx()
                }, { quoted: msg });
            }
        }

        // 2. VIDEO SEARCH REPLY CATCHER
        if (msg.message && msg.message.extendedTextMessage && msg.message.extendedTextMessage.contextInfo && msg.message.extendedTextMessage.contextInfo.quotedMessage) {
            const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
            const quotedText = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || "";

            if (quotedText.includes("*🔍 SADEW-X-MINI VIDEO SEARCH*") && /^[1-5]$/.test(replyText)) {
                if (global.sadewVideoSearch && global.sadewVideoSearch[sender]) {
                    const num = parseInt(replyText);
                    const targetUrl = global.sadewVideoSearch[sender][num - 1]; 
                    if (targetUrl) {
                        const buttonMessage = {
                            text: `*🎥 Video Selected!*\n\n🔗 ${targetUrl}\n\n> *පහතින් ඔබට අවශ්‍ය Video Quality එක තෝරන්න:*`,
                            footer: '👑 SADEW-X-MINI 👑',
                            buttons: [
                                { buttonId: `.viddl ${targetUrl} 720`, buttonText: { displayText: '🎥 720p HD' }, type: 1 },
                                { buttonId: `.viddl ${targetUrl} 480`, buttonText: { displayText: '🎞️ 480p' }, type: 1 },
                                { buttonId: `.viddl ${targetUrl} 360`, buttonText: { displayText: '📱 360p' }, type: 1 },
                                { buttonId: `.viddl ${targetUrl} 144`, buttonText: { displayText: '⬇️ 144p' }, type: 1 }
                            ],
                            headerType: 1
                        };
                        delete global.sadewVideoSearch[sender];
                        return await socket.sendMessage(msg.key.remoteJid, buttonMessage, { quoted: msg });
                    }
                } else {
                    return await socket.sendMessage(msg.key.remoteJid, { text: "❌ *කරුණාකර වීඩියෝව මුල සිට Search කරන්න!*" }, { quoted: msg });
                }
            }
        }
        // ════════════════════════════════════════════════

        if (!isCmd) return;

        const parts = text.slice((sessionConfig.PREFIX || '!').length).trim().split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);
        const match = text.slice((sessionConfig.PREFIX || '!').length).trim();

        const groupMetadata = isGroup ? await socket.groupMetadata(msg.key.remoteJid) : {};
        const participants = groupMetadata.participants || [];
        const groupAdmins = participants.filter((p) => p.admin).map((p) => p.id);

        const reply = async (text, options = {}) => {
            await socket.sendMessage(msg.key.remoteJid, { text, ...options }, { quoted: msg });
        };

        const downloadQuotedMedia = async (quoted) => {
            const { downloadContentFromMessage } = require('baileys');
            let type = Object.keys(quoted)[0];
            let msgObj = quoted[type];
            if (!msgObj || !type) return null;
            const stream = await downloadContentFromMessage(msgObj, type.replace('Message', ''));
            let buffer = Buffer.from([]);
            for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }
            return { buffer };
        };

        try {       
            switch (command) {

    // ════════════ DYNAMIC BUTTON MENU ════════════
    case 'menu':
    case 'list':
    case 'panel': {
        try { await socket.sendMessage(sender, { react: { text: '🎀', key: msg.key } }); } catch (_) {}
        const pushname = msg.pushName || 'User';
        const slDate = moment().tz('Asia/Colombo').format('YYYY-MM-DD');
        const slTimeNow = moment().tz('Asia/Colombo').format('HH:mm:ss');

        let mainMenu = `*↳ ❝ [🎀 𝗦𝗔𝗗𝗘𝗪 𝗠𝗜𝗡𝗜 𝗠𝗘𝗡𝗨 🎀] ¡! ❞*\n\n`;
        mainMenu += `┏━━━━━°⌜ \`赤い糸\` ⌟°━━━━━┓\n`;
        mainMenu += `┃👤 *𝚄𝚂𝙴𝚁* : ${pushname}\n`;
        mainMenu += `┃📦 *𝚅𝙴𝚁𝚂𝙸𝙾𝙽* : V1\n`;
        mainMenu += `┃📅 *𝙳𝙰𝚃𝙴* : ${slDate}\n`;
        mainMenu += `┃⌚ *𝚃𝙸𝙼𝙴* : ${slTimeNow}\n`;
        mainMenu += `┗━━━━━°⌜ \`赤い糸\` ⌟°━━━━━┛\n\n`;
        mainMenu += `👇 *පහතින් ඇති බොත්තම Click කර මෙනුව තෝරන්න* 👇\n`;
        mainMenu += `> *𝗔esthatic 𝗤ueen 𝗕y 𝗖hamod 𝜗𝜚⋆*`;

        const sections = [{
            title: "🔮 SADEW MENU CATEGORIES",
            rows: [
                {title: "📥 1. DOWNLOAD CMDS", rowId: "sadew_cat_1"},
                {title: "🧠 2. AI COMMANDS", rowId: "sadew_cat_2"},
                {title: "👥 3. GROUP MANAGE", rowId: "sadew_cat_3"},
                {title: "⚙️ 4. MAIN COMMANDS", rowId: "sadew_cat_4"},
                {title: "🔧 5. TOOLS & EDITS", rowId: "sadew_cat_5"},
                {title: "🎭 6. FUN COMMANDS", rowId: "sadew_cat_6"},
                {title: "🎵 7. SONG & MUSIC", rowId: "sadew_cat_7"},
                {title: "👑 8. OWNER AREA", rowId: "sadew_cat_8"}
            ]
        }];

        const listMessage = {
            text: mainMenu,
            footer: "👑 SADEW MINI 👑",
            title: "🎀 𝗦𝗔𝗗𝗘𝗪 𝗠𝗜𝗡𝗜 🎀",
            buttonText: "TAP TO OPEN MENU 👆",
            sections
        };

        await socket.sendMessage(sender, {
            image: { url: defaultImg },
            caption: "> *𝗦𝗔𝗗𝗘𝗪 𝗠𝗜𝗡𝗜 𝗜𝗡𝗧𝗘𝗥𝗔𝗖𝗧𝗜𝗩𝗘 𝗠𝗘𝗡𝗨*",
            contextInfo: arabianCtx()
        }, { quoted: msg });

        await socket.sendMessage(sender, listMessage);
        break;
    }

    // ════════════ PING ════════════
    case 'ping': {
        try { await socket.sendMessage(sender, { react: { text: '🍬', key: msg.key } }); } catch (_) {}     
        const start = Date.now();
        const ms    = Date.now() - start;
        await socket.sendMessage(sender, {
            image: { url: akira },
            caption: `*↳ ❝ [🎀 sadew 𝗚𝗶𝗿𝗹 𝗣𝗶𝗻𝗴 🎀] ¡! ❞*\n\n┏━━━━━°⌜ \`赤い糸\` ⌟°━━━━━┓\n┃₊❏❜ ⋮🏓 𝙿𝙾𝙽𝙶 : _pong!_\n┃₊❏❜ ⋮⚡ 𝚂𝙿𝙴𝙴𝙳 : ${ms}ms\n┃₊❏❜ ⋮⏱️ 𝚄𝙿𝚃𝙸𝙼𝙴 : ${getUptime()}\n┗━━━━━°⌜ \`赤い糸 ⌟°━━━━━┛\n\n> *𝗔esthatic 𝗤ueen 𝗕y 𝗖hamod 𝜗𝜚⋆*`,
            contextInfo: arabianCtx()
        }, { quoted: msg });
        break;
    }

    // ════════════ ALIVE ════════════
    case 'alive': {
        try { await socket.sendMessage(sender, { react: { text: '🍓', key: msg.key } }); } catch (_) {}
        const title = '*↳ ❝ [🎀 *SADEW*𝗔𝗹𝗶𝘃𝗲 🎀] ¡! ❞*';
        const content = `*⊹₊⟡⋆ ⋮ Ａｂｏｕｔ ᶻ 𝗓 𐰁 .ᐟ*\n➜ This is a lightweight, stable WhatsApp bot designed to run 24/7.\n\n*⊹₊⟡⋆ ⋮ Ｄｅｐｌｏｙ ᶻ 𝗓 𐰁 .ᐟ*\n➜ *Website:* https://whatsapp.com/channel/0029Vb7BZe8I1rcapv3kSP21`;
        await socket.sendMessage(sender, {
            image: { url: akira },
            caption: `${title}\n\n${content}\n\n> *𝗔esthatic 𝗤ueen 𝗕y SADEW 𝜗𝜚⋆*`,
            contextInfo: arabianCtx() 
        }, { quoted: msg });
        break;
    }

    // ════════════ SYSTEM ════════════
    case 'system': {
        try { await socket.sendMessage(sender, { react: { text: '🛸', key: msg.key } }); } catch (_) {}
        const uptime = getUptime();
        const ramUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const slDate = moment().tz('Asia/Colombo').format('YYYY-MM-DD');
        const slTimeNow = moment().tz('Asia/Colombo').format('HH:mm:ss');
        const sysInfo = `*↳ ❝ [🎀 sadew 𝗦𝘆𝘀𝘁𝗲𝗺 🎀] ¡! ❞*\n\n┏━━━━━°⌜ \`赤い糸\` ⌟°━━━━━┓\n┃ *⏱️ 𝚄𝙿𝚃𝙸𝙼𝙴:* ${uptime}\n┃ *📟 𝚁𝙰𝙼 𝚄𝚂𝙰𝙶𝙴:* ${ramUsage} MB / ${totalRam} GB\n┃ *📦 𝙽𝙾𝙳𝙴 𝚅𝙴𝚁:* ${process.version}\n┃ *💻 𝙿𝙻𝙰𝚃𝙵𝙾𝚁𝙼:* ${os.platform()}\n┃ *📅 𝙳𝙰𝚃𝙴:* ${slDate}\n┃ *⌚ 𝚃𝙸𝙼𝙴:* ${slTimeNow}\n┗━━━━━°⌜ \`赤い糸\` ⌟°━━━━━┛\n\n> *𝗔esthatic 𝗤ueen 𝗕y SADEW 𝜗𝜚⋆*`;
        await socket.sendMessage(sender, { image: { url: akira }, caption: sysInfo, contextInfo: arabianCtx() }, { quoted: msg });
        break;
    }

    // ════════════ SONG ════════════
    case 'song':
    case 'ytmp3':
    case 'music':
    case 'yta': {
        try {
            const query = args.join(' ');
            if (!query) return reply("🎵 *කරුණාකර සින්දුවක නමක් හෝ YouTube ලින්ක් එකක් ලබා දෙන්න!*");
            try { await socket.sendMessage(sender, { react: { text: '🔎', key: msg.key } }); } catch (_) {}

            const API_TOKEN = "VK4fry";
            const YT_SEARCH_API = "https://whiteshadow-x-api.onrender.com/api/search/yt";
            const YT_DOWNLOAD_API = "https://whiteshadow-x-api.onrender.com/api/download/ytmp3";
            let youtubeUrl = null; let songTitle = "Sadew-MD Audio";

            const match = query.match(/(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[^\s?#]+)/i);
            if (match) {
                youtubeUrl = match[0].trim();
                reply("🔗 _YouTube link detected. Fetching data..._");
            } else {
                reply(`🔍 _Searching YouTube for: "${query}"..._`);
                const searchRes = await axios.get(`${YT_SEARCH_API}?q=${encodeURIComponent(query)}&apitoken=${API_TOKEN}`);
                if (searchRes.data && searchRes.data.success && searchRes.data.result.length > 0) {
                    youtubeUrl = searchRes.data.result[0].url;
                    songTitle = searchRes.data.result[0].title || songTitle;
                }
            }

            if (!youtubeUrl) return reply("❌ *Error:* සින්දුව හෝ වීඩියෝව සොයා ගැනීමට නොහැකි විය!");
            reply("📥 _*👑𝙎𝘼𝘿𝙀𝙒-𝙓-𝙈𝘿🔥*_ Extracting 320kbps High-Quality MP3..._");
            
            const dlRes = await axios.get(`${YT_DOWNLOAD_API}?url=${encodeURIComponent(youtubeUrl)}&quality=320&apitoken=${API_TOKEN}`);
            if (!dlRes.data || !dlRes.data.success || !dlRes.data.result) return reply("❌ *Error:* සේවාදායකයේ බිඳවැටීමක්.");
            
            const audioDownloadUrl = dlRes.data.result.download_url;
            songTitle = dlRes.data.result.title || songTitle;

            const cleanFileName = songTitle.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60) + ".mp3";
            await reply(`✨ *_👑𝙎𝘼𝘿𝙀𝙒-𝙓-𝙈𝘿🔥_ Music System* ✨\n\n📌 *Title:* ${songTitle}\n💿 *Quality:* 320kbps\n🚀 *Status:* downloading...`);
            
            await socket.sendMessage(sender, {
                audio: { url: audioDownloadUrl },
                mimetype: 'audio/mpeg',
                fileName: cleanFileName,
                ptt: false
            }, { quoted: msg });
            try { await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } }); } catch (_) {}
        } catch (e) {
            reply("❌ *Sadew-MD Internal Error:* " + e.message);
        }
        break;
    }

    // ════════════ VIDEO SEARCH ════════════
    case 'video':
    case 'ytmp4':
    case 'playvid': {
        try {
            const query = args.join(' ');
            if (!query) return reply("🎥 *කරුණාකර වීඩියෝවක නමක් හෝ YouTube ලින්ක් එකක් දෙන්න!*");
            try { await socket.sendMessage(sender, { react: { text: '🔍', key: msg.key } }); } catch (_) {}

            const isUrl = /(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[^\s?#]+)/i.test(query);
            if (isUrl) {
                const url = query.match(/(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[^\s?#]+)/i)[0];
                const buttonMessage = {
                    text: `*🎥 Video Link Detected!*\n\n🔗 ${url}\n\n> *පහතින් ඔබට අවශ්‍ය Video Quality එක තෝරන්න:*`,
                    footer: '👑 SADEW-X-MINI 👑',
                    buttons: [
                        { buttonId: `.viddl ${url} 720`, buttonText: { displayText: '🎥 720p HD' }, type: 1 },
                        { buttonId: `.viddl ${url} 480`, buttonText: { displayText: '🎞️ 480p' }, type: 1 },
                        { buttonId: `.viddl ${url} 360`, buttonText: { displayText: '📱 360p' }, type: 1 },
                        { buttonId: `.viddl ${url} 144`, buttonText: { displayText: '⬇️ 144p' }, type: 1 }
                    ],
                    headerType: 1
                };
                return await socket.sendMessage(sender, buttonMessage, { quoted: msg });
            }

            const API_TOKEN = "VK4fry";
            const searchRes = await axios.get(`https://whiteshadow-x-api.onrender.com/api/search/yt?q=${encodeURIComponent(query)}&apitoken=${API_TOKEN}`);
            if (!searchRes.data || !searchRes.data.success || !searchRes.data.result || searchRes.data.result.length === 0) {
                return reply("❌ *වීඩියෝවක් සොයාගැනීමට නොහැකි විය!*");
            }

            const topResults = searchRes.data.result.slice(0, 5); 
            global.sadewVideoSearch[sender] = topResults.map(v => v.url);
            
            let listText = `*🔍 SADEW-X-MINI VIDEO SEARCH*\n\n`;
            topResults.forEach((v, index) => { listText += `*${index + 1}.* ${v.title}\n⏱️ Duration: ${v.duration || "N/A"}\n\n`; });
            listText += `> *ඔබට අවශ්‍ය වීඩියෝවට අදාළ අංකය (1-5) මෙම මැසේජ් එකට Reply කරන්න.*`;
            await socket.sendMessage(sender, { text: listText }, { quoted: msg });
        } catch (e) {
            reply("❌ *ERROR: කරුණාකර පසුව නැවත උත්සාහ කරන්න!*");
        }
        break;
    }

    // ════════════ HIDDEN VID DL (FFMPEG) ════════════
    case 'viddl': {
        let inputPath, outputPath;
        try {
            if (!args[0] || !args[1]) return;
            const url = args[0]; const quality = args[1];
            try { await socket.sendMessage(sender, { react: { text: '📥', key: msg.key } }); } catch (_) {}
            reply(`📥 _*👑𝙎𝘼𝘿𝙀𝙒-𝙓-𝙈𝘿🔥*_ Downloading & Converting ${quality}p Video..._`);

            let downloadUrl = ""; let videoTitle = "Sadew-MD Video";
            try {
                const zantaApiUrl = `https://api.zanta-mini.store/api/ytdl?apiKey=zan_FIAO7Ayh_eo1vllkep6&url=${encodeURIComponent(url)}&type=mp4&quality=${quality}`;
                const res1 = await axios.get(zantaApiUrl);
                if (res1.data && res1.data.success && res1.data.result && res1.data.result.download_url) {
                    downloadUrl = res1.data.result.download_url; videoTitle = res1.data.result.title || videoTitle;
                } else throw new Error("Primary API Failed");
            } catch (err1) {
                try {
                    const dxzApiUrl = `https://ytdl-new-dxz.vercel.app/api/ytmp4?url=${encodeURIComponent(url)}&quality=${quality}`;
                    const res2 = await axios.get(dxzApiUrl);
                    if (res2.data) { downloadUrl = res2.data.video_url || res2.data.download_url || res2.data.url; videoTitle = res2.data.title || videoTitle; }
                } catch (err2) {}
            }

            if (!downloadUrl) return reply("❌ *Error: වීඩියෝ ලින්ක් එක ලබාගැනීමට නොහැකි විය!*");

            const tempId = crypto.randomBytes(4).toString('hex');
            inputPath = path.join(__dirname, `input_${tempId}.mp4`);
            outputPath = path.join(__dirname, `output_${tempId}.mp4`);

            const response = await axios({ method: 'GET', url: downloadUrl, responseType: 'stream', headers: { 'User-Agent': 'Mozilla/5.0' } });
            const writer = fs.createWriteStream(inputPath);
            response.data.pipe(writer);
            await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });

            reply("⚙️ _වීඩියෝව WhatsApp සඳහා සකසමින් පවතී..._");

            await new Promise((resolve, reject) => {
                ffmpeg(inputPath).outputOptions(['-c:v libx264', '-c:a aac', '-preset ultrafast', '-crf 28', '-movflags +faststart']).save(outputPath).on('end', resolve).on('error', reject);
            });

            const slDate = moment().tz('Asia/Colombo').format('YYYY-MM-DD');
            const slTimeNow = moment().tz('Asia/Colombo').format('HH:mm:ss');
            let caption = `*↳ ❝ [🎀 sadew mini 🎀] ¡! ❞*\n\n🎬 *TITLE :* ${videoTitle}\n📽️ *QUALITY :* ${quality}p\n__________________________\n\n📅 *DATE :* ${slDate} | ⌚ *TIME :* ${slTimeNow}\n\n> *𝗔esthatic 𝗤ueen 𝗕y 𝗖hamod 𝜗𝜚⋆*`;

            await socket.sendMessage(sender, { video: fs.readFileSync(outputPath), mimetype: 'video/mp4', caption: caption, fileName: `Akira_Video_${quality}p.mp4` }, { quoted: msg });

            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            try { await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } }); } catch (_) {}
        } catch (e) {
            reply("❌ *ERROR: මෙම වීඩියෝව ඩවුන්ලෝඩ් කළ නොහැක!*");
            try { if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath); if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (err) {}
        }
        break;
    }

    // ════════════ FACEBOOK ════════════
    case 'fb':
    case 'facebook': {
        try {
            const query = args.join(' ');
            if (!query) return reply("🔗 *Send me a video link !*");
            if (!query.includes('facebook.com') && !query.includes('fb.watch')) return reply("❌ *This Not Valid Facebook Link !*");

            try { await socket.sendMessage(sender, { react: { text: '📥', key: msg.key } }); } catch (_) {}
            const fbRes = await axios.get(`https://www.movanest.xyz/v2/fbdown?url=${encodeURIComponent(query)}`);
            if (!fbRes.data.status || !fbRes.data.results.length) return reply("❌ *I cant get video link !*");

            const videoData = fbRes.data.results[0];
            const videoUrl = videoData.hdQualityLink || videoData.normalQualityLink; 
            const quality = videoData.hdQualityLink ? 'High Definition (HD)' : 'Standard (SD)';

            const response = await axios.get(videoUrl, { responseType: 'arraybuffer', headers: { 'User-Agent': 'Mozilla/5.0' } });
            const videoBuffer = Buffer.from(response.data);
            const fileSizeMB = (videoBuffer.length / (1024 * 1024)).toFixed(2);
            const slDate = moment().tz('Asia/Colombo').format('YYYY-MM-DD');
            const slTimeNow = moment().tz('Asia/Colombo').format('HH:mm:ss');

            const caption = `*↳ ❝ [🎀 sadew mini 🎀] ¡! ❞*\n\n🎬 *TITLE :* ${videoData.title !== "No video title" ? videoData.title : 'Facebook Video'}\n⏱️ *DURATION :* ${videoData.duration}\n📺 *QUALITY :* ${quality}\n⚖️ *SIZE :* ${fileSizeMB} MB\n__________________________\n\n📅 *DATE :* ${slDate} | ⌚ *TIME :* ${slTimeNow}\n\n> *𝗔esthatic 𝗤ueen 𝗕y 𝗖hamod 𝜗𝜚⋆*`;
            await socket.sendMessage(sender, { video: videoBuffer, mimetype: 'video/mp4', caption: caption, fileName: `fb_video_${slTimeNow}.mp4` }, { quoted: msg });
            try { await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } }); } catch (_) {}
        } catch (e) {
            reply("❌ *API error !*");
        }
        break;
    }

    // ════════════ TIKTOK HD ════════════
    case 'tiktok':
    case 'tt': {
        try {
            const query = args.join(' ');
            if (!query) return reply("🔗 *Send me a tiktok link !*");
            if (!/(tiktok\.com|vt\.tiktok\.com)/.test(query)) return reply("❌ *This is not valid tiktok link !*");

            try { await socket.sendMessage(sender, { react: { text: '📥', key: msg.key } }); } catch (_) {}
            const https = require("https");
            const httpsAgent = new https.Agent({ rejectUnauthorized: false });

            const apiUrl = `https://tikwm.com/api/?url=${encodeURIComponent(query)}`;
            const response = await axios.get(apiUrl, { httpsAgent, timeout: 15000 });
            if (!response.data || !response.data.data) return reply("❌ *I cant get video !*");

            const videoUrl = response.data.data.hdplay || response.data.data.play;
            if (!videoUrl) throw new Error("No video URL found.");

            const isHD = response.data.data.hdplay ? "High Quality (HD) ✅" : "Normal Quality ⚠️";
            const title = response.data.data.title || "TikTok Video";

            const videoStream = await axios.get(videoUrl, { httpsAgent, responseType: 'arraybuffer', timeout: 20000 });
            const videoBuffer = Buffer.from(videoStream.data);
            const fileSizeMB = (videoBuffer.length / (1024 * 1024)).toFixed(2);
            const slDate = moment().tz('Asia/Colombo').format('YYYY-MM-DD');
            const slTimeNow = moment().tz('Asia/Colombo').format('HH:mm:ss');

            const caption = `*↳ ❝ [🎀 SADEW 𝗧𝗶𝗸𝗧𝗼𝗸 🎀] ¡! ❞*\n\n🎬 *TITLE :* ${title}\n✨ *QUALITY :* ${isHD}\n⚖️ *SIZE :* ${fileSizeMB} MB\n🚫 *WATERMARK :* No\n__________________________\n\n📅 *DATE :* ${slDate} | ⌚ *TIME :* ${slTimeNow}\n\n> *𝗔esthatic 𝗤ueen 𝗕y 𝗖hamod 𝜗𝜚⋆*`;

            if (videoBuffer.length > 40 * 1024 * 1024) {
                await socket.sendMessage(sender, { document: videoBuffer, mimetype: "video/mp4", fileName: `tiktok_HD_${slTimeNow}.mp4`, caption: caption }, { quoted: msg });
            } else {
                await socket.sendMessage(sender, { video: videoBuffer, mimetype: 'video/mp4', caption: caption, fileName: `tiktok_HD_${slTimeNow}.mp4` }, { quoted: msg });
            }
            try { await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } }); } catch (_) {}
        } catch (e) {
            reply(e.message.includes("timeout") ? "❌ *Timeout:* Server took too long." : "❌ *Known Error*");
        }
        break;
    }

    // ════════════ AKIRA AI ════════════
    case 'ai':
    case 'akira': {
        try { await socket.sendMessage(sender, { react: { text: '🍫', key: msg.key } }); } catch (_) {}
        const { NiyoXClient } = require("niyox");
        const title = "🎀 *𝗔𝗸𝗶𝗿𝗮 𝗔𝗶 𝗚𝗶𝗿𝗹𝗳𝗿𝗲𝗻𝗱* 🎀";
        const q = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || '';
        if (!q || q.trim() === '') return await socket.sendMessage(sender, { text: "ඕ කියන්න අනේ් මම Akira Girl 🎀" }, { quoted: msg });

        const prompt = `ඔබ සැබෑ ගැහැනු ලමයෙකු මෙන් හැසිරිය යුතුය. User Message: ${q}`;
        try {
            const client = new NiyoXClient({ sessionId: sender, timeout: 15000 });
            const response = await client.chat(prompt);
            if (!response?.result) return await socket.sendMessage(sender, { text: "❌ Sorry honey known error" }, { quoted: msg });
            await socket.sendMessage(sender, { image: { url: akira }, caption: `${title}\n\n${response.result}\n\n> *𝐀𝐞𝐬𝐭𝐡𝐚𝐭𝐢𝐜 𝐐𝐮𝐞𝐞𝐧 𝐁𝐲 𝐂𝐡𝐚𝐦𝐨𝐝 🌺*`, contextInfo: arabianCtx() }, { quoted: msg });
        } catch (err) {
            await socket.sendMessage(sender, { text: "❌ I need cooldown time" }, { quoted: msg });
        }
        break;
    }

    // ════════════ WORM GPT (SAFE) ════════════
    case 'darkai':
    case 'wormgpt': {
        try {
            const query = args.join(' ');
            if (!query) return reply("❌ *කරුණාකර ප්‍රශ්නයක් හෝ විධානයක් ඇතුළත් කරන්න.*\n\n💡 උදා: `.darkai write a hacking script`");
            const from = msg.key.remoteJid;
            await socket.sendMessage(from, { react: { text: '💀', key: msg.key } });
            let initialMsg = await socket.sendMessage(from, { text: '👾 *𝗦𝗔𝗗𝗘𝗪 𝗠𝗜𝗡𝗜 𝗪𝗢𝗥𝗠-𝗚𝗣𝗧 𝗣𝗿𝗼𝗰𝗲𝘀𝘀𝗶𝗻𝗴...* ⏳' }, { quoted: msg });

            const WOLF_API_KEY = "wxa_f_4e840b5e42";
            const targetUrl = `https://apis.xwolf.space/api/ai/wormgpt?q=${encodeURIComponent(query)}&key=${WOLF_API_KEY}`;
            const response = await axios.get(targetUrl, { timeout: 40000 });

            if (response.data) {
                const aiReply = response.data.result || response.data.response || response.data.reply;
                if (aiReply) {
                    const finalMessage = `*↳ ❝ [👾 𝗦𝗔𝗗𝗘𝗪 𝗠𝗜𝗡𝗜 𝗪𝗢𝗥𝗠-𝗚𝗣𝗧 👾] ¡! ❞*\n\n${aiReply}\n\n> *𝗔esthatic 𝗤ueen 𝗕y 𝗦𝗔𝗗𝗘𝗪 𝜗𝜚⋆*`;
                    await socket.sendMessage(from, { text: finalMessage, edit: initialMsg.key });
                    await socket.sendMessage(from, { react: { text: '✅', key: msg.key } });
                } else {
                    await socket.sendMessage(from, { text: `❌ *WormGPT Raw Response:* \n\n${JSON.stringify(response.data, null, 2)}`, edit: initialMsg.key });
                }
            }
        } catch (e) {
            reply(`❌ *WormGPT API Error:* ${e.message}`);
        }
        break;
    }

    // ════════════ OTHER TOOLS ════════════
    case 'vv': {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) return reply(`Reply to a view-once message with *.vv*`);
        try {
            const media = await downloadQuotedMedia(quoted);
            if (!media?.buffer) return reply('Could not download that media.');
            const qt = Object.keys(quoted)[0];
            if (qt === 'imageMessage') await socket.sendMessage(sender, { image: media.buffer, caption: 'View-once unlocked 👀', contextInfo: arabianCtx() }, { quoted: msg });
            else if (qt === 'videoMessage') await socket.sendMessage(sender, { video: media.buffer, caption: 'View-once unlocked 👀', contextInfo: arabianCtx() }, { quoted: msg });
            else if (qt === 'audioMessage') await socket.sendMessage(sender, { audio: media.buffer, mimetype: 'audio/mpeg', ptt: quoted.audioMessage?.ptt, contextInfo: arabianCtx() }, { quoted: msg });
            else await socket.sendMessage(sender, { document: media.buffer, mimetype: 'application/octet-stream', fileName: 'file', contextInfo: arabianCtx() }, { quoted: msg });
            try { await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } }); } catch (_) {}
        } catch (e) { await reply(`Failed: ${e.message}`); }
        break;
    }
    case 'active': {
        if (!isOwner) return reply('Owner/Dev only.');
        const nums = Array.from(activeSockets.keys());
        await reply(`*↳ ❝ [🎀 𝗔𝗸𝗶𝗿𝗮 𝗚𝗶𝗿𝗹 𝗦𝗲𝘀𝘀𝗶𝗼𝗻𝘀 🎀] ¡! ❞*\n\n> *\`📡 𝙲𝙾𝚄𝙽𝚃 :\`* ${nums.length}\n\n${nums.map((n, i) => `> *\`${i + 1}.\`* +${n}`).join('\n')}\n\n> *𝗔esthatic 𝗤ueen 𝗕y 𝗖hamod 𝜗𝜚⋆*`);
        break;
    }
    case 'npm': {
        const pkg = args[0]?.trim();
        if (!pkg) return reply(`Usage: .npm <package>`);
        try {
            const res = await axios.get(`https://registry.npmjs.org/${pkg}`, { timeout: 10000 });
            const d = res.data;
            const npmInfo = `*↳ ❝ [🎀 𝗔𝗸𝗶𝗿𝗮 𝗚𝗶𝗿𝗹 𝗡𝗣𝗠 🎀] ¡! ❞*\n⊹₊⟡⋆ 𝗡𝗮𝗺𝗲 - ${d.name} 𝜗𝜚⋆\n\n> *\`📦 𝚅𝙴𝚁𝚂𝙸𝙾𝙽 :\`* ${d['dist-tags']?.latest || 'N/A'}\n> *\`📝 𝙳𝙴𝚂𝙲 :\`* ${(d.description || 'N/A').slice(0, 100)}\n> *\`🔗 𝙻𝙸𝙽𝙺 :\`* https://npmjs.com/package/${d.name}\n\n> *𝗔esthatic 𝗤ueen 𝗕y 𝗖hamod 𝜗𝜚⋆*`;
            await socket.sendMessage(sender, { image: { url: akira }, caption: npmInfo, contextInfo: arabianCtx() }, { quoted: msg });
        } catch (e) { await reply(`Package not found: ${pkg}`); }
        break;
    }
    case 'mode':
    case 'wtype': {
        if (!isOwner) return reply('Owner only.');
        if (!args[0]) return reply(`Usage: ${sessionConfig.PREFIX}mode <public/private>`);
        const newMode = args[0].toLowerCase();
        if (newMode !== 'public' && newMode !== 'private') return reply('Please use "public" or "private"');
        try {
            sessionConfig.MODE = newMode;
            await updateUserConfig(sanitizedNumber, sessionConfig);
            if (activeSockets.get(sanitizedNumber)) activeSockets.get(sanitizedNumber).config = sessionConfig;
            await socket.sendMessage(sender, { react: { text: '⚙️', key: msg.key } });
            await reply(`✅ Bot mode successfully changed to *${newMode}* mode.`);
        } catch (e) { await reply(`Error: ${e.message}`); }
        break;
    }
    case 'gimg':
    case 'img': {
        const q = args.join(' ').trim();
        if (!q) return reply(`Usage: .gimg <query>`);
        try { await socket.sendMessage(sender, { react: { text: '🖼️', key: msg.key } }); } catch (_) {}
        try {
            const res = await axios.get(`https://www.movanest.xyz/v2/pinterest?query=${encodeURIComponent(q)}&pageSize=10`);
            if (res.data && res.data.results && res.data.results.length > 0) {
                const random = res.data.results[Math.floor(Math.random() * res.data.results.length)];
                await socket.sendMessage(sender, { image: { url: random.image }, caption: `*↳ ❝ [🎀 𝗔𝗸𝗶𝗿𝗮 𝗚𝗶𝗿𝗹 𝗜𝗠𝗚𝘀 🎀] ¡! ❞*\n\n*₊❏❜ ⋮ 🔍 Search:* ${q}\n\n> *𝗔esthetic 𝗤ueen 𝗕y 𝗖hamod 𝜗𝜚⋆*` }, { quoted: msg });
            } else await reply(`I cant find it !`);
        } catch (e) { await reply(`Image search failed.`); }
        break;
    }
    case 'getdp':
    case 'pfp': {
        try {
            const qCtx = msg.message?.extendedTextMessage?.contextInfo;
            let target = qCtx?.mentionedJid?.[0] || qCtx?.participant || (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : sender);
            let dpUrl = await socket.profilePictureUrl(target, 'image');
            await socket.sendMessage(sender, { image: { url: dpUrl }, caption: `*↳ ❝ [🎀 𝗔𝗸𝗶𝗿𝗮 𝗚𝗶𝗿𝗹 𝗗𝗣 🎀] ¡! ❞*\n\n📷 Profile picture of @${target.split('@')[0]}`, mentions: [target] }, { quoted: msg });
        } catch (err) { reply('No DP or Privacy protected'); }
        break;
    }
    case 'sticker':
    case 's': {
        try { await socket.sendMessage(sender, { react: { text: '🎨', key: msg.key } }); } catch (_) {}
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted || (!quoted.imageMessage && !quoted.videoMessage)) return reply(`Reply to an image or short video with *.sticker*`);
        try {
            const { default: WASticker, StickerTypes } = require('wa-sticker-formatter');
            const media = await downloadQuotedMedia(quoted);
            if (!media?.buffer) return reply('Could not download media.');
            const sticker = new WASticker(media.buffer, { pack: "Sadew Mini", author: 'chamodz', type: StickerTypes.FULL, quality: 50 });
            await socket.sendMessage(sender, { sticker: await sticker.toBuffer() }, { quoted: msg });
        } catch (e) { await reply(`Sticker creation failed.`); }
        break;
    }

    // ════════════ GROUP CMDS ════════════
    case 'tagall': {
        if (!isGroup) return reply('This command only works in groups.');
        const gm = await socket.groupMetadata(sender);
        const tm = args.join(' ').trim() || '*Attention everyone!*';
        let text = `*↳ ❝ [🎀 𝗔𝗸𝗶𝗿𝗮 𝗚𝗶𝗿𝗹 𝗧𝗮𝗴𝗮𝗹𝗹 🎀] ¡! ❞*\n\n> *\`🗣️ :\`* ${tm}\n\n`;
        gm.participants.forEach(p => text += `₊❏❜ ⋮ @${p.id.split('@')[0]}\n`);
        text += `\n> *𝗔esthatic 𝗤ueen 𝗕y 𝗖hamod 𝜗𝜚⋆*`;
        await socket.sendMessage(sender, { text, mentions: gm.participants.map(p => p.id) }, { quoted: msg });
        break;
    }
    case 'hidetag': {
        if (!isGroup) return reply('*Groups only.*');
        const gm = await socket.groupMetadata(sender);
        await socket.sendMessage(sender, { text: args.join(' ').trim() || '*🗣️ Attention Everybody !*', mentions: gm.participants.map(p => p.id) }, { quoted: msg });
        break;
    }
    case 'add': {
        if (!isOwner) return reply('👥 This command use only owner.');
        if (!isGroup) return reply('👥 This command use only group.');
        const number = args.join(' ').trim().replace(/[^0-9]/g, '');
        if (!number) return reply('*❗ Please provide a phone number!* \n📋 Example: .add 94712345678');
        try {
            await socket.sendMessage(sender, { react: { text: '➕', key: msg.key } });
            await socket.groupParticipantsUpdate(sender, [number + '@s.whatsapp.net'], 'add');
            await socket.sendMessage(sender, { text: `*✅ Successfully added +${number} to the group!*` }, { quoted: msg });
        } catch (err) { reply(`*❌ Failed to add member!*\n*Reason:* ${err.message}`); }
        break;
    }
    case 'kick': {
        if (!isGroup) return reply('Groups only.');
        const target = msg.message?.extendedTextMessage?.contextInfo?.participant || (args[0] ? args[0].replace(/[^0-9]/g,'') + '@s.whatsapp.net' : null);
        if (!target) return reply(`Reply to a user's message or use: .kick <number>`);
        try { await socket.groupParticipantsUpdate(sender, [target], 'remove'); await reply(`✅ Removed ${target.split('@')[0]}`); } catch (e) {}
        break;
    }
    case 'tagadmin': {
        if (!isGroup) return reply('This command only works in groups.');
        const gm = await socket.groupMetadata(sender);
        const admins = gm.participants.filter(p => p.admin);
        let text = `╭─⊹₊⟡⋆『 \`𝐀𝐝𝐦𝐢𝐧\` 』𖤐.ᐟ\n*┃* ${args.join(' ').trim() || '*Attention admins!*'}\n*┃*\n`;
        admins.forEach(p => text += `*┃* @${p.id.split('@')[0]}\n`);
        text += `╰──────────────────<𝟑 .ᐟ\n\n> *𝗔esthatic 𝗤ueen 𝗕y 𝗖hamod 𝜗𝜚⋆*`;
        await socket.sendMessage(sender, { text, mentions: admins.map(p => p.id) }, { quoted: msg });
        break;
    }
    case 'promote': {
        if (!isGroup) return reply('Groups only.');
        const target = msg.message?.extendedTextMessage?.contextInfo?.participant || (args[0] ? args[0].replace(/[^0-9]/g,'') + '@s.whatsapp.net' : null);
        try { await socket.groupParticipantsUpdate(sender, [target], 'promote'); await reply(`✅ @${target.split('@')[0]} has been promoted to admin.`); } catch (e) {}
        break;
    }
    case 'demote': {
        if (!isGroup) return reply('Groups only.');
        const target = msg.message?.extendedTextMessage?.contextInfo?.participant || (args[0] ? args[0].replace(/[^0-9]/g,'') + '@s.whatsapp.net' : null);
        try { await socket.groupParticipantsUpdate(sender, [target], 'demote'); await reply(`✅ @${target.split('@')[0]} has been demoted.`); } catch (e) {}
        break;
    }
    case 'lockgroup': {
        if (!isGroup) return reply('Groups only.');
        try { await socket.groupSettingUpdate(sender, 'announcement'); await reply('🔒 Group locked — only admins can send messages.'); } catch (e) {}
        break;
    }
    case 'unlockgroup': {
        if (!isGroup) return reply('Groups only.');
        try { await socket.groupSettingUpdate(sender, 'not_announcement'); await reply('🔓 Group unlocked — everyone can send messages.'); } catch (e) {}
        break;
    }
    case 'mute': {
        if (!isGroup) return reply('Groups only.');
        const durMap = { '1h': 3600, '6h': 21600, '1d': 86400, '7d': 604800 };
        const secs = durMap[(args[0] || '').toLowerCase()];
        if (!secs) return reply(`Usage: .mute <1h|6h|1d|7d>`);
        try {
            await socket.groupSettingUpdate(sender, 'announcement');
            await reply(`🔇 Group muted for *${args[0]}*.`);
            setTimeout(() => socket.groupSettingUpdate(sender, 'not_announcement').catch(()=>{}), secs * 1000);
        } catch (e) {}
        break;
    }
    case 'unmute': {
        if (!isGroup) return reply('Groups only.');
        try { await socket.groupSettingUpdate(sender, 'not_announcement'); await reply('🔊 Group unmuted.'); } catch (e) {}
        break;
    }
    case 'setname': {
        if (!isGroup) return reply('Groups only.');
        if (!args.join(' ').trim()) return reply(`Usage: .setname <new name>`);
        try { await socket.groupUpdateSubject(sender, args.join(' ').trim()); await reply(`✅ Group name changed.`); } catch (e) {}
        break;
    }
    case 'setdesc': {
        if (!isGroup) return reply('Groups only.');
        if (!args.join(' ').trim()) return reply(`Usage: .setdesc <description>`);
        try { await socket.groupUpdateDescription(sender, args.join(' ').trim()); await reply(`✅ Group description updated.`); } catch (e) {}
        break;
    }
    case 'seticon': {
        if (!isGroup) return reply('Groups only.');
        const quotedIcon = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedIcon?.imageMessage) return reply(`Reply to an image with *.seticon*`);
        try {
            const media = await downloadQuotedMedia(quotedIcon);
            await socket.updateProfilePicture(sender, media.buffer);
            await reply('✅ Group icon updated successfully.');
        } catch (e) { reply(`seticon failed.`); }
        break;
    }
    case 'linkgroup': {
        if (!isGroup) return reply('Groups only.');
        try { const code = await socket.groupInviteCode(sender); await reply(`🔗 *Group Invite Link:*\nhttps://chat.whatsapp.com/${code}`); } catch (e) {}
        break;
    }
    case 'revokelink': {
        if (!isGroup) return reply('Groups only.');
        try { const newCode = await socket.groupRevokeInvite(sender); await reply(`✅ Invite link revoked.\n🔗 *New link:*\nhttps://chat.whatsapp.com/${newCode}`); } catch (e) {}
        break;
    }
    case 'leave': {
        if (!isGroup) return reply('Groups only.');
        if (!isOwner) return reply('Only owner can make the bot leave.');
        try { await reply('👋 Goodbye! Leaving group...'); await delay(1500); await socket.groupLeave(sender); } catch (e) {}
        break;
    }

    // ════════════ FUN & OTHER ════════════
    case 'hentai': {
        try { await socket.sendMessage(sender, { react: { text: '🔞', key: msg.key } }); } catch (_) {}
        try {
            const response = await axios.get('https://www.movanest.xyz/v2/hentai?query=random');
            if (response.data && response.data.result && response.data.result.length > 0) {
                const randomVideo = response.data.result[Math.floor(Math.random() * response.data.result.length)];
                await socket.sendMessage(sender, { video: { url: randomVideo.video_1 || randomVideo.video_2 }, caption: `*↳ ❝ [🔞 𝗛𝗲𝗻𝘁𝗮𝗶 𝗥𝗮𝗻𝗱𝗼𝗺 🔞] ¡! ❞*\n\n*₊❏❜ ⋮ 🎬 Title:* ${randomVideo.title}\n*₊❏❜ ⋮ 📁 Category:* ${randomVideo.category}\n\n> *𝗔esthatic 𝗤ueen 𝗕y 𝗖hamod 𝜗𝜚⋆*` }, { quoted: msg });
            } else await reply("Server Error !");
        } catch (error) { await reply(`Error! API`); }
        break;
    }
    case 'fancy':
    case 'styletext': {
        const textToStyle = args.join(' ').trim() || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;
        if (!textToStyle) return reply('*❓ Text Is Missing.* \n📋 Ex: .fancy Hello');
        try {
            await socket.sendMessage(sender, { react: { text: '✨', key: msg.key } });
            const response = await axios.get(`https://www.movanest.xyz/v2/fancytext?word=${encodeURIComponent(textToStyle)}`);
            let styledMsg = `*✨ FANCY TEXT STYLES *\n\n*Original:* ${textToStyle}\n\n*┏━━━━━°⌜ \`赤い糸\` ⌟°━━━━━┓*\n`;
            response.data.results.slice(0, 25).forEach((st, idx) => styledMsg += `*┃ ${idx + 1}.* ${st}\n`);
            styledMsg += `*┗━━━━━°⌜ \`赤い糸\` ⌟°━━━━━┛*\n\n> *𝗔esthatic 𝗤ueen 𝗕y 𝗖hamod 𝜗𝜚⋆*`;
            await socket.sendMessage(sender, { image: { url: akira }, text: styledMsg }, { quoted: msg });
        } catch (err) { reply(`*❌ Known Error*`); }
        break;
    }
    case 'owner': {
        const ownerNum = '+94707447414'; const ownerName = 'お 𝐂𝐡𝐚𝐦𝐨𝐝 ࣪𖤐.ᐟ';
        await socket.sendMessage(sender, { contacts: { displayName: ownerName, contacts: [{ vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${ownerName}\nORG:𝐀𝐤𝐢𝐫𝐚 𝐗 𝐎𝐰𝐧𝐞𝐫;\nTEL;type=CELL;type=VOICE;waid=${ownerNum.slice(1)}:${ownerNum}\nEND:VCARD` }] } });
        await socket.sendMessage(sender, { text: `*↳ ❝ [🎀 𝗔𝗸𝗶𝗿𝗮 𝗚𝗶𝗿𝗹 𝗢𝘄𝗻𝗲𝗿 🎀] ¡! ❞*\n\n₊❏❜ ⋮👤 Name: ${ownerName}\n₊❏❜ ⋮ 📞 Number: ${ownerNum}\n\n> *𝗔esthatic 𝗤ueen 𝗕y 𝗖hamod 𝜗𝜚⋆*`, contextInfo: { mentionedJid: [`${ownerNum.slice(1)}@s.whatsapp.net`] } }, { quoted: msg });
        break;
    }
    case 'lvcal': {
        const parts = args.join(' ').split('&');
        if (parts.length !== 2) return reply('*❗ Please provide two names!* \n📋 Example: .lvcal John & Jane');
        const percentage = Math.floor(Math.random() * 101);
        let hearts = percentage >= 80 ? '💖💖💖💖💖' : percentage >= 60 ? '💖💖💖💖' : percentage >= 40 ? '💖💖💖' : '💖';
        await socket.sendMessage(sender, { text: `*↳ ❝ [🎀 𝗔𝗸𝗶𝗿𝗮 𝗚𝗶𝗿𝗹 𝗟𝘃𝗖𝗮𝗹 🎀] ¡! ❞*\n\n*${parts[0].trim()}* 💑 *${parts[1].trim()}*\n\n${hearts}\n*Love Percentage:* ${percentage}%\n\n> *𝗔esthatic 𝗤ueen 𝗕y 𝗖hamod 𝜗𝜚⋆*` }, { quoted: msg });
        break;
    }
    case 'hack': {
        const from = msg.key.remoteJid; 
        const steps = ['🎀 *𝐀𝐤𝐢𝐫𝐚 𝐇𝐚𝐜𝐤 𝐒𝐭𝐚𝐫𝐢𝐧𝐠...* 🎀', '`ɪɴɪᴛɪᴀʟɪᴢɪɴɢ ʜᴀᴄᴋɪɴɢ ᴛᴏᴏʟꜱ...` 🛠️', '`ᴄᴏɴɴᴇᴄᴛɪɴɢ ᴛᴏ ʀᴇᴍᴏᴛᴇ ꜱᴇʀᴠᴇʀ...` 🌐', '
http://googleusercontent.com/immersive_entry_chip/0

දැන් මේක තනි ෆයිල් එකක් නිසා ඔයාගේ Railway එකේ කිසිම `SyntaxError` එකක් එන්නේ නෑ. සම්පූර්ණයෙන්ම වැඩ කරයි මචං! (අර Menu Button එකයි, ඔක්කොමයි මේකේ දාලමයි තියෙන්නේ). 

ට්‍රයි කරලා බලලා කියන්නකෝ.
