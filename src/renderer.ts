import { destroyCanvas } from "./draw.renderer"
import "./styles/index-page.scss"

const startBtn = document.getElementById("startBtn") as HTMLButtonElement
const stopBtn = document.getElementById("stopBtn") as HTMLButtonElement
const recordTimer = document.getElementById("recordTimer") as HTMLButtonElement

let mediaRecorder: MediaRecorder
let recordedChunks: Blob[] = []
let seconds: number = 0
let minutes: number = 0
let timerInterval // typescript
// let width: number
// let height: number

function startRecordTimer() {
  timerInterval = setInterval(() => {
    seconds++

    if (seconds >= 60) {
      seconds = 0
      minutes++
    }

    recordTimer.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }, 1000)
}

function stopRecordTimer() {
  clearInterval(timerInterval)
  seconds = 0
  minutes = 0
  recordTimer.textContent = "00:00"
}

// stopBtn.addEventListener("click", () => {
//   // window.electronAPI.stopRecording();

//   console.log("Stopped")

//   destroyCanvas()

//   // Stop recording
//   if (mediaRecorder) {
//     mediaRecorder.stop()
//     stopRecordTimer()
//     window.electronAPI.toggleRecordButtons(false)
//   }
// })

// window.electronAPI.onRecordingFinished((event, filePath) => {
//   console.log('Recording finished:', filePath);
// });
