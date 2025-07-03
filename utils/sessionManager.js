const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');
const config = require('../config');

class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.qrCodes = new Map();
        this.sessionStatus = new Map();
        this.lastActivity = new Map();
        this.sessionLocks = new Map();
        
        // Inicializar directorios
        this.initializeDirectories();
        
        // Iniciar limpieza automática
        this.startCleanupScheduler();
        
        // logger.info('SessionManager initialized', {
        //     maxSessions: config.sessions.maxSessions,
        //     timeoutMinutes: config.sessions.timeoutMinutes
        // });
    }

    initializeDirectories() {
        const dirs = [
            path.join(__dirname, '..', 'uploads'),
            path.join(__dirname, '..', '.wwebjs_auth'),
            path.join(__dirname, '..', 'logs')
        ];

        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    async createSession(userId) {
        // Verificar límite de sesiones
        if (this.sessions.size >= config.sessions.maxSessions) {
            const oldestSession = this.getOldestSession();
            if (oldestSession) {
                // logger.warn('Session limit reached, removing oldest session', { 
                //     removedUserId: oldestSession,
                //     currentSessions: this.sessions.size 
                // });
                await this.destroySession(oldestSession);
            }
        }

        // Verificar si ya existe una sesión activa
        if (this.sessions.has(userId)) {
            const status = this.sessionStatus.get(userId);
            if (['ready', 'initializing', 'needs_scan', 'authenticated'].includes(status)) {
                // logger.info('Session already exists', { userId, status });
                return { success: true, message: `Session already ${status}`, status };
            }
            // Limpiar sesión anterior
            await this.destroySession(userId);
        }

        // Crear nueva sesión
        try {
            // logger.info('Creating new session', { userId });
            
            this.sessionStatus.set(userId, 'initializing');
            this.qrCodes.set(userId, null);
            this.lastActivity.set(userId, Date.now());

            const client = new Client({
                authStrategy: new LocalAuth({ 
                    clientId: userId, 
                    dataPath: path.join(__dirname, '..', '.wwebjs_auth') 
                }),
                puppeteer: {
                    headless: config.puppeteer.headless,
                    args: config.puppeteer.args,
                },
                webVersionCache: {
                    type: 'local',
                    path: path.join(__dirname, '..', `.wwebjs_cache_${userId}`),
                }
            });

            this.setupEventHandlers(client, userId);
            this.sessions.set(userId, client);

            await client.initialize();
            
            return { 
                success: true, 
                message: 'Session initialization finished.', 
                status: this.sessionStatus.get(userId) 
            };

        } catch (error) {
            logger.error('Error creating session', { userId, error: error.message });
            await this.destroySession(userId);
            return { 
                success: false, 
                error: `Failed to initialize session: ${error.message}`, 
                status: 'init_error' 
            };
        }
    }

    setupEventHandlers(client, userId) {
        client.on('qr', (qr) => {
            // logger.info('QR Code generated', { userId });
            this.qrCodes.set(userId, qr);
            this.sessionStatus.set(userId, 'needs_scan');
            this.updateActivity(userId);
        });

        client.on('ready', () => {
            // logger.info('WhatsApp client ready', { userId });
            this.sessionStatus.set(userId, 'ready');
            this.qrCodes.set(userId, null);
            this.updateActivity(userId);
        });

        client.on('authenticated', () => {
            // logger.info('Client authenticated', { userId });
            this.sessionStatus.set(userId, 'authenticated');
            this.qrCodes.set(userId, null);
            this.updateActivity(userId);
        });

        client.on('auth_failure', (msg) => {
            logger.error('Authentication failed', { userId, message: msg });
            this.sessionStatus.set(userId, 'auth_failure');
            this.destroySession(userId);
        });

        client.on('disconnected', (reason) => {
            // logger.warn('Client disconnected', { userId, reason });
            this.sessionStatus.set(userId, 'disconnected');
            this.destroySession(userId);
        });
    }

    async destroySession(userId) {
        const client = this.sessions.get(userId);
        if (client) {
            try {
                const status = this.sessionStatus.get(userId);
                if (['ready', 'authenticated'].includes(status)) {
                    await client.logout();
                    // logger.info('Client logout successful', { userId });
                }
            } catch (error) {
                logger.warn('Error during logout', { userId, error: error.message });
            }

            try {
                await client.destroy();
                // logger.info('Client instance destroyed', { userId });
            } catch (error) {
                logger.error('Error destroying client', { userId, error: error.message });
            }
        }

        // Limpiar datos de sesión
        this.sessions.delete(userId);
        this.qrCodes.delete(userId);
        this.sessionStatus.delete(userId);
        this.lastActivity.delete(userId);
        this.sessionLocks.delete(userId);

        // Limpiar directorios de sesión y caché
        const sessionAuthPath = path.join(__dirname, '..', '.wwebjs_auth', `session-${userId}`);
        const sessionCachePath = path.join(__dirname, '..', `.wwebjs_cache_${userId}`);

        const removeDir = (dirPath, dirName) => {
            if (fs.existsSync(dirPath)) {
                fs.rm(dirPath, { recursive: true, force: true }, (err) => {
                    if (err) {
                        logger.error(`Error removing ${dirName} folder`, { userId, error: err.message });
                    } else {
                        // logger.info(`${dirName} folder removed`, { userId });
                    }
                });
            }
        };

        removeDir(sessionAuthPath, 'Session auth');
        removeDir(sessionCachePath, 'Session cache');
    }

    getSession(userId) {
        return this.sessions.get(userId);
    }

    getSessionStatus(userId) {
        return this.sessionStatus.get(userId) || 'no_session';
    }

    getQRCode(userId) {
        return this.qrCodes.get(userId);
    }

    updateActivity(userId) {
        this.lastActivity.set(userId, Date.now());
    }

    getOldestSession() {
        let oldestUserId = null;
        let oldestTime = Date.now();

        for (const [userId, lastActivity] of this.lastActivity) {
            if (lastActivity < oldestTime) {
                oldestTime = lastActivity;
                oldestUserId = userId;
            }
        }

        return oldestUserId;
    }

    async cleanupInactiveSessions() {
        const now = Date.now();
        const timeoutMs = config.sessions.timeoutMinutes * 60 * 1000;
        const sessionsToRemove = [];

        for (const [userId, lastActivity] of this.lastActivity) {
            if (now - lastActivity > timeoutMs) {
                sessionsToRemove.push(userId);
            }
        }

        for (const userId of sessionsToRemove) {
            // logger.info('Removing inactive session', { userId });
            await this.destroySession(userId);
        }

        if (sessionsToRemove.length > 0) {
            // logger.info('Cleanup completed', { 
            //     removedSessions: sessionsToRemove.length,
            //     remainingSessions: this.sessions.size 
            // });
        }
    }

    startCleanupScheduler() {
        const cleanupIntervalMs = config.sessions.cleanupIntervalMinutes * 60 * 1000;
        
        setInterval(async () => {
            try {
                await this.cleanupInactiveSessions();
            } catch (error) {
                logger.error('Error during cleanup', { error: error.message });
            }
        }, cleanupIntervalMs);

        // logger.info('Cleanup scheduler started', { 
        //     intervalMinutes: config.sessions.cleanupIntervalMinutes 
        // });
    }

    getStats() {
        const stats = {
            totalSessions: this.sessions.size,
            maxSessions: config.sessions.maxSessions,
            sessionsByStatus: {},
            memoryUsage: process.memoryUsage()
        };

        // Contar sesiones por estado
        for (const status of this.sessionStatus.values()) {
            stats.sessionsByStatus[status] = (stats.sessionsByStatus[status] || 0) + 1;
        }

        return stats;
    }

    async acquireLock(userId) {
        if (this.sessionLocks.has(userId)) {
            return false;
        }
        
        this.sessionLocks.set(userId, Date.now());
        return true;
    }

    releaseLock(userId) {
        this.sessionLocks.delete(userId);
    }
}

module.exports = new SessionManager(); 