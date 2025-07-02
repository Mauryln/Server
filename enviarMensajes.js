document.getElementById("enviar-btn").addEventListener("click", async () => {
  try {
    // Obtener el contenido HTML del editor Trix
    const trixEditor = document.querySelector('trix-editor');
    const htmlContent = trixEditor.innerHTML;
    const message = convertirFormatoWhatsApp(htmlContent);
    const delay = Number.parseInt(document.getElementById("delaySelect").value)
    const checkboxes = document.querySelectorAll('#numberList input[type="checkbox"]:checked')
    const mediaFileInput = document.getElementById("mediaFile")
    const mediaFile = mediaFileInput.files[0]
    
    // Obtener el userId actual desde el objeto global whatsappSession
    const userId = window.whatsappSession ? window.whatsappSession.getUserId() : 
                  localStorage.getItem('whatsapp_user_id')
    
    if (!userId) {
      throw new Error("⚠️ Error de sesión. Refresca la página e intenta nuevamente.")
    }

    // Show loading animation and progress bar regardless of message content
    const enviarBtn = document.getElementById("enviar-btn")
    enviarBtn.classList.add("loading")
    document.getElementById("send-status").classList.add("active")

    if (!message && !mediaFile) {
      enviarBtn.classList.remove("loading")
      document.getElementById("send-status").classList.remove("active")
      throw new Error("✍️ Escribe un mensaje o adjunta un archivo")
    }

    if (checkboxes.length === 0) {
      enviarBtn.classList.remove("loading")
      document.getElementById("send-status").classList.remove("active")
      throw new Error("🔢 Selecciona al menos un número")
    }

    // Verificar que la sesión esté activa
    const sessionState = window.whatsappSession ? window.whatsappSession.getSessionState() : sessionState
    
    if (sessionState !== 'ready') {
      enviarBtn.classList.remove("loading")
      document.getElementById("send-status").classList.remove("active")
      throw new Error("🔌 No hay una sesión de WhatsApp activa. Inicia sesión primero.")
    }

    const numbers = Array.from(checkboxes).map((cb) => cb.value.replace(/[^\d+]/g, ""))

    const formData = new FormData()
    formData.append("userId", userId)  // Añadir el userId a la petición
    formData.append("message", message)
    formData.append("delay", delay)
    
    // Solo generar mensajes variantes si el mensaje contiene el patrón {opción1|opción2}
    const mensajesPorNumero = message.includes('{') && message.includes('}') 
        ? numbers.map(() => generarMensajeConVariantes(message))
        : numbers.map(() => message);
    
    formData.append("mensajesPorNumero", JSON.stringify(mensajesPorNumero));
    formData.append("numbers", JSON.stringify(numbers))
    

    if (mediaFile) {
      formData.append("media", mediaFile)
    }

    // Iniciar la barra de progreso
    document.getElementById("send-progress").style.width = "0%"
    document.getElementById("sent-count").textContent = "0"
    document.getElementById("total-send-count").textContent = numbers.length

    const res = await fetch(`${API_URL}/send-messages`, {
      method: "POST",
      body: formData,
    })

    const data = await res.json()

    // Remove loading state when done
    enviarBtn.classList.remove("loading")

    if (!data.success) {
      document.getElementById("send-status").classList.remove("active")
      throw new Error(`❌ Error al enviar mensajes: ${data.error || "Error desconocido"}`)
    }

    const { enviados, fallidos, total } = data.summary

    // Update progress bar to 100%
    document.getElementById("send-progress").style.width = "100%"
    document.getElementById("sent-count").textContent = enviados
    document.getElementById("total-send-count").textContent = total

    // Show success message
    setTimeout(() => {
      // Usar la función de notificación de sessionManager.js si está disponible
      if (typeof showNotification === 'function') {
        showNotification("Resultado", `✅ Enviados: ${enviados}/${total} | ❌ Fallidos: ${fallidos}`)
      } else if (window.whatsappSession && typeof window.whatsappSession.showNotification === 'function') {
        window.whatsappSession.showNotification("Resultado", `✅ Enviados: ${enviados}/${total} | ❌ Fallidos: ${fallidos}`)
      } else {
        alert(`✅ Enviados: ${enviados}/${total} | ❌ Fallidos: ${fallidos}`)
      }
    }, 500)
  } catch (error) {
    // Usar la función de notificación de sessionManager.js si está disponible
    if (typeof showNotification === 'function') {
      showNotification("Error", error.message)
    } else if (window.whatsappSession && typeof window.whatsappSession.showNotification === 'function') {
      window.whatsappSession.showNotification("Error", error.message)
    } else {
      alert(error.message)
    }
    console.error("Error principal:", error)
  }
})

