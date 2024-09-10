import { StreamSettings } from "./helpers/types"
import Moveable, { MoveableRefTargetType } from "moveable"

const videoContainer = document.getElementById(
  "webcamera-view"
) as HTMLDivElement
const videoContainerError = videoContainer.querySelector(
  ".webcamera-view-no-device"
) as HTMLDivElement
const videoContainerPermissionError = videoContainer.querySelector(
  ".webcamera-view-no-permission"
) as HTMLDivElement
const video = document.getElementById("video") as HTMLVideoElement
const changeCameraViewSizeBtn = document.querySelectorAll(
  ".js-camera-view-size"
)

let currentStream: MediaStream
let moveable: Moveable

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

changeCameraViewSizeBtn.forEach((button) => {
  button.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLElement
      const size = target.dataset.size
      const container = document.querySelector(".webcamera-view-container")
      container.classList.remove("sm", "lg", "xl")
      container.classList.add(size)

      if (moveable) {
        moveable.updateRect()
      }
    },
    false
  )
})

function initMovable() {
  moveable = new Moveable(document.body, {
    target: videoContainer as MoveableRefTargetType,
    container: document.body,
    className: "moveable-invisible-container",
    draggable: true,
  })

  moveable
    .on("dragStart", ({ target, clientX, clientY }) => {
      target.classList.add("moveable-dragging")
    })
    .on("drag", ({ target, left, top }) => {
      target!.style.left = `${left}px`
      target!.style.top = `${top}px`
    })
    .on("dragEnd", ({ target, isDrag, clientX, clientY }) => {
      target.classList.remove("moveable-dragging")
    })
}
initMovable()

function showVideo(hasError?: boolean, errorType?: "no-permission") {
  video.srcObject = currentStream
  videoContainer.removeAttribute("hidden")

  if (hasError) {
    if (errorType == "no-permission") {
      videoContainerPermissionError.removeAttribute("hidden")
    } else {
      videoContainerError.removeAttribute("hidden")
    }
  } else {
    videoContainerError.setAttribute("hidden", "")
    videoContainerPermissionError.setAttribute("hidden", "")
  }
}

function startStream(deviseId) {
  if (!moveable) {
    initMovable()
  }

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
      .catch((e) => {
        if (e.toString().toLowerCase().includes("permission denied")) {
          showVideo(true, "no-permission")
        } else {
          showVideo(true)
        }
      })
  } else {
    showVideo()
  }
}

function stopStream() {
  videoContainer.setAttribute("hidden", "")
  videoContainerError.setAttribute("hidden", "")
  videoContainerPermissionError.setAttribute("hidden", "")

  if (currentStream) {
    const tracks = currentStream.getTracks()
    tracks.forEach((track) => track.stop())
    video.srcObject = null
    currentStream = null
  }

  if (moveable) {
    moveable.destroy()
    moveable = undefined
  }
}
