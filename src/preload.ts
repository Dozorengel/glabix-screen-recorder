import { contextBridge, ipcRenderer } from "electron"
let isIgnoreMouseEventsFreeze = false
// rename "electronAPI" ? to more suitable
export const electronAPI = {
  ipcRenderer: {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) =>
      ipcRenderer.on(channel, (event, ...args) => func(event, ...args)),
  },

  setIgnoreMouseEvents: (flag: boolean) => {
    if (!flag) {
      isIgnoreMouseEventsFreeze = true
      ipcRenderer.send("set-ignore-mouse-events", false)
    } else {
      isIgnoreMouseEventsFreeze = false
      ipcRenderer.send("set-ignore-mouse-events", true, { forward: true })
    }
  },
  startFullScreenRecording: () =>
    ipcRenderer.send("start-fullscreen-recording"),
  stopRecording: () => ipcRenderer.send("stop-recording"),
  onRecordingFinished: (callback) =>
    ipcRenderer.on("recording-finished", callback),
  onCanvasCreate: (callback) => ipcRenderer.on("create-canvas", callback),
  onCanvasDestroy: (callback) => ipcRenderer.on("destroy-canvas", callback),
  toggleRecordButtons: (isRecording) => {
    const startBtn = document.getElementById("startBtn") as HTMLButtonElement
    const stopBtn = document.getElementById("stopBtn") as HTMLButtonElement

    startBtn.disabled = isRecording
    stopBtn.disabled = !isRecording
  },
}

contextBridge.exposeInMainWorld("electronAPI", electronAPI)

window.addEventListener("DOMContentLoaded", () => {
  const backdrop = document.querySelector(".page-backdrop")

  if (backdrop) {
    backdrop.addEventListener(
      "mouseenter",
      () => {
        console.log("backdrop mouseenter")
        ipcRenderer.send("set-ignore-mouse-events", true, { forward: true })
      },
      false
    )

    backdrop.addEventListener(
      "mouseleave",
      () => {
        console.log("backdrop mouseleave")
        ipcRenderer.send("set-ignore-mouse-events", false)
      },
      false
    )
  }
})
