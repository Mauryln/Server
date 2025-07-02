document.addEventListener("DOMContentLoaded", () => {
  window.qrWait = {
    startQrCheck: () => {
      if (window.whatsappSession) {
        window.whatsappSession.showQrCode()
      }
    },
    showLoadingSpinner: () => {
    },
    showError: (message) => {
      if (window.whatsappSession) {
        alert("Error: " + message)
      }
    },
    checkSessionStatus: () => {
      if (window.whatsappSession) {
        window.whatsappSession.checkStatus()
      }
    },
  }
})
