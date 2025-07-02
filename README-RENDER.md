# Despliegue en Render - Plan Profesional

## Configuración Optimizada para Plan Profesional

Este proyecto está configurado para funcionar óptimamente en Render con el plan profesional.

### Características del Plan Profesional:

- **Recursos**: Más CPU, RAM y almacenamiento
- **Sesiones simultáneas**: Hasta 50 sesiones de WhatsApp
- **Rate limiting**: 500 requests por 15 minutos
- **Almacenamiento**: 20GB de disco persistente
- **Logging**: Completo (nivel info)
- **Archivos**: Hasta 10MB por archivo

### Variables de Entorno Configuradas:

```env
NODE_ENV=production
RENDER_PLAN=professional
PORT=10000
MAX_SESSIONS=50
SESSION_TIMEOUT_MINUTES=60
CLEANUP_INTERVAL_MINUTES=15
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=500
LOG_LEVEL=info
```

### Pasos para Desplegar:

1. **Conectar repositorio** en Render
2. **Seleccionar plan profesional** en la configuración
3. **Usar el archivo `render.yaml`** para configuración automática
4. **Verificar health check** en `/health`

### Endpoints Disponibles:

- `GET /health` - Estado del servidor
- `POST /start-session` - Iniciar sesión WhatsApp
- `GET /session-status/:userId` - Estado de sesión
- `GET /get-qr/:userId` - Obtener código QR
- `POST /send-message` - Enviar mensaje
- `POST /send-bulk-messages` - Envío masivo

### Monitoreo:

- Los logs están disponibles en el dashboard de Render
- El health check se ejecuta automáticamente
- Las sesiones inactivas se limpian cada 15 minutos

### Optimizaciones Incluidas:

- Puppeteer optimizado para recursos profesionales
- Rate limiting configurado para alta demanda
- Sistema de logging completo
- Limpieza automática de sesiones
- Compresión y seguridad habilitadas 