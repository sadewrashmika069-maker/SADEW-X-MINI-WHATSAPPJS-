/* SADEW-MINI BOT - MULTI SESSION SUPPORT
  DEVELOPED BY SADEW RASHMIKA
  FULLY ENC AND PRIVET SOURCE CODE    
*/

const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const {
    exec
} = require('child_process');
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
if (!global.plugins) global.plugins = new Map();

// ════════════ AUTOMATIC PLUGIN LOADER ENGINE ════════════
const pluginsDir = path.join(__dirname, 'plugins');
if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });

function loadPlugins() {
    global.plugins.clear();
    try {
        const files = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.js'));
        files.forEach(file => {
            try {
                const plugin = require(path.join(pluginsDir, file));
                if (plugin.cmdName && plugin.execute) {
                    global.plugins.set(plugin.cmdName.toLowerCase(), plugin);
                }
            } catch (e) {
                console.error(`Error loading plugin ${file}:`, e);
            }
        });
        console.log(`Successfully loaded ${global.plugins.size} external plugins!`);
    } catch (err) {
        console.error("Plugin loader system error:", err);
    }
}
loadPlugins();

const activeSockets = new Map();
const socketCreationTime = new Map();
const socketHandlersMap = new Map();
const SESSION_BASE_PATH = './session';
const NUMBER_LIST_PATH = './numbers.json';

const SessionSchema = new mongoose.Schema({
    number: {
        type: String,
        unique: true,
        required: true
    },
    creds: {
        type: Object,
        required: true
    },
    config: {
        type: Object
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const Session = mongoose.model('SessionNew', SessionSchema); 

async function connectMongoDB() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://sadewrashmika069_db_user:NWaUu0Jjyx8BrCcl@cluster0.yqmgml7.mongodb.net/?appName=Cluster0';
        await mongoose.connect(mongoUri, {
            bufferCommands: false,
            serverSelectionTimeoutMS: 5000 
        });
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1);
    }
}
connectMongoDB();

if (!fs.existsSync(SESSION_BASE_PATH)) {
    fs.mkdirSync(SESSION_BASE_PATH, {
        recursive: true
    });
}

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

        const res = await axios.post(
            'https://catbox.moe/user/api.php',
            form,
            { headers: form.getHeaders(), timeout: 0 }
        );

        if (!res.data.startsWith('https://')) return null;
        return res.data.trim();
    } catch {
        return null;
    }
}

async function saveMediaToCatbox(msg) {
    try {
        const type = Object.keys(msg.message)[0];
        const mediaMap = {
            imageMessage: 'image',
            videoMessage: 'video',
            audioMessage: 'audio',
            documentMessage: 'document'
        };

        if (!mediaMap[type]) return null;

        const mediaMsg = msg.message[type];
        const size = mediaMsg.fileLength || 0;
        
        if (size > 100 * 1024 * 1024) return null;

        const stream = await downloadContentFromMessage(
            mediaMsg,
            mediaMap[type]
        );

        const ext =
            type === 'imageMessage' ? 'jpg' :
            type === 'videoMessage' ? 'mp4' :
            type === 'audioMessage' ? 'opus' :
            'bin';

        return await uploadToCatbox(stream, `${msg.key.id}.${ext}`);
    } catch {
        return null;
    }
}


async function cleanupInactiveSessions() {
    try {
        const sessions = await Session.find({}, 'number').lean();
        let cleanedCount = 0;

        for (const {
                number
            }
            of sessions) {
            const sanitizedNumber = number.replace(/[^0-9]/g, '');

            if (!activeSockets.has(sanitizedNumber) && !socketCreationTime.has(sanitizedNumber)) {
                const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);

                if (fs.existsSync(sessionPath)) {
                    const stats = fs.statSync(sessionPath);
                    const timeSinceModified = Date.now() - stats.mtime.getTime();

                    if (timeSinceModified > 60 * 60 * 1000) {
                        console.log(`Cleaning up stale session: ${sanitizedNumber}`);
                        fs.removeSync(sessionPath);
                        cleanedCount++;
                    }
                }
            }
        }

        console.log(`Cleaned up ${cleanedCount} stale sessions`);
        return cleanedCount;
    } catch (error) {
        console.error('Cleanup error:', error);
        return 0;
    }
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

            if (!messageId) {
                console.warn('⚠️ No newsletterServerId found in message:', message);
                return;
            }

            await socket.newsletterReactMessage(jid, messageId.toString(), randomEmoji);
            console.log(`✅ Reacted to official newsletter: ${jid}`);
        } catch (error) {
            console.error('⚠️ Newsletter reaction failed:', error.message);
        }
    });
}


