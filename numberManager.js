document.addEventListener("DOMContentLoaded", () => {
  const numberList = document.getElementById("numberList");
  const deleteSelectedBtn = document.getElementById("deleteSelected");

  // Función para actualizar los contadores
  function updateSelectedCount() {
    const checkboxes = numberList.querySelectorAll("input[type='checkbox']");
    const selectedCount = document.getElementById("selected-count");
    const totalCount = document.getElementById("total-count");
    const selectedNumbersCount = document.getElementById("selected-numbers-count");

    if (!selectedCount || !totalCount) return;

    let count = 0;
    checkboxes.forEach((checkbox) => {
      if (checkbox.checked) count++;
    });

    selectedCount.textContent = count;
    totalCount.textContent = checkboxes.length;

    // Actualizar también el contador en la pestaña de mensajes
    if (selectedNumbersCount) {
      selectedNumbersCount.textContent = `${count} números seleccionados`;
    }
  }

  // Cargar números guardados al iniciar
  loadSavedNumbers();

  // Función para guardar números en el almacenamiento local
  function saveNumbers() {
    const numbers = Array.from(numberList.querySelectorAll("input[type='checkbox']")).map(input => ({
      number: input.value,
      checked: input.checked
    }));
    chrome.storage.local.set({ savedNumbers: numbers });
  }

  // Función para cargar números guardados
  function loadSavedNumbers() {
    chrome.storage.local.get(['savedNumbers'], function(result) {
      if (result.savedNumbers) {
        numberList.innerHTML = '';
        result.savedNumbers.forEach(num => {
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.value = num.number;
          checkbox.checked = num.checked;

          const label = document.createElement("label");
          label.textContent = num.number;
          label.prepend(checkbox);

          numberList.appendChild(label);
        });
        updateSelectedCount();
      }
    });
  }

  // Función para eliminar números seleccionados
  function deleteSelectedNumbers() {
    const selectedCheckboxes = numberList.querySelectorAll("input[type='checkbox']:checked");
    if (selectedCheckboxes.length === 0) {
      alert("Por favor selecciona al menos un número para eliminar");
      return;
    }

    if (confirm(`¿Estás seguro de que deseas eliminar ${selectedCheckboxes.length} número(s)?`)) {
      selectedCheckboxes.forEach(checkbox => {
        // Eliminar el elemento padre (label) que contiene el checkbox
        const label = checkbox.parentElement;
        if (label) {
          label.remove();
        }
      });
      saveNumbers();
      updateSelectedCount();
    }
  }

  // Evento para el botón de eliminar
  if (deleteSelectedBtn) {
    deleteSelectedBtn.addEventListener("click", deleteSelectedNumbers);
  }

  // Guardar números cuando cambian
  if (numberList) {
    numberList.addEventListener("change", (e) => {
      if (e.target.type === "checkbox") {
        saveNumbers();
        updateSelectedCount();
      }
    });

    // Observar cambios en la lista de números
    const observer = new MutationObserver(() => {
      saveNumbers();
      updateSelectedCount();
    });

    observer.observe(numberList, { childList: true, subtree: true });
  }
}); 