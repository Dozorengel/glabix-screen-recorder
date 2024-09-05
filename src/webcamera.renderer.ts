import { StreamSettings } from "./helpers/types"
import Moveable, { MoveableRefTargetType } from "moveable"

const videoContainer = document.getElementById(
  "webcamera-view"
) as HTMLDivElement
const videoContainerError = videoContainer.querySelector(
  ".webcamera-view-no-device"
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
      // console.log("onDragStart", target)
    })
    .on("drag", ({ target, left, top }) => {
      target!.style.left = `${left}px`
      target!.style.top = `${top}px`
    })
    .on("dragEnd", ({ target, isDrag, clientX, clientY }) => {
      target.classList.remove("moveable-dragging")
      console.log("onDragEnd", target, isDrag)
    })
}
initMovable()

function showVideo(hasError?: boolean) {
  video.srcObject = currentStream
  videoContainer.removeAttribute("hidden")

  if (hasError) {
    videoContainerError.removeAttribute("hidden")
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
        showVideo()
      })
  } else {
    showVideo()
  }
}

function stopStream() {
  if (currentStream) {
    const tracks = currentStream.getTracks()
    tracks.forEach((track) => track.stop())
    video.srcObject = null
    videoContainer.setAttribute("hidden", "")
    videoContainerError.setAttribute("hidden", "")
    currentStream = null
  }

  if (moveable) {
    moveable.destroy()
    moveable = undefined
  }
}