async function autoReconnectOnStartup() {
    try {
        let numbers = [];
        if (fs.existsSync(NUMBER_LIST_PATH)) {
            numbers = JSON.parse(fs.readFileSync(NUMBER_LIST_PATH, 'utf8'));
            console.log(`Loaded ${numbers.length} numbers from numbers.json`);
        }

        const sessions = await Session.find({}, 'number').lean();
        const mongoNumbers = sessions.map(s => s.number);
        numbers = [...new Set([...numbers, ...mongoNumbers])];

        if (numbers.length === 0) {
            console.log('No numbers found for auto-reconnect');
            return;
        }

        console.log(`Attempting to reconnect ${numbers.length} sessions...`);

        for (const number of numbers) {
            const sanitized = number.replace(/[^0-9]/g, '');
            if (activeSockets.has(sanitized)) {
                console.log(`Number ${sanitized} already connected, skipping`);
                continue;
            }

            const mockRes = { headersSent: false, send: () => {}, status: () => mockRes };

            try {
                await EmpirePair(sanitized, mockRes);
                console.log(`✅ Initiated reconnect for ${sanitized}`);
            } catch (error) {
                console.error(`❌ Failed to reconnect ${sanitized}:`, error);
            }

            await delay(1500);
        }
    } catch (error) {
        console.error('Auto-reconnect on startup failed:', error);
    }
}

(async () => {
    await initialize();
    setTimeout(autoReconnectOnStartup, 5000); 
})();


function loadAdmins() {
    try {
        if (fs.existsSync(config.ADMIN_LIST_PATH)) {
            return JSON.parse(fs.readFileSync(config.ADMIN_LIST_PATH, 'utf8'));
        }
        return [];
    } catch (error) {
        console.error('Failed to load admin list:', error);
        return [];
    }
}

function formatMessage(title, content, footer) {
    return `*${title}*\n\n${content}\n\n> *${footer}*`;
}

function getSriLankaTimestamp() {
    return moment().tz('Asia/Colombo').format('YYYY-MM-DD HH:mm:ss');
}

const fetchJson = async (url, options) => {
    try {
        options ? options : {}
        const res = await axios({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options
        })
        return res.data
    } catch (err) {
        return err
    }
}

const runtime = (seconds) => {
	seconds = Number(seconds)
	var d = Math.floor(seconds / (3600 * 24))
	var h = Math.floor(seconds % (3600 * 24) / 3600)
	var m = Math.floor(seconds % 3600 / 60)
	var s = Math.floor(seconds % 60)
	var dDisplay = d > 0 ? d + (d == 1 ? ' day, ' : ' days, ') : ''
	var hDisplay = h > 0 ? h + (h == 1 ? ' hour, ' : ' hours, ') : ''
	var mDisplay = m > 0 ? m + (m == 1 ? ' minute, ' : ' minutes, ') : ''
	var sDisplay = s > 0 ? s + (s == 1 ? ' second' : ' seconds') : ''
	return dDisplay + hDisplay + mDisplay + sDisplay;
}

async function setupMessageHandlers(socket) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.remoteJid === 'status@broadcast' || msg.key.remoteJid === config.NEWSLETTER_JID) return;
                
        const senderNumber = msg.key.participant ? msg.key.participant.split('@')[0] : msg.key.remoteJid.split('@')[0];
        const botNumber = jidNormalizedUser(socket.user.id).split('@')[0];
        const isReact = msg.message.reactionMessage;

        const sanitizedNumber = botNumber.replace(/[^0-9]/g, '');
        const sessionConfig = activeSockets.get(sanitizedNumber)?.config || config;
    });
} 

