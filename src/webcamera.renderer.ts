import { StreamSettings } from "./helpers/types"

const videoContainer = document.getElementById(
  "webcamera-view"
) as HTMLDivElement
const video = document.getElementById("video") as HTMLVideoElement
const smallSizeBtn = document.getElementById(
  "small-camera"
) as HTMLButtonElement
const bigSizeBtn = document.getElementById("big-camera") as HTMLButtonElement

let currentStream: MediaStream
let isVideoBig: Boolean

window.electronAPI.ipcRenderer.on(
  "record-settings-change",
  (event, data: StreamSettings) => {
    if (data.action == "cameraOnly") {
      stopStream()
      return
    }
    if (data.cameraDeviceId) {
      startStream(data.cameraDeviceId)
    } else {
      stopStream()
    }
  }
)

smallSizeBtn.addEventListener("click", () => {
  isVideoBig = false
  toggleVideoSize()
})

bigSizeBtn.addEventListener("click", () => {
  isVideoBig = true
  toggleVideoSize()
})

function toggleVideoSize() {
  if (isVideoBig) {
    video.classList.remove("webcamera-small")
    video.classList.add("webcamera-big")
  } else {
    video.classList.add("webcamera-small")
    video.classList.remove("webcamera-big")
  }
}

function showVideo() {
  video.srcObject = currentStream
  videoContainer.classList.remove("hidden")
}

function startStream(deviseId) {
  if (!currentStream) {
    const constraints = {
      video: { deviceId: { exact: deviseId } },
    }

    const media = navigator.mediaDevices.getUserMedia(constraints)

    media
      .then((stream) => {
        currentStream = stream
        showVideo()
      })
      .catch((e) => console.log(e))
  } else {
    showVideo()
  }
}

function stopStream() {
  const tracks = currentStream.getTracks()
  tracks.forEach((track) => track.stop())
  video.srcObject = null
  videoContainer.classList.add("hidden")
  currentStream = null
}
