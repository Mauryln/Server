// const API_URL = "http://localhost:3000"
const API_URL = "https://iabimcat.onrender.com"

function generateUserId() {
  return "user_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now().toString(36)
}

// Variables globales
let userId = localStorage.getItem("whatsapp_user_id") || generateUserId()
let sessionCheckInterval
let serverCheckInterval
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
const INITIAL_CHECK_INTERVAL = 5000 
const MAX_CHECK_INTERVAL = 30000 
const SERVER_CHECK_INTERVAL = 10000 

// Estado de la sesión
let sessionState = localStorage.getItem("whatsapp_session_state") || "no_session" 
let lastKnownState = localStorage.getItem("whatsapp_session_state") || "no_session"

// Elementos DOM
let sessionStatusIndicator
let sessionStatusText
let startSessionBtn
let scanQrBtn
let closeSessionBtn
let qrModal
let qrContainer
let closeModal
let sessionInfo

// Función principal
document.addEventListener("DOMContentLoaded", () => {
  console.log("Inicializando sessionManager con userId:", userId)

  // Obtener referencias a los elementos
  sessionStatusIndicator = document.querySelector("#session-status-indicator i")
  sessionStatusText = document.getElementById("session-status-text")
  startSessionBtn = document.getElementById("start-session-btn")
  scanQrBtn = document.getElementById("scan-qr-btn")
  closeSessionBtn = document.getElementById("close-session-btn")
  qrModal = document.getElementById("qr-modal")
  qrContainer = document.getElementById("qr-container")
  closeModal = document.querySelector(".close-modal")
  sessionInfo = document.getElementById("session-info")

  // Configurar eventos
  startSessionBtn.addEventListener("click", startSession)
  scanQrBtn.addEventListener("click", openQrModal)
  closeSessionBtn.addEventListener("click", closeSession)
  closeModal.addEventListener("click", () => {
    qrModal.style.display = "none"
  })

  // Cerrar modal cuando se hace clic fuera
  window.addEventListener("click", (e) => {
    if (e.target === qrModal) {
      qrModal.style.display = "none"
    }
  })

  // Inicializar la extensión
  initializeExtension()
})