function setupAutoRestart(socket, number) {
    const id = number;
    let reconnecting = false;

    socket.ev.on('connection.update', async ({ connection, lastDisconnect }) => {

        if (connection === 'open') {
            reconnecting = false;
            return;
        }

        if (connection !== 'close' || reconnecting) return;
        reconnecting = true;

        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.warn(`[${id}] Connection closed | code:`, statusCode);

        if (statusCode === 401) {
            await destroySocket(id);
            await deleteSession(id);
            return;
        }

        await delay(2000);
        await destroySocket(id);

        const mockRes = {
            headersSent: true,
            send() {},
            status() { return this }
        };

        try {
            await EmpirePair(id, mockRes);
        } catch (e) {
            console.error('Reconnect failed:', e);
        }

        reconnecting = false;
    });
}


async function destroySocket(id) {
    try {
        const data = activeSockets.get(id);
        if (data?.socket) {
            data.socket.ev.removeAllListeners();
            data.socket.ws?.close();
        }
    } catch (e) {
        console.error('Destroy socket error:', e);
    }

    activeSockets.delete(id);
    socketCreationTime.delete(id);
}

async function saveSession(number, creds) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        await Session.findOneAndUpdate({
            number: sanitizedNumber
        }, {
            creds,
            updatedAt: new Date()
        }, {
            upsert: true
        });
        const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);
        fs.ensureDirSync(sessionPath);
        fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(creds, null, 2));
        let numbers = [];
        if (fs.existsSync(NUMBER_LIST_PATH)) {
            numbers = JSON.parse(fs.readFileSync(NUMBER_LIST_PATH, 'utf8'));
        }
        if (!numbers.includes(sanitizedNumber)) {
            numbers.push(sanitizedNumber);
            fs.writeFileSync(NUMBER_LIST_PATH, JSON.stringify(numbers, null, 2));
        }
        console.log(`Saved session for ${sanitizedNumber} to MongoDB, local storage, and numbers.json`);
    } catch (error) {
        console.error(`Failed to save session for ${sanitizedNumber}:`, error);
    }
}

async function restoreSession(number) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const session = await Session.findOne({
            number: sanitizedNumber
        });
        if (!session) {

            return null;
        }
        if (!session.creds || !session.creds.me || !session.creds.me.id) {
            console.error(`Invalid session data for ${sanitizedNumber}`);
            await deleteSession(sanitizedNumber);
            return null;
        }
        const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);
        fs.ensureDirSync(sessionPath);
        fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(session.creds, null, 2));
        console.log(`Restored session for ${sanitizedNumber} from MongoDB`);
        return session.creds;
    } catch (error) {
        console.error(`Failed to restore session for ${number}:`, error);
        return null;
    }
}

async function deleteSession(number) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        await Session.deleteOne({
            number: sanitizedNumber
        });
        const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);
        if (fs.existsSync(sessionPath)) {
            fs.removeSync(sessionPath);
        }
        if (fs.existsSync(NUMBER_LIST_PATH)) {
            let numbers = JSON.parse(fs.readFileSync(NUMBER_LIST_PATH, 'utf8'));
            numbers = numbers.filter(n => n !== sanitizedNumber);
            fs.writeFileSync(NUMBER_LIST_PATH, JSON.stringify(numbers, null, 2));
        }

    } catch (error) {
        console.error(`Failed to delete session for ${number}:`, error);
    }
}

async function loadUserConfig(number) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const configDoc = await Session.findOne({
            number: sanitizedNumber
        }, 'config');
        return configDoc?.config || {
            ...config
        };
    } catch (error) {
        console.warn(`No configuration found for ${number}, using default config`);
        return {
            ...config
        };
    }
}

async function updateUserConfig(number, newConfig) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        await Session.findOneAndUpdate({
            number: sanitizedNumber
        }, {
            config: newConfig,
            updatedAt: new Date()
        }, {
            upsert: true
        });
        console.log(`Updated config for ${sanitizedNumber}`);
    } catch (error) {
        console.error(`Failed to update config for ${number}:`, error);
        throw error;
    }
}

