import "./index.css"
import Konva from "konva"
import { Stage } from "konva/lib/Stage"

let stage: Stage

window.electronAPI.onCanvasCreate(() => {
  stage = new Konva.Stage({
    container: "container", // id of container <div>
    width: 500,
    height: 500,
  })

  // then create layer
  const layer = new Konva.Layer()

  // create our shape
  const circle = new Konva.Circle({
    x: stage.width() / 2,
    y: stage.height() / 2,
    radius: 70,
    fill: "red",
    stroke: "black",
    strokeWidth: 4,
  })

  // add the shape to the layer
  layer.add(circle)

  // add the layer to the stage
  stage.add(layer)

  // draw the image
  layer.draw()

  circle.on("mouseover", function () {
    document.body.style.cursor = "pointer"
  })
  circle.on("mouseout", function () {
    document.body.style.cursor = "default"
  })
})

window.electronAPI.onCanvasDestroy(() => {
  stage.destroy()
})

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
      startRecordTimer()
      window.electronAPI.toggleRecordButtons(true)
    })
    .catch((e) => console.log(e))
})

stopBtn.addEventListener("click", () => {
  // window.electronAPI.stopRecording();

  console.log("Stopped")

  // Stop recording
  if (mediaRecorder) {
    mediaRecorder.stop()
    stopRecordTimer()
    window.electronAPI.toggleRecordButtons(false)
  }
})

// window.electronAPI.onRecordingFinished((event, filePath) => {
//   console.log('Recording finished:', filePath);
// });