// Iniciar sesión de WhatsApp
async function startSession() {
  try {
    updateSessionUI("initializing")

    // Asegurarse de que tenemos un userId y está guardado
    if (!userId) {
      userId = generateUserId()
    }

    // Guardar el userId en localStorage para persistencia
    localStorage.setItem("whatsapp_user_id", userId)

    console.log("Iniciando sesión con ID:", userId)

    const response = await fetch(`${API_URL}/start-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })

    const data = await response.json()

    if (data.success) {
      // Iniciar comprobaciones periódicas
      startSessionChecks()
      
      // Si el estado es 'ready', significa que ya hay una sesión activa
      if (data.status === 'ready') {
        showNotification("Sesión Restaurada", "Tu sesión de WhatsApp se ha restaurado automáticamente")
        updateSessionUI("ready")
        return
      }
      
      // Mostrar el modal QR automáticamente solo si necesita escaneo
      if (data.status === 'needs_scan' || data.status === 'initializing') {
        setTimeout(() => {
          openQrModal()
        }, 1000)
      }
    } else {
      // Si el error es porque ya existe una sesión activa, verificar el estado
      if (data.error && data.error.includes("already")) {
        console.log("Ya existe una sesión activa, verificando estado...")
        checkSessionStatus() // Verificar el estado actual
      } else {
        console.error("Error al iniciar sesión:", data.error)
        showNotification("Error", data.error || "No se pudo iniciar la sesión")
        updateSessionUI("no_session")
      }
    }
  } catch (error) {
    console.error("Error de conexión:", error)
    showNotification("Error", "No se pudo conectar con el servidor")
    updateSessionUI("no_session")
  }
}

// Función para calcular el intervalo de verificación dinámico
function calculateCheckInterval() {
  if (sessionState === "ready") {
    return MAX_CHECK_INTERVAL // Verificar menos frecuentemente cuando está conectado
  }
  return INITIAL_CHECK_INTERVAL // Verificar más frecuentemente cuando está desconectado
}

// Comprobar estado de la sesión periódicamente
function startSessionChecks() {
  // Limpiar intervalo existente si hay alguno
  if (sessionCheckInterval) clearInterval(sessionCheckInterval)

  // Comprobar inmediatamente
  checkSessionStatus()

  // Configurar verificación periódica con intervalo dinámico
  sessionCheckInterval = setInterval(checkSessionStatus, calculateCheckInterval())
}

// Verificar estado actual de la sesión
async function checkSessionStatus() {
  try {
    if (!userId) {
      userId = localStorage.getItem("whatsapp_user_id")
      if (!userId) {
        updateSessionUI("no_session")
        return
      }
    }

    console.log("Verificando estado de sesión para userId:", userId)

    const response = await fetch(`${API_URL}/session-status/${userId}`)
    
    // Verificar si la respuesta es HTML en lugar de JSON
    if (response.headers.get('content-type')?.includes('text/html')) {
      console.error("Respuesta no es JSON. Es HTML, probablemente una página de error.")
      throw new Error("Respuesta inesperada del servidor")
    }

    const data = await response.json()

    console.log("Estado de sesión:", data)

    if (data.success) {
      const previousState = sessionState
      updateSessionUI(data.status)
      lastKnownState = data.status
      localStorage.setItem("whatsapp_session_state", data.status)

      // Mostrar notificación cuando se restaura una sesión
      if (previousState === "no_session" && data.status === "ready") {
        showNotification("Sesión Restaurada", "Tu sesión de WhatsApp se ha restaurado automáticamente")
      }

      if (data.status === "ready" && qrContainer) {
        qrContainer.innerHTML = `
          <p style="color: var(--primary); text-align: center;">
            <i class="fas fa-check-circle" style="font-size: 48px;"></i>
            <br>WhatsApp conectado correctamente
          </p>
        `
        if (qrModal && qrModal.style.display === "block") {
          setTimeout(() => {
            qrModal.style.display = "none"
          }, 2000)
        }
        document.dispatchEvent(new CustomEvent("whatsappSessionReady"))
      }
    } else {
      console.log("El servidor no reconoce la sesión, intentando reconectar...")
      // Intentar reconectar automáticamente
      await reconnectSession()
    }
  } catch (error) {
    console.error("Error al verificar estado:", error)
    // Si el servidor no está disponible, mantener el último estado conocido
    if (lastKnownState !== "no_session") {
      updateSessionUI("initializing")
      startServerCheck()
    } else {
      updateSessionUI("no_session")
    }
  }
}

// Función para verificar si el servidor está disponible
function startServerCheck() {
  if (serverCheckInterval) clearInterval(serverCheckInterval)
  
  serverCheckInterval = setInterval(async () => {
    try {
      const response = await fetch(`${API_URL}/session-status/${userId}`)
      if (response.ok) {
        clearInterval(serverCheckInterval)
        // El servidor está disponible, intentar reconectar
        await reconnectSession()
      }
    } catch (error) {
      console.log("Servidor aún no disponible...")
    }
  }, SERVER_CHECK_INTERVAL)
}

// Función para reconectar la sesión automáticamente
async function reconnectSession() {
  try {
    // Si ya hemos intentado demasiadas veces, esperar más tiempo
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
      console.log(`Esperando ${backoffTime/1000} segundos antes de intentar reconectar...`)
      await new Promise(resolve => setTimeout(resolve, backoffTime))
    }

    console.log("Intentando reconectar la sesión...")
    const response = await fetch(`${API_URL}/start-session`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
      body: JSON.stringify({ userId }),
    })

    const data = await response.json()

    if (data.success) {
      console.log("Sesión reconectada exitosamente")
      reconnectAttempts = 0 // Resetear intentos
      
      // Mostrar notificación de reconexión exitosa
      if (data.status === 'ready') {
        showNotification("Reconectado", "Sesión de WhatsApp restaurada exitosamente")
      }
      
      updateSessionUI(data.status)
      localStorage.setItem("whatsapp_session_state", data.status)
    } else {
      console.error("Error al reconectar:", data.error)
      reconnectAttempts++
      updateSessionUI("initializing")
      localStorage.setItem("whatsapp_session_state", "initializing")
    }
  } catch (error) {
    console.error("Error al reconectar:", error)
    reconnectAttempts++
    updateSessionUI("initializing")
    localStorage.setItem("whatsapp_session_state", "initializing")
    startServerCheck()
  }
}

// Abrir modal con código QR
async function openQrModal() {
  // Mostrar el modal con spinner de carga
  qrModal.style.display = "block"
  qrContainer.innerHTML = `
    <div class="qr-loading">
      <div class="spinner"></div>
      <p>Generando código QR...</p>
    </div>
  `

  let attempts = 0
  const MAX_ATTEMPTS = 20
  const QR_CHECK_INTERVAL = 1500

  // Función para verificar y mostrar el QR
  async function checkAndDisplayQR() {
    try {
      const response = await fetch(`${API_URL}/get-qr/${userId}`)
      const data = await response.json()

      // Verificar si ya se generó el QR
      if (data.success && data.qrCode) {
        // Limpiar cualquier contenido previo
        qrContainer.innerHTML = ""

        // Generar el código QR usando la librería qrcode.js
        new QRCode(qrContainer, {
          text: data.qrCode,
          width: 200,
          height: 200,
          colorDark: "#128C7E",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H,
        })

        return true
      }
      // Si el servidor responde con código 202, significa que el QR aún no está generado
      else if (response.status === 202) {
        attempts++
        if (attempts >= MAX_ATTEMPTS) {
          qrContainer.innerHTML = `
            <p class="qr-error">El código QR está tardando demasiado en generarse. Intenta nuevamente.</p>
            <button id="retry-qr" class="btn blue">Reintentar</button>
          `

          document.getElementById("retry-qr").addEventListener("click", () => {
            openQrModal()
          })

          return false
        }
      }
      // Si ya está autenticado o hay otro error
      else if (data.error) {
        // Verificar el estado de la sesión
        const statusResponse = await fetch(`${API_URL}/session-status/${userId}`)
        const statusData = await statusResponse.json()

        if (statusData.success && statusData.status === "ready") {
          qrContainer.innerHTML = `
            <p style="color: var(--primary); text-align: center;">
              <i class="fas fa-check-circle" style="font-size: 48px;"></i>
              <br>WhatsApp conectado correctamente
            </p>
          `
          return true
        } else {
          attempts++
          if (attempts >= MAX_ATTEMPTS) {
            qrContainer.innerHTML = `
              <p class="qr-error">${data.error || "Error al generar el código QR"}</p>
              <button id="retry-qr" class="btn blue">Reintentar</button>
            `

            document.getElementById("retry-qr").addEventListener("click", () => {
              openQrModal()
            })

            return false
          }
        }
      }

      return false
    } catch (error) {
      console.error("Error al obtener el código QR:", error)
      attempts++
      if (attempts >= MAX_ATTEMPTS) {
        qrContainer.innerHTML = `
          <p class="qr-error">Error de conexión. Verifica que el servidor esté funcionando.</p>
          <button id="retry-qr" class="btn blue">Reintentar</button>
        `

        document.getElementById("retry-qr").addEventListener("click", () => {
          openQrModal()
        })

        return false
      }

      return false
    }
  }

  // Verificar inmediatamente
  const success = await checkAndDisplayQR()

  // Si no se obtuvo el QR en el primer intento, configurar un intervalo
  if (!success) {
    const qrInterval = setInterval(async () => {
      const success = await checkAndDisplayQR()

      // Si ya se generó el QR o se alcanzó el máximo de intentos, detener el intervalo
      if (success || attempts >= MAX_ATTEMPTS) {
        clearInterval(qrInterval)
      }
    }, QR_CHECK_INTERVAL)
  }
}

// Cerrar sesión de WhatsApp
async function closeSession() {
  try {
    updateSessionUI("no_session") // Actualizar UI inmediatamente para feedback visual
    localStorage.setItem("whatsapp_session_state", "no_session")

    const response = await fetch(`${API_URL}/close-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })

    const data = await response.json()

    if (data.success) {
      showNotification("Éxito", "Sesión cerrada correctamente")

      // Detener verificaciones periódicas
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval)
        sessionCheckInterval = null
      }
      if (serverCheckInterval) {
        clearInterval(serverCheckInterval)
        serverCheckInterval = null
      }

      // Borrar userId del localStorage para forzar un nuevo ID en la próxima sesión
      localStorage.removeItem("whatsapp_user_id")
      localStorage.removeItem("whatsapp_session_state")
      userId = null
      lastKnownState = "no_session"
    } else {
      console.error("Error al cerrar sesión:", data.error)
      showNotification("Error", data.error || "No se pudo cerrar la sesión")
    }
  } catch (error) {
    console.error("Error de conexión:", error)
    showNotification("Error", "No se pudo conectar con el servidor")
  }
}

