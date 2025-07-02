require('dotenv').config();

const config = {
    // Configuración del servidor
    port: process.env.PORT || 10000,
    ipAddress: process.env.IP_ADDRESS || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'production',
    
    // Límites de rate limiting (optimizados para plan profesional)
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500, // Más requests para plan profesional
    },
    
    // Configuración de sesiones (optimizada para plan profesional)
    sessions: {
        maxSessions: parseInt(process.env.MAX_SESSIONS) || 50, // Más sesiones simultáneas
        timeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 60, // Timeout más largo
        cleanupIntervalMinutes: parseInt(process.env.CLEANUP_INTERVAL_MINUTES) || 15,
    },
    
    // Configuración de Puppeteer (optimizada para recursos profesionales)
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--log-level=3',
            '--no-default-browser-check',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-breakpad',
            '--disable-client-side-phishing-detection',
            '--disable-component-extensions-with-background-pages',
            '--disable-default-apps',
            '--disable-features=TranslateUI',
            '--disable-hang-monitor',
            '--disable-ipc-flooding-protection',
            '--disable-popup-blocking',
            '--disable-prompt-on-repost',
            '--disable-renderer-backgrounding',
            '--disable-sync',
            '--force-color-profile=srgb',
            '--metrics-recording-only',
            '--no-first-run',
            '--password-store=basic',
            '--use-mock-keychain',
            // Optimizaciones para plan profesional (más recursos)
            '--memory-pressure-off',
            '--max_old_space_size=512',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--enable-features=NetworkService',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows'
        ],
    },
    
    // Configuración de logging (completo para plan profesional)
    logging: {
        level: process.env.LOG_LEVEL || 'info', // Logging completo
        format: 'json',
    },
    
    // Configuración de archivos (aumentada para plan profesional)
    uploads: {
        maxFileSize: 10 * 1024 * 1024, // 10MB máximo
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'],
    },
    
    // Configuración de mensajes (optimizada para plan profesional)
    messages: {
        defaultDelay: 5000, // Delay más corto para mejor rendimiento
        maxConcurrentSends: 5, // Más envíos concurrentes
        retryAttempts: 3,
    }
};

module.exports = config; 