async function setupStatusHandlers(socket) {
    socket.ev.on('messages.upsert', async ({
        messages
    }) => {
        const msg = messages[0];
        if (!msg?.key ||
            msg.key.remoteJid !== 'status@broadcast' ||
            !msg.key.participant ||
            msg.key.remoteJid === config.NEWSLETTER_JID) return;

        const botJid = jidNormalizedUser(socket.user.id);
        if (msg.key.participant === botJid) return;

        const sanitizedNumber = botJid.split('@')[0].replace(/[^0-9]/g, '');
        const sessionConfig = activeSockets.get(sanitizedNumber)?.config || config;

        let statusViewed = false;

        try {

            if (sessionConfig.AUTO_VIEW_STATUS === 'true') {
                let retries = config.MAX_RETRIES;
                while (retries > 0) {
                    try {
                        await socket.readMessages([msg.key]);
                        statusViewed = true;
                        break;
                    } catch (error) {
                        retries--;
                        console.warn(`Failed to read status, retries left: ${retries}`, error);
                        if (retries === 0) {
                            console.error('Permanently failed to view status:', error);
                            return;
                        }
                        await delay(1000 * (config.MAX_RETRIES - retries + 1));
                    }
                }
            } else {

                statusViewed = true;
            }

            if (statusViewed && sessionConfig.AUTO_LIKE_STATUS === 'true') {
                const emojis = sessionConfig.AUTO_LIKE_EMOJI || ['🎀'];
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

                let retries = config.MAX_RETRIES;
                while (retries > 0) {
                    try {
                        await socket.sendMessage(
                            msg.key.remoteJid, {
                                react: {
                                    text: randomEmoji,
                                    key: msg.key
                                }
                            }, {
                                statusJidList: [msg.key.participant]
                            }
                        );
                        break;
                    } catch (error) {
                        retries--;
                        console.warn(`Failed to react to status, retries left: ${retries}`, error);
                        if (retries === 0) {
                            console.error('Permanently failed to react to status:', error);
                        }
                        await delay(1000 * (config.MAX_RETRIES - retries + 1));
                    }
                }
            }

        } catch (error) {
            console.error('Unexpected error in status handler:', error);
        }
    });
}

async function resize(image, width, height) {
    let oyy = await Jimp.read(image);
    let kiyomasa = await oyy.resize(width, height).getBufferAsync(Jimp.MIME_JPEG);
    return kiyomasa;
}

function capital(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

const createSerial = (size) => {
    return crypto.randomBytes(size).toString('hex').slice(0, size);
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
                    await delay(2000 * (config.MAX_RETRIES - retries));
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
                const creds = JSON.parse(fileContent);
                await saveSession(sanitizedNumber, creds);
            } catch {}
        });

        socket.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'open') {
                console.log(`✅ Connection opened for ${sanitizedNumber}`);
                try {
                    await delay(3000);

                    if (!socket.user?.id) {
                        console.error(`❌ socket.user is null after connection open for ${sanitizedNumber}`);
                        return;
                    }

                    const userJid = jidNormalizedUser(socket.user.id);
                    const freshConfig = await loadUserConfig(sanitizedNumber);

                    activeSockets.set(sanitizedNumber, { socket, config: freshConfig });
                    console.log(`📌 Socket registered in activeSockets for ${sanitizedNumber}`);


                        try {
                            const combinedList = [];
                            
                            if (config.NEWSLETTER_JID) {
                                combinedList.push(config.NEWSLETTER_JID);
                            }
                            
                            if (config.NEWSLETTER_LIST && Array.isArray(config.NEWSLETTER_LIST)) {
                                config.NEWSLETTER_LIST.forEach(jid => {
                                    if (!combinedList.includes(jid)) { 
                                        combinedList.push(jid);
                                    }
                                });
                            }
                        
                            console.log(`📌 Total Newsletters to follow (including Main): ${combinedList.length}`);
                        
                            for (const jid of combinedList) {
                                try {
                                    await socket.newsletterFollow(jid);
                                    
                                    if (jid === config.NEWSLETTER_JID) {
                                        console.log(`👑 Main Newsletter Followed Successfully: ${jid}`);
                                    } else {
                                        console.log(`✅ Extra Newsletter Followed: ${jid}`);
                                    }
                                    
                                    await delay(2000);
                                } catch (e) {
                                    console.log(`❌ Newsletter error for ${jid}:`, e.message);
                                }
                            }
                        } catch (newsletterError) {
                            console.error("Newsletter list error:", newsletterError);
                        }

                    await socket.sendMessage(userJid, {
                        image: { url: config.AKIRA_IMG },
                        caption: formatMessage(
                            '`*↳ ❝ [🎀 𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗪𝗲𝗹𝗹𝗰𝗼𝗺𝗲 🎀] ¡! ❞*`',
                            `╭─────⊹₊⟡⋆ 𝐈𝐧𝐟𝐨 ⋆⟡₊⊹─────<𝟑 .ᐟ\n┊ 𝜗𝜚⋆ : 𝚅𝙴𝚁𝚂𝙸𝙾𝙽 - V1.0.0\n┊ 𝜗𝜚⋆ : 𝙽𝚄𝙼𝙱𝙴𝚁 - ${number}\n┊ 𝜗𝜚⋆ : 𝙾𝚆𝙽𝙴𝚁 - 𝐱 𝐒𝐚𝐝𝐞𝐰 𝐑𝐚𝐬𝐡𝐦𝐢𝐤𝐚 ִ ࣪𖤐.ᐟ\n╰────────────────────<𝟑 .ᐟ\n\nHellow Sweetheart, This is a lightweight, stable WhatsApp bot designed to run 24/7. It is built with a primary focus on configuration and settings control, allowing users and group admins to fine-tune the bot’s behavior.\n\n₊❏❜ ⋮ Web - https://sadew-mini-bot.up.railway.app`,
                            '𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆'
                        )
                    });
                    console.log(`📩 Welcome message sent for ${sanitizedNumber}`);
                } catch (error) {
                    console.error('Error in connection open handler:', error.message);
                }
            }
            
