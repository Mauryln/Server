// Enhanced animations and UI interactions
document.addEventListener("DOMContentLoaded", () => {
  // Declare animateCheckboxItems
  function animateCheckboxItems() {
    const items = document.querySelectorAll(".checkbox-item, .checkbox-list label")
    items.forEach((item, index) => {
      item.style.animationDelay = `${index * 0.05}s`
      item.classList.add("animate")
    })
  }

  // Make the function globally available
  window.animateCheckboxItems = animateCheckboxItems

  // Tab Navigation
  const tabs = document.querySelectorAll(".nav-tab")
  const tabContents = document.querySelectorAll(".tab-content")

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Remove active class from all tabs and contents
      tabs.forEach((t) => t.classList.remove("active"))
      tabContents.forEach((c) => c.classList.remove("active"))

      // Add active class to clicked tab and corresponding content
      tab.classList.add("active")
      const tabId = `${tab.dataset.tab}-tab`
      document.getElementById(tabId).classList.add("active")

      // Update selected numbers dropdown when switching to message tab
      if (tab.dataset.tab === "message") {
        updateSelectedNumbersDropdown()
      }
    })
  })

  // Inicializar los dropdowns de acción
  const actionDropdowns = document.querySelectorAll(".action-dropdown-header")
  if (actionDropdowns) {
    actionDropdowns.forEach((header) => {
      header.addEventListener("click", () => {
        const dropdown = header.closest(".action-dropdown")
        dropdown.classList.toggle("active")

        // Rotate chevron icon
        const icon = header.querySelector(".fa-chevron-down")
        if (icon) {
          icon.style.transition = "transform 0.3s"
          icon.style.transform = dropdown.classList.contains("active") ? "rotate(180deg)" : "rotate(0)"
        }
      })
    })
  }

  // Extract Button Animation
  const extractBtn = document.getElementById("extractBtn")
  if (extractBtn) {
    extractBtn.addEventListener("click", function () {
      this.classList.add("loading")

      // The actual extraction is handled by popup.js
      // This is just for visual feedback
      setTimeout(() => {
        this.classList.remove("loading")
        this.classList.add("success")
        setTimeout(() => {
          this.classList.remove("success")
        }, 1000)
      }, 2000)
    })
  }

  // Load Numbers Button Animation
  const loadBtn = document.getElementById("loadBtn")
  if (loadBtn) {
    loadBtn.addEventListener("click", function () {
      this.classList.add("loading")

      // The actual loading is handled by excelLoader.js
      // This is just for visual feedback
      setTimeout(() => {
        this.classList.remove("loading")
        this.classList.add("success")
        setTimeout(() => {
          this.classList.remove("success")
        }, 1000)
      }, 2000)
    })
  }

  // Send Messages Button Animation
  const enviarBtn = document.getElementById("enviar-btn")
  if (enviarBtn) {
    enviarBtn.addEventListener("click", function () {
      // The actual sending is handled by enviarMensajes.js
      // We just add the loading class for visual feedback
      this.classList.add("loading")

      // Show send status
      document.getElementById("send-status").classList.add("active")

      // Simulate progress for demo purposes
      const progress = document.getElementById("send-progress")
      const sentCount = document.getElementById("sent-count")
      const totalCount = document.getElementById("total-send-count")

      // Obtener el número real de mensajes seleccionados
      const checkedBoxes = document.querySelectorAll('#numberList input[type="checkbox"]:checked')
      const total = checkedBoxes.length
      totalCount.textContent = total

      let count = 0
      if (total === 0) return // No hay mensajes a enviar

      const interval = setInterval(() => {
        count++
        const percent = (count / total) * 100
        progress.style.width = `${percent}%`
        sentCount.textContent = count

        if (count >= total) {
          clearInterval(interval)
          enviarBtn.classList.remove("loading")
          enviarBtn.classList.add("success")
          setTimeout(() => {
            enviarBtn.classList.remove("success")
          }, 1000)
        }
      }, 500)
    })
  }

  // Emoji Picker
  const emojiBtn = document.getElementById("emoji-btn")
  const emojiPicker = document.getElementById("emoji-picker")
  const emojiContainer = document.querySelector(".emoji-container")
  const trixEditor = document.querySelector('trix-editor')

  if (emojiBtn) {
    emojiBtn.addEventListener("click", () => {
      emojiPicker.classList.toggle("active")

      // Only load emojis if container is empty
      if (emojiContainer && emojiContainer.children.length === 0) {
        loadEmojis("smileys")
      }
    })
  }

  // Emoji Categories
  const emojiCategories = document.querySelectorAll(".emoji-category")
  if (emojiCategories.length) {
    emojiCategories.forEach((category) => {
      category.addEventListener("click", function () {
        emojiCategories.forEach((c) => c.classList.remove("active"))
        this.classList.add("active")
        loadEmojis(this.dataset.category)
      })
    })
  }

  // Load emojis based on category
  function loadEmojis(category) {
    // Clear container
    if (!emojiContainer) return
    emojiContainer.innerHTML = ""

    // Emoji map by category (simplified for example)
    const emojis = {
      smileys: [
        "😀",
        "😃",
        "😄",
        "😁",
        "😆",
        "😅",
        "😂",
        "🤣",
        "😊",
        "😇",
        "🙂",
        "🙃",
        "😉",
        "😌",
        "😍",
        "🥰",
        "😘",
        "😗",
        "😙",
        "😚",
      ],
      people: [
        "👋",
        "🤚",
        "✋",
        "🖖",
        "👌",
        "🤏",
        "✌️",
        "🤞",
        "🤟",
        "🤘",
        "🤙",
        "👈",
        "👉",
        "👆",
        "👇",
        "☝️",
        "👍",
        "👎",
        "✊",
        "👊",
      ],
      animals: [
        "🐶",
        "🐱",
        "🐭",
        "🐹",
        "🐰",
        "🦊",
        "🐻",
        "🐼",
        "🐨",
        "🐯",
        "🦁",
        "🐮",
        "🐷",
        "🐸",
        "🐵",
        "🙈",
        "🙉",
        "🙊",
        "🐒",
        "🐔",
      ],
      food: [
        "🍎",
        "🍐",
        "🍊",
        "🍋",
        "🍌",
        "🍉",
        "🍇",
        "🍓",
        "🍈",
        "🍒",
        "🍑",
        "🥭",
        "🍍",
        "🥥",
        "🥝",
        "🍅",
        "🍆",
        "🥑",
        "🥦",
        "🥬",
      ],
      travel: [
        "🚗",
        "🚕",
        "🚙",
        "🚌",
        "🚎",
        "🏎️",
        "🚓",
        "🚑",
        "🚒",
        "🚐",
        "🚚",
        "🚛",
        "🚜",
        "🛴",
        "🚲",
        "🛵",
        "🏍️",
        "🚨",
        "🚔",
        "🚍",
      ],
      activities: [
        "⚽",
        "🏀",
        "🏈",
        "⚾",
        "🥎",
        "🎾",
        "🏐",
        "🏉",
        "🎱",
        "🪀",
        "🏓",
        "🏸",
        "🥅",
        "🏒",
        "🏑",
        "🥍",
        "🏏",
        "🥏",
        "🪃",
        "🥊",
      ],
      objects: [
        "💡",
        "🔦",
        "🧯",
        "🛒",
        "🧴",
        "🧷",
        "🧹",
        "🧺",
        "🧻",
        "🪠",
        "🧼",
        "🪥",
        "🧽",
        "🧯",
        "🔑",
        "🗝️",
        "🔨",
        "🪓",
        "⛏️",
        "⚒️",
      ],
      symbols: [
        "❤️",
        "🧡",
        "💛",
        "💚",
        "💙",
        "💜",
        "🖤",
        "🤍",
        "🤎",
        "💔",
        "❣️",
        "💕",
        "💞",
        "💓",
        "💗",
        "💖",
        "💘",
        "💝",
        "💟",
        "☮️",
      ],
    }

    // Add emojis to container
    emojis[category].forEach((emoji) => {
      const emojiElement = document.createElement("div")
      emojiElement.classList.add("emoji")
      emojiElement.textContent = emoji
      emojiElement.addEventListener("click", () => {
        // Insert emoji at cursor position
        if (trixEditor) {
          trixEditor.editor.insertString(emoji)
        }
        emojiPicker.classList.remove("active")
      })
      emojiContainer.appendChild(emojiElement)
    })
  }

  // File attachment preview
  const mediaFile = document.getElementById("mediaFile")
  const attachmentPreview = document.getElementById("attachment-preview")

  if (mediaFile) {
    mediaFile.addEventListener("change", function () {
      if (this.files && this.files[0]) {
        const file = this.files[0]

        // Check if it's an image
        if (file.type.startsWith("image/")) {
          const reader = new FileReader()
          reader.onload = (e) => {
            if (attachmentPreview) {
              attachmentPreview.innerHTML = ""
              const img = document.createElement("img")
              img.src = e.target.result
              img.alt = file.name
              attachmentPreview.appendChild(img)
            }
          }
          reader.readAsDataURL(file)
        } else {
          // For non-image files
          if (attachmentPreview) {
            attachmentPreview.innerHTML = `
              <div class="document-preview">
                <i class="fas fa-file-alt"></i>
                <p>${file.name}</p>
              </div>
            `
          }
        }
      }
    })
  }

  // Excel file input display
  const excelFile = document.getElementById("excelFile")
  if (excelFile) {
    excelFile.addEventListener("change", function () {
      if (this.files && this.files[0]) {
        const fileName = this.files[0].name
        const fileLabel = this.nextElementSibling
        if (fileLabel) {
          const spanElement = fileLabel.querySelector("span")
          if (spanElement) {
            spanElement.textContent = fileName
          }
        }
      }
    })
  }

  // Collapsible sections
  const collapsibles = document.querySelectorAll(".collapsible")
  collapsibles.forEach((collapsible) => {
    const header = collapsible.querySelector(".toggle-header")
    const content = collapsible.querySelector(".collapse-content")

    if (header) {
      header.addEventListener("click", () => {
        collapsible.classList.toggle("active")
      })
    }
  })

  // Custom country code handling
  const countryCodeSelect = document.getElementById("countryCode")
  const customCodeContainer = document.getElementById("customCodeContainer")
  const customCountryCode = document.getElementById("customCountryCode")

  if (countryCodeSelect) {
    countryCodeSelect.addEventListener("change", function () {
      if (this.value === "other" && customCodeContainer) {
        customCodeContainer.style.display = "block"
        if (customCountryCode) customCountryCode.focus()
      } else if (customCodeContainer) {
        customCodeContainer.style.display = "none"
      }
    })
  }

  // Manual number entry
  const addNumberBtn = document.getElementById("addNumberBtn")
  const addMultipleNumbersBtn = document.getElementById("addMultipleNumbersBtn")
  const phoneNumberInput = document.getElementById("phoneNumber")
  const multipleNumbersInput = document.getElementById("multipleNumbers")
  const numberList = document.getElementById("numberList")

  // Función para agregar un número a la lista
  function addNumberToList(number) {
    // Check if number already exists
    const existingNumbers = Array.from(numberList.querySelectorAll("input[type='checkbox']"))
    const numberExists = existingNumbers.some((input) => input.value === number)

    if (numberExists) {
      return false
    }

    // Create the checkbox and label
    const checkbox = document.createElement("input")
    checkbox.type = "checkbox"
    checkbox.value = number
    checkbox.checked = true

    const label = document.createElement("label")
    label.textContent = number
    label.prepend(checkbox)

    // Add to the list
    numberList.appendChild(label)

    // Add animation
    label.classList.add("animate")
    return true
  }

  // Función para formatear un número
  function formatPhoneNumber(number, countryCode) {
    // Remove any non-digit characters except the plus sign
    let cleanedNumber = number.replace(/[^\d]/g, "")

    // Basic validation
    if (cleanedNumber.length < 7) {
      return null
    }

    // Format the full number with country code
    return `${countryCode} ${cleanedNumber}`
  }

  if (addNumberBtn && phoneNumberInput && numberList) {
    addNumberBtn.addEventListener("click", () => {
      let countryCode = countryCodeSelect.value

      // If "other" is selected, use the custom country code
      if (countryCode === "other") {
        countryCode = customCountryCode.value.trim()

        // Validate custom country code
        if (!countryCode) {
          alert("Por favor ingresa un código de país")
          customCountryCode.focus()
          return
        }

        // Ensure it starts with +
        if (!countryCode.startsWith("+")) {
          countryCode = "+" + countryCode
        }
      }

      const phoneNumber = phoneNumberInput.value.trim()

      // Basic validation
      if (!phoneNumber) {
        alert("Por favor ingresa un número de teléfono")
        phoneNumberInput.focus()
        return
      }

      const formattedNumber = formatPhoneNumber(phoneNumber, countryCode)
      if (!formattedNumber) {
        alert("El número de teléfono debe tener al menos 7 dígitos")
        phoneNumberInput.focus()
        return
      }

      if (addNumberToList(formattedNumber)) {
        // Clear the input field
        phoneNumberInput.value = ""
        // Update counters
        updateSelectedCount()
      } else {
        alert("Este número ya está en la lista")
      }
    })
  }

  if (addMultipleNumbersBtn && multipleNumbersInput && numberList) {
    addMultipleNumbersBtn.addEventListener("click", () => {
      let countryCode = countryCodeSelect.value

      // If "other" is selected, use the custom country code
      if (countryCode === "other") {
        countryCode = customCountryCode.value.trim()

        // Validate custom country code
        if (!countryCode) {
          alert("Por favor ingresa un código de país")
          customCountryCode.focus()
          return
        }

        // Ensure it starts with +
        if (!countryCode.startsWith("+")) {
          countryCode = "+" + countryCode
        }
      }

      const numbersText = multipleNumbersInput.value.trim()
      if (!numbersText) {
        alert("Por favor ingresa los números a agregar")
        multipleNumbersInput.focus()
        return
      }

      // Split numbers by newlines or commas
      const numbers = numbersText.split(/[\n,]+/).map(n => n.trim()).filter(n => n)
      
      if (numbers.length === 0) {
        alert("No se encontraron números válidos")
        return
      }

      let addedCount = 0
      let duplicateCount = 0

      numbers.forEach(number => {
        const formattedNumber = formatPhoneNumber(number, countryCode)
        if (formattedNumber) {
          if (addNumberToList(formattedNumber)) {
            addedCount++
          } else {
            duplicateCount++
          }
        }
      })

      // Clear the textarea
      multipleNumbersInput.value = ""
      
      // Update counters
      updateSelectedCount()

      // Show results
      let message = `Se agregaron ${addedCount} números`
      if (duplicateCount > 0) {
        message += ` (${duplicateCount} números ya existían)`
      }
      alert(message)
    })
  }

  // Selected numbers dropdown in message tab
  const selectedNumbersDropdown = document.querySelector(".selected-numbers-dropdown")
  const dropdownHeader = document.querySelector(".dropdown-header")

  if (dropdownHeader && selectedNumbersDropdown) {
    dropdownHeader.addEventListener("click", () => {
      selectedNumbersDropdown.classList.toggle("active")
      updateSelectedNumbersDropdown()
    })
  }

  // Function to update the selected numbers dropdown
  function updateSelectedNumbersDropdown() {
    const selectedNumbersList = document.getElementById("selected-numbers-list")
    const selectedNumbersCount = document.getElementById("selected-numbers-count")

    if (!selectedNumbersList || !selectedNumbersCount) return

    // Get all checked checkboxes
    const checkedBoxes = document.querySelectorAll('#numberList input[type="checkbox"]:checked')
    const count = checkedBoxes.length

    // Update count text
    selectedNumbersCount.textContent = `${count} números seleccionados`

    // Clear and update the list
    selectedNumbersList.innerHTML = ""

    if (count === 0) {
      selectedNumbersList.innerHTML = "<p>No hay números seleccionados</p>"
    } else {
      checkedBoxes.forEach((checkbox) => {
        const item = document.createElement("div")
        item.className = "selected-number-item"
        item.innerHTML = `<i class="fas fa-check-circle"></i> ${checkbox.value}`
        selectedNumbersList.appendChild(item)
      })
    }
  }

  // Update selected count when checkboxes change
  function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('#numberList input[type="checkbox"]')
    const selectedCount = document.getElementById("selected-count")
    const totalCount = document.getElementById("total-count")

    if (!selectedCount || !totalCount) return

    let count = 0
    checkboxes.forEach((checkbox) => {
      if (checkbox.checked) count++
    })

    selectedCount.textContent = count
    totalCount.textContent = checkboxes.length

    // Also update the message tab dropdown
    const selectedNumbersCount = document.getElementById("selected-numbers-count")
    if (selectedNumbersCount) {
      selectedNumbersCount.textContent = `${count} números seleccionados`
    }
  }

  // Select/Deselect All
  const selectAllBtn = document.getElementById("selectAll")
  const deselectAllBtn = document.getElementById("deselectAll")

  if (selectAllBtn) {
    selectAllBtn.addEventListener("click", () => {
      const checkboxes = document.querySelectorAll('#numberList input[type="checkbox"]')
      checkboxes.forEach((checkbox) => {
        checkbox.checked = true
      })
      updateSelectedCount()
    })
  }

  if (deselectAllBtn) {
    deselectAllBtn.addEventListener("click", () => {
      const checkboxes = document.querySelectorAll('#numberList input[type="checkbox"]')
      checkboxes.forEach((checkbox) => {
        checkbox.checked = false
      })
      updateSelectedCount()
    })
  }

  // Listen for changes in the number list
  if (numberList) {
    // Use MutationObserver to detect when numbers are added
    const observer = new MutationObserver(() => {
      updateSelectedCount()
    })

    observer.observe(numberList, { childList: true, subtree: true })

    // Also listen for checkbox changes
    numberList.addEventListener("change", (e) => {
      if (e.target.type === "checkbox") {
        updateSelectedCount()
      }
    })
  }

  // Theme toggle functionality
  const settingsBtn = document.getElementById("settings-btn")
  const body = document.body
  let isDarkMode = false

  // Leer el tema guardado en localStorage
  const savedTheme = localStorage.getItem("wa_theme")
  if (savedTheme === "dark") {
    isDarkMode = true
    body.classList.remove("light-theme")
    body.classList.add("dark-theme")
    if (settingsBtn) {
      settingsBtn.innerHTML = '<i class="fas fa-sun"></i>'
      settingsBtn.title = "Cambiar a tema claro"
    }
  } else {
    isDarkMode = false
    body.classList.remove("dark-theme")
    body.classList.add("light-theme")
    if (settingsBtn) {
      settingsBtn.innerHTML = '<i class="fas fa-moon"></i>'
      settingsBtn.title = "Cambiar a tema oscuro"
    }
  }

  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      isDarkMode = !isDarkMode

      if (isDarkMode) {
        body.classList.remove("light-theme")
        body.classList.add("dark-theme")
        settingsBtn.innerHTML = '<i class="fas fa-sun"></i>'
        settingsBtn.title = "Cambiar a tema claro"
        localStorage.setItem("wa_theme", "dark")
      } else {
        body.classList.remove("dark-theme")
        body.classList.add("light-theme")
        settingsBtn.innerHTML = '<i class="fas fa-moon"></i>'
        settingsBtn.title = "Cambiar a tema oscuro"
        localStorage.setItem("wa_theme", "light")
      }
    })
  }

  // QR Modal functionality
  const startSessionBtn = document.getElementById("start-session-btn")
  const scanQrBtn = document.getElementById("scan-qr-btn")
  const closeModal = document.querySelector(".close-modal")
  const qrModal = document.getElementById("qr-modal")

  if (startSessionBtn) {
    startSessionBtn.addEventListener("click", () => {
      if (qrModal) qrModal.style.display = "block"
    })
  }

  if (scanQrBtn) {
    scanQrBtn.addEventListener("click", () => {
      if (qrModal) qrModal.style.display = "block"
    })
  }

  if (closeModal && qrModal) {
    closeModal.addEventListener("click", () => {
      qrModal.style.display = "none"
    })

    // Close modal when clicking outside
    window.addEventListener("click", (e) => {
      if (e.target === qrModal) {
        qrModal.style.display = "none"
      }
    })
  }

  // Inicializar contadores y estados al cargar
  updateSelectedCount()

  // Inicializar animaciones
  animateCheckboxItems()

  // Botón de plantillas mejorado con edición, eliminación e inserción individual
  const templateBtn = document.getElementById("template-btn")
  if (templateBtn && trixEditor) {
    function getPlantillas() {
      const stored = localStorage.getItem("wa_plantillas")
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {
          return [
            "Hola, ¿cómo estás? 😊",
            "¡Te escribo para informarte sobre nuestra promoción!",
            "Estimado cliente, le recordamos que...",
            "Gracias por tu preferencia."
          ]
        }
      }
      return [
        "Hola, ¿cómo estás? 😊",
        "¡Te escribo para informarte sobre nuestra promoción!",
        "Estimado cliente, le recordamos que...",
        "Gracias por tu preferencia."
      ]
    }
    function setPlantillas(arr) {
      localStorage.setItem("wa_plantillas", JSON.stringify(arr))
    }

    templateBtn.addEventListener("click", () => {
      let plantillas = getPlantillas()
      let menu = plantillas.map((p, i) => `${i + 1}. ${p}`).join("\n") +
        "\n\nEscribe el número de la plantilla a insertar, 'editar {número}' para editar una, 'eliminar {número}' para borrar, 'insertar' para añadir una nueva, o 'editar' para modificar todas."
      let seleccion = prompt(menu, "1")
      if (!seleccion) return
      seleccion = seleccion.trim()
      // Eliminar plantilla
      if (/^eliminar\s*\d+$/i.test(seleccion)) {
        const num = parseInt(seleccion.match(/\d+/)[0])
        if (!isNaN(num) && num >= 1 && num <= plantillas.length) {
          if (confirm(`¿Seguro que deseas eliminar la plantilla ${num}?`)) {
            plantillas.splice(num - 1, 1)
            setPlantillas(plantillas)
            alert("Plantilla eliminada!")
          }
        } else {
          alert("Número inválido.")
        }
        return
      }
      // Editar una plantilla específica
      if (/^editar\s*\d+$/i.test(seleccion)) {
        const num = parseInt(seleccion.match(/\d+/)[0])
        if (!isNaN(num) && num >= 1 && num <= plantillas.length) {
          const nueva = prompt("Edita la plantilla:", plantillas[num - 1])
          if (nueva !== null && nueva.trim() !== "") {
            plantillas[num - 1] = nueva.trim()
            setPlantillas(plantillas)
            alert("Plantilla actualizada!")
          }
        } else {
          alert("Número inválido.")
        }
        return
      }
      // Insertar nueva plantilla
      if (seleccion.toLowerCase() === "insertar") {
        const nueva = prompt("Escribe la nueva plantilla:")
        if (nueva && nueva.trim() !== "") {
          plantillas.push(nueva.trim())
          setPlantillas(plantillas)
          alert("Plantilla añadida!")
        }
        return
      }
      // Editar todas las plantillas
      if (seleccion.toLowerCase() === "editar") {
        let nuevas = prompt(
          "Edita tus plantillas, una por línea:",
          plantillas.join("\n")
        )
        if (nuevas !== null) {
          plantillas = nuevas.split(/\r?\n/).map(p => p.trim()).filter(Boolean)
          setPlantillas(plantillas)
          alert("Plantillas actualizadas!")
        }
        return
      }
      // Selección por número
      const num = parseInt(seleccion)
      if (!isNaN(num) && num >= 1 && num <= plantillas.length) {
        trixEditor.editor.insertString(plantillas[num - 1])
      } else {
        alert("Selección inválida.")
      }
    })
  }
})
