import "./index.css"
import { Canvas, Rect } from "fabric"

let canvas: Canvas

window.electronAPI.onCanvasCreate(() => {
  canvas = new Canvas("canvas")
  const rect = new Rect({
    top: 0,
    left: 0,
    width: 60,
    height: 70,
    fill: "red",
  })
  canvas.add(rect)
})

window.electronAPI.onCanvasDestroy(() => {
  canvas.dispose()
})

const startBtn = document.getElementById("startBtn")
const stopBtn = document.getElementById("stopBtn")

let mediaRecorder: MediaRecorder
let recordedChunks: Blob[] = []
// let width: number
// let height: number

startBtn.addEventListener("click", () => {
  // window.electronAPI.startRecording();
  // const resolution = await window.electronAPI.resolution()
  // width = resolution.width
  // height = resolution.height

  // return
  console.log("Btn clicked")

  // Web Camera
  // const media2 = navigator.mediaDevices.getUserMedia({ video: true })

  // console.log(media2)

  const media = navigator.mediaDevices.getDisplayMedia({
    audio: false,
    video: true,
    // video: {
    //   width,
    //   height,
    //   frameRate: 30,
    // },
  })

  console.log(media)

  media
    .then((stream) => {
      console.log("Stream")

      // Initialize MediaRecorder
      mediaRecorder = new MediaRecorder(stream)

      // Event handler for dataavailable event
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data)
        }
      }

      // When recording is stopped, create a blob and save it
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: "video/webm" })
        recordedChunks = [] // Reset the chunks for the next recording

        // Create a link to download the recorded video
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.style.display = "none"
        a.href = url
        a.download = "recorded-video.webm"
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      }

      // Start recording
      mediaRecorder.start()
    })
    .catch((e) => console.log(e))
})

stopBtn.addEventListener("click", () => {
  // window.electronAPI.stopRecording();

  console.log("Stopped")

  // Stop recording
  if (mediaRecorder) {
    mediaRecorder.stop()
  }
})

// window.electronAPI.onRecordingFinished((event, filePath) => {
//   console.log('Recording finished:', filePath);
// });
