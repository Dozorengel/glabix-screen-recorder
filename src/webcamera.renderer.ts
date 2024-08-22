import { StreamSettings } from "./helpers/types"

const video = document.getElementById("video") as HTMLVideoElement
let currentStream

window.electronAPI.ipcRenderer.on(
  "record-settings-change",
  (event, data: StreamSettings) => {
    if (data.cameraDeviceId) {
      startStream(data.cameraDeviceId)
    } else {
      stopStream()
    }
  }
)

function startStream(deviseId) {
  const constraints = {
    video: { deviceId: { exact: deviseId } },
  }

  const media = navigator.mediaDevices.getUserMedia(constraints)

  media
    .then((stream) => {
      currentStream = stream
      video.srcObject = currentStream
    })
    .catch((e) => console.log(e))
}

function stopStream() {
  const tracks = currentStream.getTracks()
  tracks.forEach((track) => track.stop())
  video.srcObject = null
  currentStream = null
}
