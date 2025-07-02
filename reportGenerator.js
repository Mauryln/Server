document.addEventListener("DOMContentLoaded", () => {
    const labelDropdown = document.getElementById("report-label-selector");
    const sentDropdown = document.getElementById("sentMessagesDropdown");
    const loadBtn = document.getElementById("loadMessagesBtn");
    const generateBtn = document.getElementById("generateReportBtn");
  
    // Variable para trackear si ya verificamos que no hay etiquetas disponibles
    let labelsUnavailable = false;
  
    // Verificar estado inicial de la sesión
    checkSessionAndLoadLabels();
  
    async function checkSessionAndLoadLabels() {
      const userId = window.whatsappSession.getUserId();
      if (!userId) return;

      try {
        const response = await fetch(`https://iabimcat.onrender.com/session-status/${userId}`);
        const data = await response.json();
        
        if (data.success && data.status === 'ready') {
          // Siempre intentar cargar etiquetas cuando la sesión esté lista
          loadLabels();
        } else {
          // Solo resetear si la sesión no está lista
          labelDropdown.innerHTML = '<option value="">Conecta WhatsApp primero</option>';
          labelDropdown.disabled = true;
          labelsUnavailable = false; // Reset cuando la sesión no está lista
        }
      } catch (error) {
        console.error("Error verificando estado de sesión:", error);
        // Solo mostrar error si el selector está vacío o deshabilitado
        if (labelDropdown.disabled || labelDropdown.options.length <= 1) {
          labelDropdown.innerHTML = '<option value="">Error al verificar estado</option>';
          labelDropdown.disabled = true;
        }
      }
    }
  
    async function loadLabels() {
      const userId = window.whatsappSession.getUserId();
      if (!userId) {
        labelDropdown.innerHTML = '<option value="">Conecta WhatsApp primero</option>';
        return;
      }

      try {
        const res = await fetch(`https://iabimcat.onrender.com/labels/${userId}`);
        const data = await res.json();
    
        if (data.success && data.labels && data.labels.length > 0) {
          // Guardar la selección actual
          const currentSelection = labelDropdown.value;
          
          labelDropdown.innerHTML = '<option value="">Selecciona una etiqueta</option>';
          data.labels.forEach(label => {
            const opt = document.createElement("option");
            opt.value = label.id;
            opt.textContent = label.name;
            labelDropdown.appendChild(opt);
          });
          
          // Restaurar la selección si existe
          if (currentSelection) {
            labelDropdown.value = currentSelection;
          }
          
          labelsUnavailable = false;
        } else if (res.status === 501) {
          // Si el backend responde 501, mostrar como si no hubiera etiquetas
          labelDropdown.innerHTML = '<option value="">No hay etiquetas disponibles</option>';
          labelDropdown.disabled = true;
          // NO bloquear más intentos
        } else {
          // Solo mostrar error si el selector está vacío
          if (labelDropdown.options.length <= 1) {
            labelDropdown.innerHTML = '<option value="">No hay etiquetas disponibles</option>';
            labelDropdown.disabled = true;
          }
        }
      } catch (error) {
        console.error("Error al cargar etiquetas:", error);
        if (labelDropdown.options.length <= 1) {
          labelDropdown.innerHTML = '<option value="">Error al cargar etiquetas</option>';
          labelDropdown.disabled = true;
        }
      }
    }
  
    async function loadSentMessages() {
      const userId = window.whatsappSession.getUserId();
      if (!userId) {
        alert("Conecta WhatsApp primero");
        return;
      }

      const labelId = labelDropdown.value;
      if (!labelId) return alert("Selecciona una etiqueta");
  
      const res = await fetch(`https://iabimcat.onrender.com/reports/${userId}/${labelId}/messages`);
      const data = await res.json();
  
      if (data.success) {
        const uniqueMessages = [...new Set(data.messages.map(m => m.body))];
        sentDropdown.innerHTML = '<option value="">Selecciona un mensaje</option>';
        uniqueMessages.forEach(body => {
          const opt = document.createElement("option");
          opt.value = body;
          opt.textContent = body.length > 40 ? body.slice(0, 40) + "..." : body;
          sentDropdown.appendChild(opt);
        });
  
        sentDropdown.disabled = false;
        sentDropdown.dataset.fullData = JSON.stringify(data.messages);
      } else {
        alert("Error al obtener mensajes enviados.");
      }
    }
  
    function generateExcel() {
        const selectedBody = sentDropdown.value;
        const allMessages = JSON.parse(sentDropdown.dataset.fullData || "[]");
        const filtered = allMessages.filter(m => m.body === selectedBody);
      
        const data = filtered.map(m => {
          const estado = m.ack === 1 ? "✔ Enviado" :
                         m.ack === 2 ? "✔✔ Entregado" :
                         m.ack === 3 ? "✔✔ Azul Leído" :
                         m.ack === 4 ? "Leído (media)" : "Desconocido";
      
          return {
            Etiqueta: labelDropdown.options[labelDropdown.selectedIndex].text,
            Número: m.number,
            Mensaje: m.body,
            Estado: estado,
            "Hora de Envío": new Date(m.timestamp * 1000).toLocaleString(),
            Respuesta: m.response || "Sin respuesta"
          };
        });
      
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte");
        XLSX.writeFile(wb, `Reporte_${labelDropdown.options[labelDropdown.selectedIndex].text}.xlsx`);
    }
  
    // Escuchar cambios en el estado de la sesión
    document.addEventListener("whatsappSessionStatusChanged", (e) => {
      if (e.detail.status === "ready") {
        labelsUnavailable = false; // Reset cuando la sesión cambia
        checkSessionAndLoadLabels();
      } else if (e.detail.status === "no_session") {
        labelDropdown.innerHTML = '<option value="">Conecta WhatsApp primero</option>';
        sentDropdown.innerHTML = '<option value="">Primero carga una etiqueta</option>';
        sentDropdown.disabled = true;
        labelsUnavailable = false; // Reset cuando no hay sesión
      }
    });
  
    // Verificar el estado de la sesión periódicamente (solo si no hemos determinado que no hay etiquetas)
    setInterval(() => {
      if (!labelsUnavailable) {
        checkSessionAndLoadLabels();
      }
    }, 10000); // Aumentado a 10 segundos para reducir requests
  
    loadBtn.addEventListener("click", loadSentMessages);
    generateBtn.addEventListener("click", generateExcel);
});
  