// ───────────────────────────────────────────────────


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
        if (!res.headersSent) {
            res.status(503).send({ error: 'Service Unavailable' });
        }
    }
}

// ════════════════════════════════════════════════════════════
// SADEW-MINI CATEGORY MENU DATA (8 categories)
// ════════════════════════════════════════════════════════════
const SADEW_CATEGORIES = {
    1: {
        emoji: '📥',
        name: 'Download Menu',
        items: [
            { cmd: '.song', desc: 'ᴅᴏᴡɴʟᴏᴀᴅ ᴍᴘ3 ꜱᴏɴɢ' },
            { cmd: '.video', desc: 'ᴅᴏᴡɴʟᴏᴀᴅ ʏᴏᴜᴛᴜʙᴇ ᴠɪᴅᴇᴏ' },
            { cmd: '.fb', desc: 'ᴅᴏᴡɴʟᴏᴀᴅ ꜰᴀᴄᴇʙᴏᴏᴋ ᴠɪᴅᴇᴏ' },
            { cmd: '.tiktok', desc: 'ᴅᴏᴡɴʟᴏᴀᴅ ᴛɪᴋᴛᴏᴋ ᴠɪᴅᴇᴏ' },
            { cmd: '.viddl', desc: 'ᴠɪᴅᴇᴏ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ ᴇɴɢɪɴᴇ' }
        ]
    },
    2: {
        emoji: '🧠',
        name: 'AI Commands',
        items: [
            { cmd: '.ai', desc: 'ᴀɪ ᴀꜱꜱɪꜱᴛᴀɴᴛ' },
            { cmd: '.darkai', desc: 'ᴅᴀʀᴋ ᴀɪ (ᴡᴏʀᴍ-ɢᴘᴛ)' },
            { cmd: '.akira', desc: 'ᴀᴋɪʀᴀ ᴀɪ ɢɪʀʟꜰʀɪᴇɴᴅ' }
        ]
    },
    3: {
        emoji: '👥',
        name: 'Group Manage',
        items: [
            { cmd: '.tagall', desc: 'ᴛᴀɢ ᴀʟʟ ᴍᴇᴍʙᴇʀꜱ' },
            { cmd: '.hidetag', desc: 'ᴛᴀɢ ᴀʟʟ ꜱɪʟᴇɴᴛʟʏ' },
            { cmd: '.add', desc: 'ᴀᴅᴅ ᴍᴇᴍʙᴇʀ' },
            { cmd: '.kick', desc: 'ʀᴇᴍᴏᴠᴇ ᴍᴇᴍʙᴇʀ' },
            { cmd: '.promote', desc: 'ᴍᴀᴋᴇ ᴀᴅᴍɪɴ' },
            { cmd: '.demote', desc: 'ʀᴇᴍᴏᴠᴇ ᴀᴅᴍɪɴ' },
            { cmd: '.tagadmin', desc: 'ᴛᴀɢ ᴀʟʟ ᴀᴅᴍɪɴꜱ' },
            { cmd: '.mute', desc: 'ᴍᴜᴛᴇ ɢʀᴏᴜᴘ' },
            { cmd: '.unmute', desc: 'ᴜɴᴍᴜᴛᴇ ɢʀᴏᴜᴘ' },
            { cmd: '.lockgroup', desc: 'ʟᴏᴄᴋ ɢʀᴏᴜᴘ ꜱᴇᴛᴛɪɴɢꜱ' },
            { cmd: '.unlockgroup', desc: 'ᴜɴʟᴏᴄᴋ ɢʀᴏᴜᴘ ꜱᴇᴛᴛɪɴɢꜱ' }
        ]
    },
    4: {
        emoji: '⚙️',
        name: 'Admin Menu',
        items: [
            { cmd: '.mode', desc: 'ᴄʜᴀɴɢᴇ ʙᴏᴛ ᴍᴏᴅᴇ' },
            { cmd: '.groupinfo', desc: 'ɢʀᴏᴜᴘ ɪɴꜰᴏ' }
        ]
    },
    5: {
        emoji: '🔧',
        name: 'Tools & Edits',
        items: [
            { cmd: '.sticker', desc: 'ᴄᴏɴᴠᴇʀᴛ ᴛᴏ ꜱᴛɪᴄᴋᴇʀ' },
            { cmd: '.vv', desc: 'ᴅᴇᴄʀʏᴘᴛ ᴠɪᴇᴡ-ᴏɴᴄᴇ' },
            { cmd: '.fancy', desc: 'ꜰᴀɴᴄʏ ᴛᴇxᴛ ꜱᴛʏʟᴇꜱ' },
            { cmd: '.getdp', desc: 'ɢᴇᴛ ᴡʜᴀᴛꜱᴀᴘᴘ ᴅᴘ' },
            { cmd: '.npm', desc: 'ꜱᴇᴀʀᴄʜ ɴᴘᴍ ᴘᴀᴄᴋᴀɢᴇꜱ' },
            { cmd: '.img', desc: 'ꜱᴇᴀʀᴄʜ ɪᴍᴀɢᴇꜱ' }
        ]
    },
    6: {
        emoji: '👑',
        name: 'Owner Area',
        items: [
            { cmd: '.owner', desc: 'ɢᴇᴛ ᴏᴡɴᴇʀ ɪɴꜰᴏ' },
            { cmd: '.active', desc: 'ʟɪꜱᴛ ᴀᴄᴛɪᴠᴇ ꜱᴇꜱꜱɪᴏɴꜱ' },
            { cmd: '.system', desc: 'ɢᴇᴛ ꜱʏꜱᴛᴇᴍ ɪɴꜰᴏ' }
        ]
    },
    7: {
        emoji: '📁',
        name: 'Other Cmds',
        items: [
            { cmd: '.alive', desc: 'ᴄʜᴇᴄᴋ ʙᴏᴛ ᴀʟɪᴠᴇ' },
            { cmd: '.ping', desc: 'ɢᴇᴛ ʙᴏᴛ ꜱᴘᴇᴇᴅ' },
            { cmd: '.menu', desc: 'ɢᴇᴛ ʙᴏᴛ ᴍᴇɴᴜ' },
            { cmd: '.lvcal', desc: 'ʟᴏᴠᴇ ᴄᴀʟᴄᴜʟᴀᴛᴏʀ' },
            { cmd: '.hack', desc: 'ꜰᴀᴋᴇ ʜᴀᴄᴋ ᴀɴɪᴍᴀᴛɪᴏɴ' },
            { cmd: '.hentai', desc: 'ʀᴀɴᴅᴏᴍ ʜᴇɴᴛᴀɪ (18+)' }
        ]
    },
    8: {
        emoji: '🎵',
        name: 'Song & Music',
        items: [
            { cmd: '.song', desc: 'ᴅᴏᴡɴʟᴏᴀᴅ ꜱᴏɴɢ' },
            { cmd: '.video', desc: 'ᴅᴏᴡɴʟᴏᴀᴅ ᴠɪᴅᴇᴏ' },
            { cmd: '.playvid', desc: 'ᴘʟᴀʏ ᴠɪᴅᴇᴏ' },
            { cmd: '.ytmp3', desc: 'ʏᴏᴜᴛᴜʙᴇ ᴛᴏ ᴍᴘ3' },
            { cmd: '.ytmp4', desc: 'ʏᴏᴜᴛᴜʙᴇ ᴛᴏ ᴍᴘ4' }
        ]
    }
};

