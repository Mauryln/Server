const express = require('express');
const { MessageMedia } = require('whatsapp-web.js');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

// Importar módulos locales
// Cargar configuración unificada
const config = require('./config');
console.log(`Usando configuración para el entorno: ${config.nodeEnv}`);
const logger = require('./utils/logger');
const sessionManager = require('./utils/sessionManager');

const app = express();
const port = config.port;
const ipAddress = config.ipAddress;

// --- Middleware de Seguridad y Optimización ---
app.use(helmet({
    contentSecurityPolicy: false, // Deshabilitar para WhatsApp Web
    crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({
    origin: true,
    credentials: true
}));

// Rate limiting
// const limiter = rateLimit({
//     windowMs: config.rateLimit.windowMs,
//     max: config.rateLimit.maxRequests,
//     message: {
//         success: false,
//         error: 'Too many requests, please try again later.'
//     },
//     standardHeaders: true,
//     legacyHeaders: false,
// });
// app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuración de multer optimizada
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (config.uploads.allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: config.uploads.maxFileSize
    }
});

// --- Middleware de Logging ---
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('HTTP Request', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
    });
    next();
});

// --- Health Check ---
app.get('/health', (req, res) => {
    const stats = sessionManager.getStats();
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        stats: stats
    });
});

// --- Endpoints de Gestión de Sesión ---

app.post('/start-session', express.json(), async (req, res) => {
    const userId = req.body.userId;
    if (!userId) {
        return res.status(400).json({ success: false, error: 'Missing userId' });
    }

    logger.info('Starting session request', { userId });

    try {
        const result = await sessionManager.createSession(userId);
        res.json(result);
    } catch (error) {
        logger.error('Error starting session', { userId, error: error.message });
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error', 
            status: 'init_error' 
        });
    }
});