// Actualizar interfaz según estado de sesión
function updateSessionUI(status) {
  const previousState = sessionState
  sessionState = status

  switch (status) {
    case "no_session":
      sessionStatusIndicator.className = "fas fa-circle status-indicator"
      sessionStatusText.textContent = "No conectado"
      startSessionBtn.style.display = "block"
      startSessionBtn.innerHTML = '<i class="fas fa-play"></i> Conectar WhatsApp'
      scanQrBtn.style.display = "none"
      closeSessionBtn.style.display = "none"
      hideSessionInfo() // Ocultar información de sesión restaurable
      break

    case "initializing":
      sessionStatusIndicator.className = "fas fa-circle status-indicator pending"
      // No cambiar el texto si ya está mostrando "Restaurando sesión..."
      if (sessionStatusText.textContent !== "Restaurando sesión...") {
        sessionStatusText.textContent = "Inicializando..."
      }
      startSessionBtn.style.display = "none"
      scanQrBtn.style.display = "block"
      scanQrBtn.innerHTML = '<i class="fas fa-qrcode"></i> Mostrar QR'
      closeSessionBtn.style.display = "block"
      break

    case "needs_scan":
      sessionStatusIndicator.className = "fas fa-circle status-indicator pending"
      sessionStatusText.textContent = "Esperando escaneo QR"
      startSessionBtn.style.display = "none"
      scanQrBtn.style.display = "block"
      scanQrBtn.innerHTML = '<i class="fas fa-qrcode"></i> Mostrar QR'
      closeSessionBtn.style.display = "block"
      hideSessionInfo() // Ocultar información de sesión restaurable
      break

    case "ready":
      sessionStatusIndicator.className = "fas fa-circle status-indicator connected"
      sessionStatusText.textContent = "Conectado"
      startSessionBtn.style.display = "none"
      scanQrBtn.style.display = "none"
      closeSessionBtn.style.display = "block"
      hideSessionInfo() // Ocultar información de sesión restaurable
      break
  }

  // Dispatch an event when the status changes
  if (previousState !== status) {
    document.dispatchEvent(
      new CustomEvent("whatsappSessionStatusChanged", {
        detail: { status, previousStatus: previousState },
      }),
    )
  }
}