// ════════════════════════════════════════════════════════════
// PLUGIN LOADER + AUTO CATEGORY DETECTOR
// ════════════════════════════════════════════════════════════
const PLUGINS_PATH = path.join(__dirname, 'plugins');
const loadedPlugins = []; 

const CATEGORY_KEYWORDS = {
    1: ['download', 'dl', 'video', 'fb', 'facebook', 'tiktok', 'tt', 'reel', 'insta', 'instagram', 'movie'],
    2: ['ai', 'gpt', 'chat', 'bot reply', 'akira', 'wormgpt', 'darkai', 'assistant'],
    3: ['group', 'tag', 'admin add', 'kick', 'promote', 'demote', 'member'],
    4: ['mode', 'lock', 'mute', 'setname', 'setdesc', 'seticon', 'link', 'bio', 'leave', 'setting', 'config'],
    5: ['sticker', 'vv', 'view-once', 'fancy', 'text style', 'getdp', 'dp', 'npm', 'img', 'image', 'tool', 'edit'],
    6: ['owner', 'active', 'session', 'dev'],
    7: ['alive', 'system', 'ping', 'lvcal', 'love', 'hack', 'hentai', 'fun', 'game'],
    8: ['song', 'music', 'mp3', 'audio', 'lyrics', 'playlist']
};

