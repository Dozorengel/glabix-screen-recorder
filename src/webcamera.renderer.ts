import { StreamSettings } from "./helpers/types"
import Moveable, { MoveableRefTargetType } from "moveable"

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

smallSizeBtn.addEventListener("click", () => {
  isVideoBig = false
  toggleVideoSize()
})

bigSizeBtn.addEventListener("click", () => {
  isVideoBig = true
  toggleVideoSize()
})

function initMovable() {
  videoContainer.classList.add("clickable")

  moveable = new Moveable(document.body, {
    target: videoContainer as MoveableRefTargetType,
    // If the container is null, the position is fixed. (default: parentElement(document.body))
    container: document.body,
    className: "clickable",
    // preventClickDefault: true,
    draggable: true,
    // resizable: false,
    // scalable: false,
    // rotatable: false,
    // warpable: false,
    // // Enabling pinchable lets you use events that
    // // can be used in draggable, resizable, scalable, and rotateable.
    // pinchable: false, // ["resizable", "scalable", "rotatable"]
    // origin: true,
    // keepRatio: true,
    // // Resize, Scale Events at edges.
    // edge: false,
    // throttleDrag: 0,
    // throttleResize: 0,
    // throttleScale: 0,
    // throttleRotate: 0,
  })

  moveable
    .on("dragStart", ({ target, clientX, clientY }) => {
      // console.log("onDragStart", target)
    })
    .on(
      "drag",
      ({
        target,
        transform,
        left,
        top,
        right,
        bottom,
        beforeDelta,
        beforeDist,
        delta,
        dist,
        clientX,
        clientY,
      }) => {
        console.log("onDrag left, top", left, top)
        target!.style.left = `${left}px`
        target!.style.top = `${top}px`
        // console.log("onDrag translate", dist);
        // target!.style.transform = transform;
      }
    )
    .on("dragEnd", ({ target, isDrag, clientX, clientY }) => {
      console.log("onDragEnd", target, isDrag)
    })
}

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
      .catch((e) => console.log(e))
  } else {
    showVideo()
  }
}

function stopStream() {
  if (currentStream) {
    const tracks = currentStream.getTracks()
    tracks.forEach((track) => track.stop())
    video.srcObject = null
    videoContainer.classList.add("hidden")
    currentStream = null
  }

  if (moveable) {
    moveable.destroy()
    moveable = undefined
  }
}
