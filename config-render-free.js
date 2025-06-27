require('dotenv').config();

const config = {
    // Configuración del servidor
    port: process.env.PORT || 10000,
    ipAddress: process.env.IP_ADDRESS || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'production',
    
    // Límites de rate limiting (más conservadores)
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 50, // Reducido para plan gratuito
    },
    
    // Configuración de sesiones (optimizada para plan gratuito)
    sessions: {
        maxSessions: parseInt(process.env.MAX_SESSIONS) || 3, // Máximo 3 sesiones
        timeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 20, // Timeout más corto
        cleanupIntervalMinutes: parseInt(process.env.CLEANUP_INTERVAL_MINUTES) || 5,
    },
    
    // Configuración de Puppeteer (optimizada para memoria limitada)
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
            // Optimizaciones adicionales para memoria limitada
            '--memory-pressure-off',
            '--max_old_space_size=128',
            '--single-process',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ],
    },
    
    // Configuración de logging (mínimo para ahorrar recursos)
    logging: {
        level: process.env.LOG_LEVEL || 'warn', // Solo warnings y errores
        format: 'json',
    },
    
    // Configuración de archivos (reducida)
    uploads: {
        maxFileSize: 5 * 1024 * 1024, // 5MB máximo
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
    },
    
    // Configuración de mensajes (más conservadora)
    messages: {
        defaultDelay: 10000, // Delay más largo para evitar spam
        maxConcurrentSends: 2, // Menos envíos concurrentes
        retryAttempts: 2,
    }
};

module.exports = config; 