app.get('/session-status/:userId', async (req, res) => {
    const userId = req.params.userId;
    if (!userId) {
        return res.status(400).json({ success: false, error: 'Missing userId' });
    }

    try {
        const client = sessionManager.getSession(userId);
        const status = sessionManager.getSessionStatus(userId);

        if (client && typeof client.getState === 'function') {
            try {
                const state = await client.getState();
                sessionManager.updateActivity(userId);

                if (state === 'CONNECTED') {
                    return res.json({ success: true, status: 'ready' });
                } else if (state === 'PAIRING') {
                    return res.json({ success: true, status: 'needs_scan' });
                } else if (state === null || state === 'OPENING' || state === 'TIMEOUT') {
                    return res.json({ success: true, status: status });
                } else {
                    return res.json({ success: true, status: 'disconnected' });
                }
            } catch (err) {
                logger.error('Error getting client state', { userId, error: err.message });
                return res.json({ success: true, status: status });
            }
        } else {
            return res.json({ success: true, status: status });
        }
    } catch (error) {
        logger.error('Error checking session status', { userId, error: error.message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.get('/get-qr/:userId', (req, res) => {
    const userId = req.params.userId;
    if (!userId) {
        return res.status(400).json({ success: false, error: 'Missing userId' });
    }

    const qr = sessionManager.getQRCode(userId);
    const status = sessionManager.getSessionStatus(userId);

    if (status === 'ready') {
        return res.json({ success: true, qrCode: null, status: 'ready', message: 'Client already ready' });
    } else if (qr && status === 'needs_scan') {
        return res.json({ success: true, qrCode: qr, status: 'needs_scan' });
    } else if (status === 'initializing' || status === 'authenticated') {
        return res.status(202).json({ 
            success: false, 
            status: status, 
            error: 'QR code not generated yet or session is authenticating/ready.' 
        });
    } else {
        return res.status(404).json({ 
            success: false, 
            status: status || 'no_session', 
            error: 'No session found, QR not generated, session error, or disconnected.' 
        });
    }
});

app.post('/close-session', express.json(), async (req, res) => {
    const userId = req.body.userId;
    if (!userId) {
        return res.status(400).json({ success: false, error: 'Missing userId' });
    }

    logger.info('Closing session request', { userId });

    try {
        await sessionManager.destroySession(userId);
        res.json({ success: true, message: 'Session closed successfully.', status: 'no_session' });
    } catch (error) {
        logger.error('Error closing session', { userId, error: error.message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// --- Endpoints de WhatsApp ---

app.get('/labels/:userId', async (req, res) => {
    const userId = req.params.userId;
    const client = sessionManager.getSession(userId);

    if (!client || sessionManager.getSessionStatus(userId) !== 'ready') {
        return res.status(400).json({ success: false, error: 'WhatsApp session not ready.' });
    }

    try {
        sessionManager.updateActivity(userId);
        
        if (typeof client.getLabels !== 'function') {
            logger.info('Labels not supported for this account (getLabels missing)', { userId });
            return res.status(200).json({ 
                success: true, 
                labels: [],
                message: 'No labels found or not supported for this account.'
            });
        }
        
        const labels = await client.getLabels();
        
        if (!labels || labels.length === 0) {
            logger.info('No labels found for account', { userId });
            return res.status(200).json({ 
                success: true, 
                labels: [],
                message: 'No labels found for this account.'
            });
        }
        // Solo devolver id y name
        const labelList = labels.map(label => ({ id: label.id, name: label.name || `Etiqueta ${label.id}` }));
        logger.info('Labels fetched successfully', { userId, count: labelList.length });
        res.json({ success: true, labels: labelList });
    } catch (error) {
        logger.error('Error fetching labels', { userId, error: error.message });
        return res.status(200).json({
            success: true,
            labels: [],
            message: 'No labels found or error fetching labels.'
        });
    }
});

app.get('/labels/:userId/:labelId/chats', async (req, res) => {
    const { userId, labelId } = req.params;
    const client = sessionManager.getSession(userId);

    if (!client || sessionManager.getSessionStatus(userId) !== 'ready') {
        return res.status(400).json({ success: false, error: 'WhatsApp session not ready.' });
    }

    try {
        sessionManager.updateActivity(userId);
        
        if (typeof client.getChatsByLabelId !== 'function') {
            logger.info('Chats by label not supported for this account', { userId });
            return res.status(501).json({ 
                success: false, 
                error: 'Fetching chats by label is likely not supported for this account.',
                message: 'This feature requires a WhatsApp Business account.'
            });
        }
        
        const chats = await client.getChatsByLabelId(labelId);
        const numbers = chats.map(chat => chat.id.user);

        logger.info('Chats fetched for label', { userId, labelId, count: numbers.length });
        res.json({ success: true, numbers: numbers });
    } catch (error) {
        logger.error('Error fetching chats for label', { userId, labelId, error: error.message });
        if (error.message.includes("Evaluation failed") || error.message.includes("getChatsByLabelId is not a function")) {
            res.status(501).json({ 
                success: false, 
                error: 'Fetching chats by label might require WhatsApp Business or is not supported by this version.',
                message: 'This feature requires a WhatsApp Business account.'
            });
        } else {
            res.status(500).json({ success: false, error: 'Failed to fetch chats for the label: ' + error.message });
        }
    }
});

app.get('/groups/:userId', async (req, res) => {
    const userId = req.params.userId;
    const client = sessionManager.getSession(userId);

    if (!client || sessionManager.getSessionStatus(userId) !== 'ready') {
        return res.status(400).json({ success: false, error: 'WhatsApp session not ready.' });
    }

    try {
        sessionManager.updateActivity(userId);
        
        const chats = await client.getChats();
        const groups = chats
            .filter(chat => chat.isGroup)
            .map(chat => ({
                id: chat.id._serialized,
                name: chat.name || 'Grupo sin nombre',
            }));
        
        logger.info('Groups fetched', { userId, count: groups.length });
        res.json({ success: true, groups: groups });
    } catch (error) {
        logger.error('Error fetching groups', { userId, error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch groups: ' + error.message });
    }
});

app.get('/groups/:userId/:groupId/participants', async (req, res) => {
    const { userId, groupId } = req.params;
    const client = sessionManager.getSession(userId);

    if (!client || sessionManager.getSessionStatus(userId) !== 'ready') {
        return res.status(400).json({ success: false, error: 'WhatsApp session not ready.' });
    }

    try {
        sessionManager.updateActivity(userId);
        
        const groupChat = await client.getChatById(groupId);

        if (!groupChat || !groupChat.isGroup) {
            return res.status(404).json({ success: false, error: 'Group not found.' });
        }
        
        let participants = [];
        if (groupChat.participants && Array.isArray(groupChat.participants)) {
            participants = groupChat.participants;
        } else if (typeof groupChat.fetchParticipants === 'function') {
            try {
                participants = await groupChat.fetchParticipants();
            } catch(fetchErr) {
                logger.error('Error fetching participants explicitly', { groupId, error: fetchErr.message });
            }
        }

        const numbers = participants.map(p => p.id.user);

        logger.info('Participants fetched for group', { userId, groupId, count: numbers.length });
        res.json({ success: true, numbers: numbers });
    } catch (error) {
        logger.error('Error fetching participants for group', { userId, groupId, error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch participants: ' + error.message });
    }
});

// --- Endpoint de Envío de Mensajes Optimizado ---

app.post('/send-messages', upload.single('media'), async (req, res) => {
    const { userId, message, delay, numbers: numbersJson, mensajesPorNumero: mensajesJson } = req.body;
    const mediaFile = req.file;

    logger.info('Starting message send process', { userId });

    if (!userId) {
        if (mediaFile) fs.unlinkSync(mediaFile.path);
        return res.status(400).json({ success: false, error: 'Missing userId' });
    }

    const client = sessionManager.getSession(userId);
    if (!client || sessionManager.getSessionStatus(userId) !== 'ready') {
        if (mediaFile) fs.unlinkSync(mediaFile.path);
        return res.status(400).json({ 
            success: false, 
            error: 'WhatsApp session not ready.', 
            status: sessionManager.getSessionStatus(userId) 
        });
    }

    // Verificar si la sesión está bloqueada
    if (!(await sessionManager.acquireLock(userId))) {
        if (mediaFile) fs.unlinkSync(mediaFile.path);
        return res.status(429).json({ 
            success: false, 
            error: 'Session is busy, please try again later.' 
        });
    }

    let numbersRaw;
    let mensajesPorNumero;
    try {
        numbersRaw = JSON.parse(numbersJson || '[]');
        mensajesPorNumero = JSON.parse(mensajesJson || '[]');
        if (!Array.isArray(numbersRaw)) throw new Error("Invalid 'numbers' array.");
        if (!Array.isArray(mensajesPorNumero)) mensajesPorNumero = numbersRaw.map(() => message || "");
        if (mensajesPorNumero.length !== numbersRaw.length) {
            mensajesPorNumero = numbersRaw.map((_, index) => mensajesPorNumero[index] || message || "");
        }
    } catch (e) {
        if (mediaFile) fs.unlinkSync(mediaFile.path);
        sessionManager.releaseLock(userId);
        return res.status(400).json({ success: false, error: 'Invalid JSON in numbers or mensajesPorNumero field.' });
    }

    if (!message && !mediaFile) {
        if (mediaFile) fs.unlinkSync(mediaFile.path);
        sessionManager.releaseLock(userId);
        return res.status(400).json({ success: false, error: 'Message or media file is required.' });
    }
    
    if (numbersRaw.length === 0) {
        if (mediaFile) fs.unlinkSync(mediaFile.path);
        sessionManager.releaseLock(userId);
        return res.status(400).json({ success: false, error: 'No numbers selected to send to.' });
    }

    const sendDelay = parseInt(delay, 10) || config.messages.defaultDelay;
    let media = null;

    if (mediaFile) {
        try {
            const fileContent = fs.readFileSync(mediaFile.path);
            media = new MessageMedia(
                mediaFile.mimetype,
                fileContent.toString('base64'),
                mediaFile.originalname
            );
            logger.info('Media file processed', { userId, filename: mediaFile.originalname });
        } catch (mediaError) {
            logger.error('Error processing media file', { userId, error: mediaError.message });
            fs.unlink(mediaFile.path, (err) => {
                if (err) logger.error('Error deleting failed media file', { error: err.message });
            });
            media = null;
        }
    }

    let enviados = 0;
    let fallidos = 0;
    const total = numbersRaw.length;
    const failedNumbers = [];

    logger.info('Starting to send messages', { userId, total, delay: sendDelay });

    // Responder inmediatamente
    res.json({
        success: true,
        message: `Message sending process initiated for ${total} numbers.`,
        summary: { enviados: 0, fallidos: 0, total },
    });

    // Procesar envío en background
    (async () => {
        try {
            sessionManager.updateActivity(userId);

            for (let i = 0; i < numbersRaw.length; i++) {
                const originalNumber = numbersRaw[i];
                const currentMessage = mensajesPorNumero[i] || message || "";
                let numberOnly = originalNumber.replace(/\D/g, '');

                if (!originalNumber.includes('+') && numberOnly.length === 8 && !numberOnly.startsWith('591')) {
                    numberOnly = '591' + numberOnly;
                } else if (originalNumber.includes('+')) {
                    numberOnly = originalNumber.replace(/\D/g, '');
                }

                try {
                    const recipientWID = await client.getNumberId(numberOnly);

                    if (recipientWID) {
                        const chatId = recipientWID._serialized;
                        
                        if (media) {
                            await client.sendMessage(chatId, media, { caption: currentMessage || undefined });
                            logger.info('Media sent successfully', { userId, number: numberOnly });
                        } else if (currentMessage) {
                            await client.sendMessage(chatId, currentMessage);
                            logger.info('Message sent successfully', { userId, number: numberOnly });
                        }
                        
                        enviados++;
                    } else {
                        logger.warn('Number not registered', { userId, number: numberOnly });
                        failedNumbers.push({ number: originalNumber, reason: "Not a valid WhatsApp number" });
                        fallidos++;
                    }
                } catch (err) {
                    logger.error('Error sending message', { userId, number: numberOnly, error: err.message });
                    failedNumbers.push({ number: originalNumber, reason: err.message || 'Send failed' });
                    fallidos++;
                }

                // Delay entre mensajes
                if (i < numbersRaw.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, sendDelay));
                }
            }

            logger.info('Message sending process completed', { 
                userId, 
                enviados, 
                fallidos, 
                total,
                failedNumbers: failedNumbers.length > 0 ? failedNumbers : undefined
            });

        } catch (error) {
            logger.error('Error in message sending process', { userId, error: error.message });
        } finally {
            // Limpiar archivo de media
            if (mediaFile) {
                fs.unlink(mediaFile.path, (err) => {
                    if (err) logger.error('Error deleting uploaded file', { error: err.message });
                });
            }
            
            // Liberar lock
            sessionManager.releaseLock(userId);
        }
    })();
});

app.get('/reports/:userId/:labelId/messages', async (req, res) => {
    const { userId, labelId } = req.params;
    const client = sessionManager.getSession(userId);

    if (!client || sessionManager.getSessionStatus(userId) !== 'ready') {
        return res.status(400).json({ success: false, error: 'WhatsApp session not ready.' });
    }

    try {
        sessionManager.updateActivity(userId);
        
        let reportMessages = [];
        if (typeof client.getChatsByLabelId === 'function') {
            const chats = await client.getChatsByLabelId(labelId);
            for (const chat of chats) {
                try {
                    const messages = await chat.fetchMessages({ limit: 10 });
                    messages.forEach(msg => {
                        if (msg.fromMe) {
                            reportMessages.push({
                                number: chat.id.user,
                                body: msg.body || (msg.hasMedia ? '[Media]' : ''),
                                timestamp: msg.timestamp,
                                ack: msg.ack,
                                response: null
                            });
                        }
                    });
                } catch (chatErr) {
                    logger.error('Error fetching messages for chat', { 
                        chatId: chat.id._serialized, 
                        error: chatErr.message 
                    });
                }
            }
        } else {
            logger.warn('getChatsByLabelId not available for reports', { userId });
        }

        logger.info('Report data generated', { userId, labelId, messageCount: reportMessages.length });
        res.json({ success: true, messages: reportMessages });

    } catch (error) {
        logger.error('Error generating report', { userId, labelId, error: error.message });
        res.status(500).json({ success: false, error: 'Failed to generate report: ' + error.message });
    }
});

// --- Error Handling ---
app.use((error, req, res, next) => {
    logger.error('Unhandled error', { 
        error: error.message, 
        stack: error.stack,
        url: req.url,
        method: req.method 
    });
    
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
    });
});

// --- Inicialización del Servidor ---
app.listen(port, ipAddress, () => {
    logger.info('WhatsApp Automator Server started', {
        port,
        ipAddress,
        nodeEnv: config.nodeEnv,
        maxSessions: config.sessions.maxSessions
    });
});

// --- Graceful Shutdown ---
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    
    // Cerrar todas las sesiones
    const sessions = Array.from(sessionManager.sessions.keys());
    for (const userId of sessions) {
        try {
            await sessionManager.destroySession(userId);
        } catch (error) {
            logger.error('Error destroying session during shutdown', { userId, error: error.message });
        }
    }
    
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});