import { contextBridge, ipcRenderer } from "electron"

// rename "electronAPI" ? to more suitable
contextBridge.exposeInMainWorld("electronAPI", {
  toggleRecordButtons: (isRecording) => {
    const startBtn = document.getElementById("startBtn") as HTMLButtonElement
    const stopBtn = document.getElementById("stopBtn") as HTMLButtonElement

    startBtn.disabled = isRecording
    stopBtn.disabled = !isRecording
  },
  startRecording: () => ipcRenderer.send("start-recording"),
  stopRecording: () => ipcRenderer.send("stop-recording"),
  onRecordingFinished: (callback) =>
    ipcRenderer.on("recording-finished", callback),
})

window.addEventListener("DOMContentLoaded", () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ["chrome", "node", "electron"]) {
    replaceText(`${type}-version`, process.versions[type])
  }
})

let isMouseOverInteractiveElement = false

window.addEventListener("DOMContentLoaded", () => {
  const interactiveElements = document.querySelectorAll(".clickable")

  interactiveElements.forEach((element) => {
    element.addEventListener("mouseenter", () => {
      console.log("Mouse enter")
      isMouseOverInteractiveElement = true
      ipcRenderer.send("set-ignore-mouse-events", false)
    })

    element.addEventListener("mouseleave", () => {
      console.log("Mouse leave")
      isMouseOverInteractiveElement = false
      ipcRenderer.send("set-ignore-mouse-events", true, { forward: true })
    })
  })
})
