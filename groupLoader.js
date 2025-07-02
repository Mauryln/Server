// Versión mejorada de group-loader.js que maneja mejor los números de teléfono

// Función para cargar los grupos de WhatsApp
async function loadGroups() {
    const userId = window.whatsappSession.getUserId()
    const sessionState = window.whatsappSession.getSessionState()
  
    // Verificar si hay una sesión activa
    if (sessionState !== "ready" || !userId) {
      document.getElementById("groupSelector").innerHTML = '<option value="">Conecta WhatsApp primero</option>'
      document.getElementById("groupSelector").disabled = true
      document.getElementById("loadGroupBtn").disabled = true
      return
    }
  
    try {
      // Mostrar indicador de carga
      document.getElementById("groupSelector").innerHTML = '<option value="">Cargando grupos...</option>'
      document.getElementById("groupSelector").disabled = true
  
      // Llamar a la API para obtener los grupos
      const response = await fetch(`https://iabimcat.onrender.com/groups/${userId}`)
      const data = await response.json()
  
      if (data.success && data.groups && data.groups.length > 0) {
        // Llenar el selector con los grupos
        const groupSelector = document.getElementById("groupSelector")
        groupSelector.innerHTML = '<option value="">Selecciona un grupo</option>'
  
        data.groups.forEach((group) => {
          const option = document.createElement("option")
          option.value = group.id
          option.textContent = `${group.name} (${group.participants})`
          groupSelector.appendChild(option)
        })
  
        groupSelector.disabled = false
        document.getElementById("loadGroupBtn").disabled = false
  
        // Mostrar mensaje de éxito
        document.getElementById("group-info").innerHTML =
          `<div class="success-message">Se encontraron ${data.groups.length} grupos</div>`
      } else {
        // Mostrar mensaje si no hay grupos
        document.getElementById("groupSelector").innerHTML = '<option value="">No se encontraron grupos</option>'
        document.getElementById("group-info").innerHTML =
          '<div class="error-message">No se encontraron grupos. Asegúrate de tener grupos en WhatsApp.</div>'
      }
    } catch (error) {
      console.error("Error al cargar grupos:", error)
      document.getElementById("groupSelector").innerHTML = '<option value="">Error al cargar grupos</option>'
      document.getElementById("group-info").innerHTML =
        `<div class="error-message">Error al cargar grupos: ${error.message}</div>`
    }
  }
  
  // Función para cargar los participantes de un grupo
  async function loadGroupParticipants() {
    const userId = window.whatsappSession.getUserId()
    const groupId = document.getElementById("groupSelector").value
  
    if (!groupId) {
      alert("Por favor selecciona un grupo primero")
      return
    }
  
    try {
      // Mostrar indicador de carga
      document.getElementById("group-info").innerHTML = '<div class="loading-message">Cargando participantes...</div>'
  
      // Llamar a la API para obtener los participantes
      const response = await fetch(`https://iabimcat.onrender.com/groups/${userId}/${groupId}/participants`)
      const data = await response.json()
  
      if (data.success && data.numbers && data.numbers.length > 0) {
        // Cargar los números en la lista
        const numberListElement = document.getElementById("numberList")
  
        // Limpiar la lista antes de agregar nuevos números
        numberListElement.innerHTML = ""
  
        // Llenar la lista con los números del grupo
        data.numbers.forEach((number) => {
          const div = document.createElement("div")
          div.classList.add("checkbox-item")
  
          // Asegurarse de que el número tenga el formato correcto
          const formattedNumber = formatPhoneNumber(number)
  
          div.innerHTML = `<input type="checkbox" value="${formattedNumber}" checked /> ${formattedNumber}`
          numberListElement.appendChild(div)
        })
  
        // Actualizar contadores
        updateNumberCounters()
  
        // Mostrar mensaje de éxito
        document.getElementById("group-info").innerHTML =
          `<div class="success-message">Se cargaron ${data.numbers.length} participantes del grupo</div>`
  
        // Cerrar el dropdown automáticamente
        document.getElementById("group-dropdown").classList.remove("open")
      } else {
        // Mostrar mensaje si no hay participantes
        document.getElementById("group-info").innerHTML =
          '<div class="error-message">No se encontraron participantes en este grupo.</div>'
      }
    } catch (error) {
      console.error("Error al cargar participantes:", error)
      document.getElementById("group-info").innerHTML =
        `<div class="error-message">Error al cargar participantes: ${error.message}</div>`
    }
  }
  
  // Función para formatear números de teléfono
  function formatPhoneNumber(number) {
    // Si el número ya comienza con +, lo dejamos como está
    if (number.startsWith("+")) {
      return number
    }
  
    // Si el número comienza con números, asumimos que es un número sin el +
    if (/^\d+$/.test(number)) {
      // Si el número tiene más de 10 dígitos, asumimos que ya incluye el código de país
      if (number.length > 10) {
        return "+" + number
      } else {
        // Si es un número corto, asumimos que es un número local y agregamos el código de país
        return "+591" + number // Código de Bolivia por defecto
      }
    }
  
    // Si no es un formato reconocible, lo devolvemos sin cambios
    return number
  }
  
  // Función para actualizar los contadores de números
  function updateNumberCounters() {
    const checkboxes = document.querySelectorAll('#numberList input[type="checkbox"]')
    const totalCount = checkboxes.length
    const selectedCount = Array.from(checkboxes).filter((cb) => cb.checked).length
  
    document.getElementById("total-count").textContent = totalCount
    document.getElementById("selected-count").textContent = selectedCount
  
    // También actualizar el contador en la pestaña de mensajes
    const selectedNumbersCount = document.getElementById("selected-numbers-count")
    if (selectedNumbersCount) {
      selectedNumbersCount.textContent = `${selectedCount} números seleccionados`
    }
  }
  
  // Inicializar cuando el documento esté listo
  document.addEventListener("DOMContentLoaded", () => {
    // Escuchar cambios en el estado de la sesión
    document.addEventListener("whatsappSessionStatusChanged", (event) => {
      if (event.detail.status === "ready") {
        loadGroups()
      }
    })
  
    // Escuchar cuando la sesión esté lista
    document.addEventListener("whatsappSessionReady", () => {
      loadGroups()
    })
  
    // Configurar eventos para los botones
    const loadGroupBtn = document.getElementById("loadGroupBtn")
    if (loadGroupBtn) {
      loadGroupBtn.addEventListener("click", loadGroupParticipants)
    }
  
    // Configurar evento para abrir/cerrar el dropdown
    const groupDropdownHeader = document.querySelector("#group-dropdown .action-dropdown-header")
    if (groupDropdownHeader) {
      groupDropdownHeader.addEventListener("click", () => {
        document.getElementById("group-dropdown").classList.toggle("open")
      })
    }
  
    // Verificar el estado inicial
    if (window.whatsappSession && window.whatsappSession.getSessionState() === "ready") {
      loadGroups()
    }
  })
  