import { contextBridge, ipcRenderer } from "electron"
let isIgnoreMouseEventsFreeze = false
// rename "electronAPI" ? to more suitable
export const electronAPI = {
  setIgnoreMouseEvents: (flag: boolean) => {
    if (!flag) {
      isIgnoreMouseEventsFreeze = true
      ipcRenderer.send("set-ignore-mouse-events", false)
    } else {
      isIgnoreMouseEventsFreeze = false
      ipcRenderer.send("set-ignore-mouse-events", true, { forward: true })
    }
  },
  startRecording: () => ipcRenderer.send("start-recording"),
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

export const envVars = {
  API_PATH: { ...process }.env.API_PATH, // hack with spread operator because I can't find who is rewriting the precession object
  AUTH_APP_URL: { ...process }.env.AUTH_APP_URL,
}
contextBridge.exposeInMainWorld("envVars", envVars)

window.addEventListener("DOMContentLoaded", () => {
  const backdrop = document.querySelector(".page-backdrop")

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

  // document.body.addEventListener('mouseover', (event) => {
  //   const target = event.target as HTMLElement
  //   const isClickable = target.classList.contains('clickable') || Boolean(target.closest('.clickable'))

  //   console.log('isClickable', isClickable)

  //   if (isClickable && !isIgnoreMouseEventsFreeze) {
  //     ipcRenderer.send("set-ignore-mouse-events", true, { forward: true })
  //   } else {
  //     ipcRenderer.send("set-ignore-mouse-events", false)
  //   }
  // }, false)

  // const interactiveElements = document.querySelectorAll(".clickable")

  // console.log('interactiveElements', interactiveElements)

  // interactiveElements.forEach((element) => {
  //   element.addEventListener("mouseenter", () => {
  //     if (!isIgnoreMouseEventsFreeze) {
  //       console.log("Mouse enter")
  //       isMouseOverInteractiveElement = true
  //       ipcRenderer.send("set-ignore-mouse-events", false)
  //     }
  //   })

  //   element.addEventListener("mouseleave", () => {
  //     if (!isIgnoreMouseEventsFreeze) {
  //       console.log("Mouse leave")
  //       isMouseOverInteractiveElement = false
  //       ipcRenderer.send("set-ignore-mouse-events", true, { forward: true })
  //     }
  //   })
  // })
})
