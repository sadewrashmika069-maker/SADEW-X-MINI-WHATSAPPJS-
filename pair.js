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
    const seen = new Set();
    [...base.items, ...pluginItems].forEach(item => {
        if (!seen.has(item.cmd)) {
            seen.add(item.cmd);
            uniqueItems.push(item);
        }
    });

    return {
        emoji: base.emoji,
        name: base.name,
        items: uniqueItems
    };
}

function getTotalCommandCount() {
    const builtInCount = Object.values(SADEW_CATEGORIES).reduce((sum, cat) => sum + cat.items.length, 0);
    const pluginCount = loadedPlugins.reduce((sum, p) => sum + p.commands.length, 0);
    return builtInCount + pluginCount;
}

// ════════════ AUTOMATIC MENU GENERATOR ════════════
function buildCategoryTextMessage(catNum) {
    const cat = getMergedCategory(catNum);
    if (!cat) return null;

    const header = `╭───⟡ 🤖 𝗦𝗔𝗗𝗘𝗪-𝗠𝗜𝗡𝗜 ⟡───\n┊\n┣⪼ ❖ ${cat.emoji} *${cat.name}* ✿\n┊\n`;
    const bodyLines = cat.items.map(i => `┣ ❖ ${i.cmd} ➜ _${i.desc}_`).join('\n');
    const footer = `\n┊\n╰┈⪼ 𝘗𝘰𝘸𝘦𝘳𝘦𝘥 𝘉𝘺 𝘚𝘢𝘥𝘦𝘸 𝘙𝘢𝘴𝘩𝘮𝘪𝘬𝘢 ⪻`;

    return { text: header + bodyLines + footer };
}