function generarMensajeConVariantes(mensaje) {
  return mensaje.replace(/\{([^}]+)\}/g, (_, opciones) => {
    const variantes = opciones.split('|').map(opt => opt.trim());
    return variantes[Math.floor(Math.random() * variantes.length)];
  });
}

function convertirFormatoWhatsApp(html) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  function procesarNodo(nodo, contexto = {}) {
    let resultado = '';

    if (nodo.nodeType === Node.TEXT_NODE) {
      return nodo.textContent;
    }

    if (nodo.nodeType === Node.ELEMENT_NODE) {
      const tagName = nodo.tagName.toLowerCase();
      let contenido = '';

      // Crear un nuevo contexto para los nodos hijos
      const nuevoContexto = { ...contexto };

      // Procesar los nodos hijos con el nuevo contexto
      for (const child of nodo.childNodes) {
        contenido += procesarNodo(child, nuevoContexto);
      }

      // Eliminar saltos de línea al inicio y final del contenido para los formatos
      const clean = (txt) => txt.replace(/^\n+|\n+$/g, '');

      switch (tagName) {
        case 'strong':
        case 'b':
          // Dividir por saltos de línea y aplicar negrita a cada línea
          return contenido.split('\n').map(line => {
            const trimmedLine = line.trim();
            // Si ya hay estilos aplicados, mantenerlos
            if (trimmedLine.startsWith('_') && trimmedLine.endsWith('_')) {
              return `*${trimmedLine}*`;
            } else if (trimmedLine.startsWith('~') && trimmedLine.endsWith('~')) {
              return `*${trimmedLine}*`;
            }
            return trimmedLine ? `*${trimmedLine}*` : '';
          }).join('\n');
        case 'em':
        case 'i':
          // Dividir por saltos de línea y aplicar cursiva a cada línea
          return contenido.split('\n').map(line => {
            const trimmedLine = line.trim();
            // Si ya hay estilos aplicados, mantenerlos
            if (trimmedLine.startsWith('*') && trimmedLine.endsWith('*')) {
              return `_${trimmedLine}_`;
            } else if (trimmedLine.startsWith('~') && trimmedLine.endsWith('~')) {
              return `_${trimmedLine}_`;
            }
            return trimmedLine ? `_${trimmedLine}_` : '';
          }).join('\n');
        case 'del':
        case 's':
          // Dividir por saltos de línea y aplicar tachado a cada línea
          return contenido.split('\n').map(line => {
            const trimmedLine = line.trim();
            // Si ya hay estilos aplicados, mantenerlos
            if (trimmedLine.startsWith('*') && trimmedLine.endsWith('*')) {
              return `~${trimmedLine}~`;
            } else if (trimmedLine.startsWith('_') && trimmedLine.endsWith('_')) {
              return `~${trimmedLine}~`;
            }
            return trimmedLine ? `~${trimmedLine}~` : '';
          }).join('\n');
        case 'code':
          if (contexto.pre) {
            return `\0\0\0${clean(contenido)}\0\0\0`;
          } else {
            return `\0${clean(contenido)}\0`;
          }
        case 'pre':
          nuevoContexto.pre = true;
          return `\0\0\0${clean(contenido)}\0\0\0\n`;
        case 'ul':
          return contenido.replace(/^(.*)$/gm, (line) => line ? `* ${line}` : '').replace(/\* $/, '') + '\n';
        case 'ol':
          let i = 1;
          return Array.from(nodo.children).map(li => `${i++}. ${procesarNodo(li, nuevoContexto).replace(/^\n+|\n+$/g, '')}`).join('\n') + '\n';
        case 'li':
          return clean(contenido) + '\n';
        case 'blockquote':
          return clean(contenido).split('\n').map(line => line ? `> ${line}` : '').join('\n') + '\n';
        case 'br':
          return '\n';
        case 'p':
          // Si el contenido no está vacío, poner salto de línea al final
          return clean(contenido) ? clean(contenido) + '\n' : '';
        default:
          return contenido;
      }
    }
    return resultado;
  }

  // Procesar cada hijo de tempDiv como bloque independiente para respetar saltos de línea
  let resultado = Array.from(tempDiv.childNodes).map(nodo => procesarNodo(nodo)).join('');
  resultado = resultado.replace(/\n{3,}/g, '\n\n').trim();
  return resultado;
}