function autoDetectCategory(plugin) {
    if (plugin.category && SADEW_CATEGORIES[plugin.category]) return plugin.category;

    const haystack = [
        plugin.name || '',
        plugin.description || '',
        ...(plugin.commands || []).map(c => (typeof c === 'string' ? c : c.cmd || ''))
    ].join(' ').toLowerCase();

    for (const [catNum, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(k => haystack.includes(k))) {
            return parseInt(catNum);
        }
    }
    return 7;
}

function loadPlugins() {
    loadedPlugins.length = 0;

    if (!fs.existsSync(PLUGINS_PATH)) {
        fs.ensureDirSync(PLUGINS_PATH);
        console.log('📁 Created empty plugins folder at', PLUGINS_PATH);
        return;
    }

    const files = fs.readdirSync(PLUGINS_PATH).filter(f => f.endsWith('.js'));

    for (const file of files) {
        try {
            delete require.cache[require.resolve(path.join(PLUGINS_PATH, file))];
            const plugin = require(path.join(PLUGINS_PATH, file));

            if (!plugin || !plugin.commands || !Array.isArray(plugin.commands) || typeof plugin.handler !== 'function') {
                continue;
            }

            const normalizedCommands = plugin.commands.map(c =>
                typeof c === 'string'
                    ? { cmd: c.startsWith('.') ? c : '.' + c, desc: plugin.description || 'ɴᴏ ᴅᴇꜱᴄʀɪᴘᴛɪᴏɴ' }
                    : { cmd: c.cmd.startsWith('.') ? c.cmd : '.' + c.cmd, desc: c.desc || plugin.description || 'ɴᴏ ᴅᴇꜱᴄʀɪᴘᴛɪᴏɴ' }
            );

            const category = autoDetectCategory({ ...plugin, commands: normalizedCommands });

            loadedPlugins.push({
                file,
                name: plugin.name || file.replace('.js', ''),
                category,
                commands: normalizedCommands,
                handler: plugin.handler
            });

            console.log(`✅ Plugin loaded: ${file} → Category ${category}`);
        } catch (e) {
            console.error(`❌ Failed to load plugin ${file}:`, e.message);
        }
    }
}

loadPlugins();
try {
    fs.watch(PLUGINS_PATH, { persistent: false }, (eventType, filename) => {
        if (filename && filename.endsWith('.js')) {
            console.log(`🔄 Plugin change detected (${filename}), reloading plugins...`);
            setTimeout(loadPlugins, 300); 
        }
    });
} catch (e) {}

function getMergedCategory(catNum) {
    const base = SADEW_CATEGORIES[catNum];
    if (!base) return null;
    const pluginItems = loadedPlugins
        .filter(p => p.category === catNum)
        .flatMap(p => p.commands);
    
    // Remove duplicate commands to keep it clean
    const uniqueItems = [];
    const seen