async function setupCommandHandlers(socket, number) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
                
    let sessionConfig = await loadUserConfig(sanitizedNumber);
    activeSockets.set(sanitizedNumber, {
        socket,
        config: sessionConfig
    });

    const MEDIA_TYPES = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'];

    socket.ev.on('messages.upsert', async ({
        messages
    }) => {

      const msg = messages[0];
        if (!msg.message) return;
        
const type = getContentType(msg.message);
        if (!msg.message) return;
        msg.message = (getContentType(msg.message) === 'ephemeralMessage') ? msg.message.ephemeralMessage.message : msg.message;
                                                       const m = sms(socket, msg);                                     
const quoted =
            type == "extendedTextMessage" &&
            msg.message.extendedTextMessage.contextInfo != null
              ? msg.message.extendedTextMessage.contextInfo.quotedMessage || []
              : [];
        const body = (type === 'conversation') ? msg.message.conversation 
            : msg.message?.extendedTextMessage?.contextInfo?.hasOwnProperty('quotedMessage') 
                ? msg.message.extendedTextMessage.text 
            : (type == 'interactiveResponseMessage') 
                ? msg.message.interactiveResponseMessage?.nativeFlowResponseMessage 
                    && JSON.parse(msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson)?.id 
            : (type == 'templateButtonReplyMessage') 
                ? msg.message.templateButtonReplyMessage?.selectedId 
            : (type === 'extendedTextMessage') 
                ? msg.message.extendedTextMessage.text 
            : (type == 'imageMessage') && msg.message.imageMessage.caption 
                ? msg.message.imageMessage.caption 
            : (type == 'videoMessage') && msg.message.videoMessage.caption 
                ? msg.message.videoMessage.caption 
            : (type == 'buttonsResponseMessage') 
                ? msg.message.buttonsResponseMessage?.selectedButtonId 
            : (type == 'listResponseMessage') 
                ? msg.message.listResponseMessage?.singleSelectReply?.selectedRowId 
            : (type == 'messageContextInfo') 
                ? (msg.message.buttonsResponseMessage?.selectedButtonId 
                    || msg.message.listResponseMessage?.singleSelectReply?.selectedRowId 
                    || msg.text) 
            : (type === 'viewOnceMessage') 
                ? msg.message[type]?.message[getContentType(msg.message[type].message)] 
            : (type === "viewOnceMessageV2") 
                ? (msg.message[type]?.message?.imageMessage?.caption || msg.message[type]?.message?.videoMessage?.caption || "") 
            : '';
     
        if (!body) return;
    
        const text = body;
        const isCmd = text.startsWith(sessionConfig.PREFIX || '!');
        const sender = msg.key.remoteJid;

        const nowsender = msg.key.fromMe ?
            (socket.user.id.split(':')[0] + '@s.whatsapp.net') :
            (msg.key.participant || msg.key.remoteJid);

        const senderNumber = nowsender.split('@')[0];
        const developers = `${config.OWNER_NUMBER}`;
        const botNumber = socket.user.id.split(':')[0];

        const isOwner = botNumber.includes(senderNumber) ? true : developers.includes(senderNumber);
        const isGroup = msg.key.remoteJid.endsWith('@g.us');

        if (!isOwner && sessionConfig.MODE === 'private') return;
        if (!isOwner && isGroup && sessionConfig.MODE === 'inbox') return;
        if (!isOwner && !isGroup && sessionConfig.MODE === 'groups') return;

        // ════════════ MENU ROUTER (TEXT REPLY & BUTTON CATCHER) ════════════
        let requestedCategory = null;

        // 1. Check for Text Reply to the Menu Message
        if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
            const quotedText = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || quotedMsg.imageMessage?.caption || "";
            
            if (quotedText.includes("┏━━━━『 𝐂𝐀𝐓𝐄𝐆𝐎𝐑𝐈𝐄𝐒 』━━━━━") && /^[1-8]$/.test(text.trim())) {
                requestedCategory = parseInt(text.trim());
            }
        }

        // 2. Check for Menu Button Click
        const btnId = msg.message?.buttonsResponseMessage?.selectedButtonId || 
                      msg.message?.templateButtonReplyMessage?.selectedId || 
                      msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.id || 
                      text;

        if (btnId && btnId.startsWith('.menu_cat_')) {
            requestedCategory = parseInt(btnId.replace('.menu_cat_', ''));
        }

        // Output the specific category text menu
        if (requestedCategory && requestedCategory >= 1 && requestedCategory <= 8) {
            const catMsg = buildCategoryTextMessage(requestedCategory);
            if (catMsg) {
                return await socket.sendMessage(msg.key.remoteJid, catMsg, { quoted: msg });
            }
        }

        // ════════════ VIDEO DOWNLOAD MENU ROUTER ════════════
        if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const replyText = text.trim();
            const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
            const quotedText = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || "";

            if (quotedText.includes("*🔍 SADEW-MINI VIDEO SEARCH*") && /^[1-5]$/.test(replyText)) {
                if (global.sadewVideoSearch && global.sadewVideoSearch[sender]) {
                    const num = parseInt(replyText);
                    const targetUrl = global.sadewVideoSearch[sender][num - 1]; 

                    if (targetUrl) {
                        const buttonMessage = {
                            text: `*🎥 Video Selected!*\n\n🔗 ${targetUrl}\n\n> *පහතින් ඔබට අවශ්‍ය Video Quality එක තෝරන්න:*`,
                            footer: '👑 SADEW-MINI 👑',
                            buttons: [
                                { buttonId: `.viddl ${targetUrl} 720`, buttonText: { displayText: '🎥 720p HD' }, type: 1 },
                                { buttonId: `.viddl ${targetUrl} 480`, buttonText: { displayText: '🎞️ 480p' }, type: 1 },
                                { buttonId: `.viddl ${targetUrl} 360`, buttonText: { displayText: '📱 360p' }, type: 1 }
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

        // ════════════ DYNAMIC PLUGIN EXECUTION ════════════
        if (isCmd) {
            const parts = text.slice((sessionConfig.PREFIX || '!').length).trim().split(/\s+/);
            const cmdName = parts[0].toLowerCase();
            const args = parts.slice(1);
            
            const pluginToExecute = loadedPlugins.find(p => 
                p.commands.some(c => c.cmd.replace(/^\./, '').toLowerCase() === cmdName)
            );

            if (pluginToExecute) {
                try {
                    return await pluginToExecute.handler(socket, msg, m, args, sessionConfig);
                } catch (err) {
                    console.error(`Plugin error (${cmdName}):`, err);
                }
            }
        }

        if (!isCmd) return;
        const parts = text.slice((sessionConfig.PREFIX || '!').length).trim().split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        const reply = async (text, options = {}) => {
            await socket.sendMessage(msg.key.remoteJid, { text, ...options }, { quoted: msg });
        };
        
        const ARABIAN_TITLE = '🦋 ₊˚ ⊹ 𝐒 𝐀 𝐃 𝐄 𝐖 - 𝐌 𝐈 𝐍 𝐈 ⊹ ˚₊ 𝜗𝜚';
        const arabianCtx = () => ({
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid  : "120363419619460838@newsletter",
                newsletterName : ARABIAN_TITLE,
                serverMessageId: 123,
            }
        });

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

            // ════════════ MAIN MENU COMMAND ════════════
            case 'menu':
            case 'list':
            case 'panel': {
                try { await socket.sendMessage(sender, { react: { text: '🤖', key: msg.key } }); } catch (_) {}
                
                const pushname = msg.pushName || 'Guest';
                const slDate = moment().tz('Asia/Colombo').format('YYYY-MM-DD');
                const slTimeNow = moment().tz('Asia/Colombo').format('HH:mm:ss');
                const botName = '𝓢𝓐𝓓𝓔𝓦-𝓜𝓘𝓝𝓘';

                const menuHeader = `┌──⟡ 🤖 ${botName} ⟡──
┊
┠⪼✿ ✦ 👤 𝓝𝓪𝓶𝓮   : ${pushname}
┠⪼✿ ✦ 🔖 𝓜𝓸𝓭𝓮   : ${sessionConfig.MODE || "Public"}
┠⪼✿ ✦ 📅 𝓓𝓪𝓽𝓮   : ${slDate}
┠⪼✿ ✦ ⏰ 𝓣𝓲𝓶𝓮   : ${slTimeNow}
┠⪼✿ ✦ ⚡ 𝓤𝓹𝓽𝓲𝓶𝓮 : ${getUptime()}
┠⪼✿ ✦ 📦 𝓟𝓵𝓾𝓰𝓲𝓷𝓼: cmd = ${getTotalCommandCount()}
┠⪼✿ ✦ 🔰 𝓟𝓻𝓮𝓯𝓲𝔁 : ${sessionConfig.PREFIX || "."}
┊
└──⟡ ━━━━━━━━━━━━━━━━ ⟡
┏━━━━『 𝐂𝐀𝐓𝐄𝐆𝐎𝐑𝐈𝐄𝐒 』━━━━━
┣⪼ ❖ 1. 📥 Download Menu ✿
┣⪼ ❖ 2. 🧠 AI Commands ✿
┣⪼ ❖ 3. 👥 Group Manage ✿
┣⪼ ❖ 4. ⚙️ Admin Menu ✿
┣⪼ ❖ 5. 🔧 Tools & Edits ✿
┣⪼ ❖ 6. 👑 Owner Area ✿
┣⪼ ❖ 7. 📁 Other Cmds ✿
┣⪼ ❖ 8. 🎵 Song & Music ✿
┗━━━━━━━━━━━━━━━━━━━━━━━━━
⊱ ─────── { 𑁍 } ─────── ⊰
╰┈⪼ 𝘗𝘰𝘸𝘦𝘳𝘦𝘥 𝘉𝘺 𝘚𝘢𝘥𝘦𝘸 𝘙𝘢𝘴𝘩𝘮𝘪𝘬𝘢 ⪻
⊱ ─────── { 𑁍 } ─────── ⊰

> *ඔබට අවශ්‍ය category එකට අදාල අංකය (1-8) මෙම පණිවිඩයට Reply කරන්න හෝ පහතින් Button එක Click කරන්න.*`;

                // Main Menu with 8 Buttons
                const buttonMessage = {
                    image: { url: akira },
                    caption: menuHeader,
                    footer: '👑 SADEW-MINI 👑',
                    buttons: [
                        { buttonId: '.menu_cat_1', buttonText: { displayText: '📥 Download Menu' }, type: 1 },
                        { buttonId: '.menu_cat_2', buttonText: { displayText: '🧠 AI Commands' }, type: 1 },
                        { buttonId: '.menu_cat_3', buttonText: { displayText: '👥 Group Manage' }, type: 1 },
                        { buttonId: '.menu_cat_4', buttonText: { displayText: '⚙️ Admin Menu' }, type: 1 },
                        { buttonId: '.menu_cat_5', buttonText: { displayText: '🔧 Tools & Edits' }, type: 1 },
                        { buttonId: '.menu_cat_6', buttonText: { displayText: '👑 Owner Area' }, type: 1 },
                        { buttonId: '.menu_cat_7', buttonText: { displayText: '📁 Other Cmds' }, type: 1 },
                        { buttonId: '.menu_cat_8', buttonText: { displayText: '🎵 Song & Music' }, type: 1 }
                    ],
                    headerType: 4,
                    contextInfo: arabianCtx()
                };

                return await socket.sendMessage(sender, buttonMessage, { quoted: msg });
            }                   
            
            case 'ping': {
                try { await socket.sendMessage(sender, { react: { text: '🍬', key: msg.key } }); } catch (_) {}     
                const start = Date.now();
                const pingMsg = await socket.sendMessage(sender, { text: 'පොඩ්ඩක් ඉන්න... 🍬' }, { quoted: msg });
                const ms = Date.now() - start;
                try { if (pingMsg?.key) await socket.sendMessage(sender, { delete: pingMsg.key }); } catch (_) {}

                await socket.sendMessage(sender, {
                    image: { url: akira },
                    caption: `*↳ ❝ [🎀 𝗦𝗔𝗗𝗘𝗪-𝗠𝗜𝗡𝗜 𝗣𝗶𝗻𝗴 🎀] ¡! ❞*\n\n` +
                             `┏━━━━━°⌜ \`赤い糸\` ⌟°━━━━━┓\n` +
                             `┃₊❏❜ ⋮🏓 𝙿𝙾𝙽𝙶 : _pong!_\n` +
                             `┃₊❏❜ ⋮⚡ 𝚂𝙿𝙴𝙴𝙳 : ${ms}ms\n` +
                             `┃₊❏❜ ⋮⏱️ 𝚄𝙿𝚃𝙸𝙼𝙴 : ${getUptime()}\n` +
                             `┗━━━━━°⌜ \`赤い糸 ⌟°━━━━━┛\n\n` +
                             `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`,
                    contextInfo: arabianCtx()
                }, { quoted: msg });
                break;
            }

            case 'alive': {
                try { await socket.sendMessage(sender, { react: { text: '🍓', key: msg.key } }); } catch (_) {}
                const title = '*↳ ❝ [🎀 𝗦𝗔𝗗𝗘𝗪-𝗠𝗜𝗡𝗜 𝗔𝗹𝗶𝘃𝗲 🎀] ¡! ❞*';
                const content = `*⊹₊⟡⋆ ⋮ Ａｂｏｕｔ ᶻ 𝗓 𐰁 .ᐟ*\n` +
                                `➜ This is a lightweight, stable WhatsApp bot designed to run 24/7. It is allowing users and group admins to fine-tune the bot’s behavior.\n\n` +
                                `*⊹₊⟡⋆ ⋮ Ｄｅｐｌｏｙ ᶻ 𝗓 𐰁 .ᐟ*\n` +
                                `➜ *Website:* https://whatsapp.com/channel/0029Vb7BZe8I1rcapv3kSP21`;
                const footer = '> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*';

                await socket.sendMessage(sender, {
                    image: { url: akira },
                    caption: `${title}\n\n${content}\n\n${footer}`,
                    contextInfo: arabianCtx() 
                }, { quoted: msg });
                break;
            }

            case 'system': {
                try { await socket.sendMessage(sender, { react: { text: '🛸', key: msg.key } }); } catch (_) {}
                const uptime = getUptime();
                const ramUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
                const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
                const nodeVersion = process.version;
                const platform = os.platform();
                
                const slDate = moment().tz('Asia/Colombo').format('YYYY-MM-DD');
                const slTimeNow = moment().tz('Asia/Colombo').format('HH:mm:ss');

                const sysInfo = `*↳ ❝ [🎀 𝗦𝗔𝗗𝗘𝗪-𝗠𝗜𝗡𝗜 𝗦𝘆𝘀𝘁𝗲𝗺 🎀] ¡! ❞*\n\n` +
                                `┏━━━━━°⌜ \`赤い糸\` ⌟°━━━━━┓\n` +
                                `┃ *⏱️ 𝚄𝙿𝚃𝙸𝙼𝙴:* ${uptime}\n` +
                                `┃ *📟 𝚁𝙰𝙼 𝚄𝚂𝙰𝙶𝙴:* ${ramUsage} MB / ${totalRam} GB\n` +
                                `┃ *📦 𝙽𝙾𝙳𝙴 𝚅𝙴𝚁:* ${nodeVersion}\n` +
                                `┃ *💻 𝙿𝙻𝙰𝚃𝙵𝙾𝚁𝙼:* ${platform}\n` +
                                `┃ *📅 𝙳𝙰𝚃𝙴:* ${slDate}\n` +
                                `┃ *⌚ 𝚃𝙸𝙼𝙴:* ${slTimeNow}\n` +
                                `┗━━━━━°⌜ \`赤い糸\` ⌟°━━━━━┛\n\n` +
                                `> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮 𝜗𝜚⋆*`;

                await socket.sendMessage(sender, {
                    image: { url: akira },
                    caption: sysInfo,
                    contextInfo: arabianCtx()
                }, { quoted: msg });
                break;
            }

            case 'song':
            case 'ytmp3': {
                try {
                    const query = args.join(' ');
                    if (!query) return reply("🎵 *කරුණාකර සින්දුවක නමක් හෝ YouTube ලින්ක් එකක් ලබා දෙන්න!*");
                    try { await socket.sendMessage(sender, { react: { text: '🔎', key: msg.key } }); } catch (_) {}

                    const API_TOKEN = "VK4fry";
                    const YT_SEARCH_API = "https://whiteshadow-x-api.onrender.com/api/search/yt";
                    const YT_DOWNLOAD_API = "https://whiteshadow-x-api.onrender.com/api/download/ytmp3";

                    let youtubeUrl = null;
                    let songTitle = "Sadew-MD Audio";

                    const regex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[^\s?#]+)/i;
                    const match = query.match(regex);

                    if (match) {
                        youtubeUrl = match[0].trim();
                    } else {
                        const searchRes = await axios.get(`${YT_SEARCH_API}?q=${encodeURIComponent(query)}&apitoken=${API_TOKEN}`);
                        if (searchRes.data && searchRes.data.success && searchRes.data.result.length > 0) {
                            youtubeUrl = searchRes.data.result[0].url;
                            songTitle = searchRes.data.result[0].title || songTitle;
                        }
                    }

                    if (!youtubeUrl) return reply("❌ *සොයා ගැනීමට නොහැකි විය!*");

                    const dlRes = await axios.get(`${YT_DOWNLOAD_API}?url=${encodeURIComponent(youtubeUrl)}&quality=320&apitoken=${API_TOKEN}`);
                    if (dlRes.data && dlRes.data.success && dlRes.data.result) {
                        const audioDownloadUrl = dlRes.data.result.download_url;
                        const cleanFileName = (dlRes.data.result.title || songTitle).replace(/[\\/:*?"<>|]/g, "_").slice(0, 60) + ".mp3";
                        
                        await socket.sendMessage(sender, {
                            audio: { url: audioDownloadUrl },
                            mimetype: 'audio/mpeg',
                            fileName: cleanFileName,
                            ptt: false
                        }, { quoted: msg });
                        try { await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } }); } catch (_) {}
                    }
                } catch (e) { reply("❌ Error: " + e.message); }
                break;
            }

            case 'video':
            case 'ytmp4': {
                try {
                    const query = args.join(' ');
                    if (!query) return reply("🎥 *කරුණාකර නමක් හෝ ලින්ක් එකක් දෙන්න!*");
                    const API_TOKEN = "VK4fry";
                    const YT_SEARCH_API = "https://whiteshadow-x-api.onrender.com/api/search/yt";
                    const isUrl = /(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[^\s?#]+)/i.test(query);

                    if (isUrl) {
                        const url = query.match(/(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[^\s?#]+)/i)[0];
                        const buttonMessage = {
                            text: `*🎥 Video Selected!*\n\n🔗 ${url}\n\n> *තෝරන්න:*`,
                            footer: '👑 SADEW-MINI 👑',
                            buttons: [
                                { buttonId: `.viddl ${url} 720`, buttonText: { displayText: '🎥 720p HD' }, type: 1 },
                                { buttonId: `.viddl ${url} 480`, buttonText: { displayText: '🎞️ 480p' }, type: 1 },
                                { buttonId: `.viddl ${url} 360`, buttonText: { displayText: '📱 360p' }, type: 1 }
                            ],
                            headerType: 1
                        };
                        return await socket.sendMessage(sender, buttonMessage, { quoted: msg });
                    }

                    const searchRes = await axios.get(`${YT_SEARCH_API}?q=${encodeURIComponent(query)}&apitoken=${API_TOKEN}`);
                    if (searchRes.data && searchRes.data.success && searchRes.data.result.length > 0) {
                        const topResults = searchRes.data.result.slice(0, 5);
                        global.sadewVideoSearch[sender] = topResults.map(v => v.url);
                        let listText = `*🔍 SADEW-MINI VIDEO SEARCH*\n\n`;
                        topResults.forEach((v, index) => { listText += `*${index + 1}.* ${v.title}\n`; });
                        listText += `\n> *අංකය Reply කරන්න.*`;
                        await reply(listText);
                    }
                } catch (e) { reply("❌ Error"); }
                break;
            }

            case 'viddl': {
                let inputPath, outputPath;
                try {
                    if (!args[0] || !args[1]) return;
                    const url = args[0];
                    const quality = args[1];
                    let downloadUrl = "";
                    let videoTitle = "Video";

                    const zantaApiUrl = `https://api.zanta-mini.store/api/ytdl?apiKey=zan_FIAO7Ayh_eo1vllkep6&url=${encodeURIComponent(url)}&type=mp4&quality=${quality}`;
                    const res1 = await axios.get(zantaApiUrl);
                    if (res1.data && res1.data.success && res1.data.result) {
                        downloadUrl = res1.data.result.download_url;
                        videoTitle = res1.data.result.title || videoTitle;
                    }

                    if (!downloadUrl) return reply("❌ Link error");

                    const tempId = crypto.randomBytes(4).toString('hex');
                    inputPath = path.join(__dirname, `input_${tempId}.mp4`);
                    outputPath = path.join(__dirname, `output_${tempId}.mp4`);

                    const response = await axios({ method: 'GET', url: downloadUrl, responseType: 'stream' });
                    const writer = fs.createWriteStream(inputPath);
                    response.data.pipe(writer);
                    await new Promise((res, rej) => { writer.on('finish', res); writer.on('error', rej); });

                    await new Promise((res, rej) => {
                        ffmpeg(inputPath)
                            .outputOptions(['-c:v libx264', '-c:a aac', '-preset ultrafast', '-crf 28', '-movflags +faststart'])
                            .save(outputPath)
                            .on('end', res)
                            .on('error', rej);
                    });

                    await socket.sendMessage(sender, {
                        video: fs.readFileSync(outputPath),
                        mimetype: 'video/mp4',
                        caption: `🎬 *${videoTitle}* [${quality}p]\n\n> *𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗕𝘆 𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮*`
                    }, { quoted: msg });

                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                } catch (e) { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); }
                break;
            }

            case 'fb': {
                try {
                    const query = args.join(' ');
                    if (!query) return reply("🔗 Link link!");
                    const fbRes = await axios.get(`https://www.movanest.xyz/v2/fbdown?url=${encodeURIComponent(query)}`);
                    if (fbRes.data.status && fbRes.data.results.length > 0) {
                        const vUrl = fbRes.data.results[0].hdQualityLink || fbRes.data.results[0].normalQualityLink;
                        await socket.sendMessage(sender, { video: { url: vUrl }, caption: `✅ FB Video Downloaded\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶*` }, { quoted: msg });
                    }
                } catch (e) { reply("❌ Failed"); }
                break;
            }

            case 'tiktok':
            case 'tt': {
                try {
                    const query = args.join(' ');
                    if (!query) return reply("🔗 Link link!");
                    const apiUrl = `https://tikwm.com/api/?url=${encodeURIComponent(query)}`;
                    const response = await axios.get(apiUrl);
                    if (response.data && response.data.data) {
                        const vUrl = response.data.data.hdplay || response.data.data.play;
                        await socket.sendMessage(sender, { video: { url: vUrl }, caption: `✅ TikTok Downloaded\n\n> *𝗦𝗮𝗱𝗲𝘄-𝗠𝗶𝗻𝗶*` }, { quoted: msg });
                    }
                } catch (e) { reply("❌ Error"); }
                break;
            }

            case 'ai': {
                try {
                    const { NiyoXClient } = require("niyox");
                    const q = args.join(' ');
                    if (!q) return reply("කියන්න පැටියෝ මම SADEW-MINI...");
                    const client = new NiyoXClient({ sessionId: sender, timeout: 15000 });
                    const prompt = `ඔයා ගැහැනු ළමයෙක් වගේ ආදරෙන් කතා කරන්න ඕන. ඔයාගේ නම SADEW-MINI. ඔයාව හැදුවේ Sadew Rashmika. පණිවිඩය: ${q}`;
                    const response = await client.chat(prompt);
                    await reply(response?.result || "Cooldown active!");
                } catch (e) { reply("Cooldowned!"); }
                break;
            }

            case 'owner': {
                const ownerNum = '+94707447414';
                const ownerName = '𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮';
                await socket.sendMessage(sender, {
                    contacts: {
                        displayName: ownerName,
                        contacts: [{ vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${ownerName}\nTEL;type=CELL;type=VOICE;waid=${ownerNum.slice(1)}:${ownerNum}\nEND:VCARD` }]
                    }
                });
                break;
            }

            case 'mode': {
                if (!isOwner) return reply('Owner only.');
                const newMode = args[0]?.toLowerCase();
                if (newMode === 'public' || newMode === 'private') {
                    sessionConfig.MODE = newMode;
                    await updateUserConfig(sanitizedNumber, sessionConfig);
                    reply(`✅ Mode changed to *${newMode}*`);
                }
                break;
            }

            case 'sticker':
            case 's': {
                const qCtx = msg.message?.extendedTextMessage?.contextInfo;
                const quotedMsg = qCtx?.quotedMessage;
                if (!quotedMsg) return reply('Reply to an image!');
                const media = await downloadQuotedMedia(quotedMsg);
                if (media?.buffer) {
                    const { default: WASticker, StickerTypes } = require('wa-sticker-formatter');
                    const sticker = new WASticker(media.buffer, { pack: '𝗦𝗔𝗗𝗘𝗪-𝗠𝗜𝗡𝗜', author: '𝗦𝗮𝗱𝗲𝘄 𝗥𝗮𝘀𝗵𝗺𝗶𝗸𝗮', type: StickerTypes.FULL, quality: 50 });
                    await socket.sendMessage(sender, { sticker: await sticker.toBuffer() }, { quoted: msg });
                }
                break;
            }

            case 'hack': {
                const steps = ['⚙️ Initializing...', '💾 Extracting files...', '🔓 Access Granted!', '🎀 *SADEW-MINI COMPLETED!* 🎭'];
                let init = await reply(steps[0]);
                for(let i=1; i<steps.length; i++) {
                    await delay(1000);
                    await socket.sendMessage(msg.key.remoteJid, { text: steps[i], edit: init.key });
                }
                break;
            }

            }
        } catch (error) { console.error(error); }
    });
}

router.get('/', async (req, res) => {
    const { number } = req.query;
    if (!number) return res.status(400).send({ error: 'Number is required' });
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    if (activeSockets.has(sanitizedNumber)) return res.status(200).send({ status: 'already_connected' });
    await EmpirePair(number, res);
});

router.get('/active', (req, res) => {
    res.status(200).send({ count: activeSockets.size, numbers: Array.from(activeSockets.keys()) });
});

module.exports = router;
