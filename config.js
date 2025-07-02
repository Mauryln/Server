require('dotenv').config();

const config = {
    // Configuración del servidor
    port: process.env.PORT || 3000,
    ipAddress: process.env.NODE_ENV === 'production' ? '0.0.0.0' : (process.env.IP_ADDRESS || '127.0.0.1'),
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // Límites de rate limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    },
    
    // Configuración de sesiones
    sessions: {
        maxSessions: parseInt(process.env.MAX_SESSIONS) || 50,
        cleanupIntervalMinutes: parseInt(process.env.CLEANUP_INTERVAL_MINUTES) || 1440, // 1 día
    },
    
    // Configuración de Puppeteer
    puppeteer: {
        headless: true,
        args: (process.env.PUPPETEER_ARGS || '--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-accelerated-2d-canvas,--no-first-run,--no-zygote,--disable-gpu,--log-level=3,--no-default-browser-check,--disable-extensions,--disable-background-networking,--enable-features=NetworkService,NetworkServiceInProcess,--disable-background-timer-throttling,--disable-backgrounding-occluded-windows,--disable-breakpad,--disable-client-side-phishing-detection,--disable-component-extensions-with-background-pages,--disable-default-apps,--disable-features=TranslateUI,--disable-hang-monitor,--disable-ipc-flooding-protection,--disable-popup-blocking,--disable-prompt-on-repost,--disable-renderer-backgrounding,--disable-sync,--force-color-profile=srgb,--metrics-recording-only,--no-first-run,--password-store=basic,--use-mock-keychain').split(','),
    },
    
    // Configuración de logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.NODE_ENV === 'production' ? 'json' : 'simple',
    },
    
    // Configuración de archivos
    uploads: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mp3', 'application/pdf'],
    },
    
    // Configuración de mensajes
    messages: {
        defaultDelay: 8000,
        maxConcurrentSends: 1000,
        retryAttempts: 3,
    }
};

module.exports = config; 