// Mostrar notificación
function showNotification(title, message) {
  // Implementar sistema de notificaciones
  // Para una implementación simple puedes usar alert
  alert(`${title}: ${message}`)

  // Para una implementación más elegante, puedes crear un sistema de toasts
  // o usar una librería como Toastify
}

// Añadir una función para inicializar la extensión cuando se abre
function initializeExtension() {
  // Verificar si hay una sesión guardada
  const savedUserId = localStorage.getItem("whatsapp_user_id")
  const savedSessionState = localStorage.getItem("whatsapp_session_state")

  if (savedUserId) {
    console.log("Encontrado userId guardado:", savedUserId)
    userId = savedUserId
    lastKnownState = savedSessionState || "no_session"

    // Inicializar con el estado guardado
    updateSessionUI(lastKnownState)

    // Si el estado no es "no_session", mostrar información de sesión restaurable
    if (lastKnownState !== "no_session") {
      showSessionInfo("Se encontró una sesión anterior. Se intentará restaurar automáticamente.")
      
      // Mostrar mensaje de que se está intentando restaurar
      updateSessionUI("initializing")
      sessionStatusText.textContent = "Restaurando sesión..."
      
      checkSessionStatus().then(() => {
        // Solo iniciar verificaciones periódicas si el estado es válido
        if (sessionState !== "no_session") {
          startSessionChecks()
        }
        // Ocultar información de sesión restaurable después de verificar
        hideSessionInfo()
      }).catch(error => {
        console.error("Error al verificar estado inicial:", error)
        updateSessionUI("initializing")
        startServerCheck()
        // Ocultar información de sesión restaurable en caso de error
        hideSessionInfo()
      })
    }
  } else {
    console.log("No se encontró userId guardado")
    updateSessionUI("no_session")
  }
}

// Función para mostrar información de sesión restaurable
function showSessionInfo(message) {
  if (sessionInfo) {
    const infoContent = sessionInfo.querySelector(".info-content p")
    if (infoContent) {
      infoContent.textContent = message
    }
    sessionInfo.style.display = "block"
  }
}

// Función para ocultar información de sesión restaurable
function hideSessionInfo() {
  if (sessionInfo) {
    sessionInfo.style.display = "none"
  }
}

// Función para verificar si hay una sesión restaurable
function hasRestorableSession() {
  const savedUserId = localStorage.getItem("whatsapp_user_id")
  const savedSessionState = localStorage.getItem("whatsapp_session_state")
  
  return savedUserId && savedSessionState && savedSessionState !== "no_session"
}

// Exportar funciones y variables para uso externo
window.whatsappSession = {
  getUserId: () => userId,
  checkStatus: checkSessionStatus,
  startSession,
  closeSession,
  showQrCode: openQrModal,
  getSessionState: () => sessionState,
  hasRestorableSession,
}

