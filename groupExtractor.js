document.getElementById("extractBtn").addEventListener("click", async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url?.startsWith("https://web.whatsapp.com/")) {
      alert("⚠️ Abre WhatsApp Web y carga un grupo primero.");
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["xlsx.full.min.js"]
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractAndDownloadNumbers
    });

  } catch (error) {
    console.error("Error:", error);
    alert("❌ Fallo al extraer numeros. Intenta de nuevo.");
  }
});

function extractAndDownloadNumbers() {
  const numbers = new Set();

  // Obtener nombre del grupo (corregido)
  const groupNameElement = document.querySelector('div.x78zum5.x1q0g3np.x6ikm8r.x10wlt62.x1jchvi3.xdod15v.x1wm35g.x1yc453h.xlyipyv.xuxw1ft.xh8yej3.x1s688f.x1c4vz4f.x2lah0s.xdl72j9 span._ao3e');
  let groupName = "grupo";
  if (groupNameElement) {
    groupName = groupNameElement.textContent
      .replace(/[\/\\:*?"<>|]/g, "")
      .trim();
  }

  // 2. Extraer números
  const memberDivs = document.querySelectorAll('div.x78zum5.x1cy8zhl.xisnujt.x1nxh6w3.xcgms0a.x16cd2qt');
  memberDivs.forEach(div => {
    const span = div.querySelector('span[title]');
    if (span) {
      const title = span.getAttribute('title');
      if (title) {
        title.split(',').forEach(number => {
          const normalized = number.trim().replace(/[\s\-()]/g, '');
          if (/^\+?\d{7,15}$/.test(normalized)) {
            numbers.add(normalized);
          }
        });
      }
    }
  });

  if (numbers.size === 0) {
    alert("⚠️ No se encontraron números.");
    return;
  }

  // 3. Generar archivo Excel
  const numberList = Array.from(numbers).map(num => ({ Número: num }));
  const worksheet = XLSX.utils.json_to_sheet(numberList);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Numeros");

  const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${groupName}.xlsx`;
  link.click();
}


function cargarNumerosDesdeExcel(datos) {
  const numberListElement = document.getElementById('numberList');

  // Limpiar la lista antes de agregar nuevos números
  numberListElement.innerHTML = '';

  // Llenar la lista con los números del archivo Excel
  datos.forEach(dato => {
    const div = document.createElement('div');
    div.classList.add('checkbox-item');
    div.innerHTML = `<input type="checkbox" value="${dato.Número}" /> ${dato.Número}`;
    numberListElement.appendChild(div);
  });
}
