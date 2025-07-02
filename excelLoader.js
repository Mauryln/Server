document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("excelFile")
  const loadBtn = document.getElementById("loadBtn")
  const numberList = document.getElementById("numberList")
  const selectAllBtn = document.getElementById("selectAll")
  const deselectAllBtn = document.getElementById("deselectAll")

  let loadedNumbers = []

  // Función para validar números de teléfono
  function isValidPhoneNumber(number) {
    // Eliminar espacios y caracteres especiales
    const cleanNumber = number.replace(/\D/g, '')
    // Verificar que tenga entre 8 y 15 dígitos
    return cleanNumber.length >= 8 && cleanNumber.length <= 15
  }

  // Función para procesar el archivo Excel
  function processExcelFile(file) {
    const reader = new FileReader()
    
    reader.onload = function(e) {
      const data = new Uint8Array(e.target.result)
      /* global XLSX */
      const workbook = XLSX.read(data, { type: "array" })
      
      // Obtener la primera hoja
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      
      // Convertir a JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      // Procesar cada fila
      jsonData.forEach((row, index) => {
        // Saltar la primera fila si es un encabezado
        if (index === 0) return
        
        // Asumimos que el número está en la primera columna
        const number = String(row[0]).trim()
        
        if (isValidPhoneNumber(number) && !loadedNumbers.includes(number)) {
          loadedNumbers.push(number)

          const checkbox = document.createElement("input")
          checkbox.type = "checkbox"
          checkbox.value = number
          checkbox.checked = true

          const label = document.createElement("label")
          label.textContent = number
          label.prepend(checkbox)

          numberList.appendChild(label)
        }
      })
      
      // Actualizar contadores
      updateSelectedCount()
    }
    
    reader.readAsArrayBuffer(file)
  }

  // Evento para el botón de cargar
  loadBtn.addEventListener("click", () => {
    const file = fileInput.files[0]
    if (!file) {
      alert("📂 Por favor selecciona un archivo Excel primero.")
      return
    }
    
    processExcelFile(file)
  })

  // Evento para mostrar el nombre del archivo seleccionado
  fileInput.addEventListener("change", function() {
    const fileName = this.files[0]?.name || "Seleccionar archivo"
    const fileLabel = this.nextElementSibling
    if (fileLabel) {
      const spanElement = fileLabel.querySelector("span")
      if (spanElement) {
        spanElement.textContent = fileName
      }
    }
  })

  selectAllBtn.addEventListener("click", () => {
    numberList.querySelectorAll("input[type='checkbox']").forEach((cb) => (cb.checked = true))
    updateSelectedCount()
  })

  deselectAllBtn.addEventListener("click", () => {
    numberList.querySelectorAll("input[type='checkbox']").forEach((cb) => (cb.checked = false))
    updateSelectedCount()
  })

  // Helper function to update the selected count
  function updateSelectedCount() {
    const checkboxes = numberList.querySelectorAll("input[type='checkbox']")
    const selectedCount = document.getElementById("selected-count")
    const totalCount = document.getElementById("total-count")

    let count = 0
    checkboxes.forEach((cb) => {
      if (cb.checked) count++
    })

    if (selectedCount) selectedCount.textContent = count
    if (totalCount) totalCount.textContent = checkboxes.length
  }

  // Listen for checkbox changes
  numberList.addEventListener("change", (e) => {
    if (e.target.type === "checkbox") {
      updateSelectedCount()
    }
  })
})
