import Moveable, { MoveableRefTargetType } from "moveable"
import { destroyCanvas } from "./renderer"
import { getMediaPermission } from "./helpers/media-permissions"
import { ScreenAction, StreamSettings } from "./helpers/types"
;(function () {
  // const getScreenAreaBtn = document.getElementById(
  //   "getScreenAreaBtn"
  // ) as HTMLButtonElement
  const startScreenAreaBtn = document.getElementById(
    "startScreenAreaBtn"
  ) as HTMLButtonElement
  const stopScreenAreaBtn = document.getElementById(
    "stopScreenAreaBtn"
  ) as HTMLButtonElement
  let videoRecorder: MediaRecorder
  let audioRecorder: MediaRecorder
  let audioDevicesList: MediaDeviceInfo[] = []
  let activeAudioDevice: MediaDeviceInfo
  let videoDevicesList: MediaDeviceInfo[] = []
  let moveable: Moveable

  const devices = navigator.mediaDevices.enumerateDevices()
  devices.then((devicesInfo) => {
    audioDevicesList = devicesInfo.filter((d) => d.kind == "audioinput")
    activeAudioDevice = audioDevicesList.length
      ? audioDevicesList[0]
      : undefined
    videoDevicesList = devicesInfo.filter((d) => d.kind == "videoinput")
    console.log(
      "devicesInfo",
      devicesInfo,
      audioDevicesList,
      videoDevicesList,
      activeAudioDevice
    )
  })

  // const setButtonsState = (activeState) => {
  //   const buttons = [getScreenAreaBtn, startScreenAreaBtn]
  //   buttons.forEach((button) => {
  //     if (activeState == "cropScreen") {
  //       button.disabled = button.id == "startScreenAreaBtn" ? false : true
  //     }
  //     // if (activeState == "start") {
  //     //   button.disabled = button.id == "stopScreenAreaBtn" ? false : true
  //     // }
  //     if (activeState == "stop") {
  //       button.disabled = button.id == "getScreenAreaBtn" ? false : true
  //     }
  //   })
  // }

  // getScreenAreaBtn.addEventListener("click", () => {
  //   window.electronAPI.setIgnoreMouseEvents(false)
  //   setButtonsState("cropScreen")
  //   createCanvas()
  //   const screen = document.getElementById("__screen__")
  //   moveable = new Moveable(document.body, {
  //     target: screen as MoveableRefTargetType,
  //     // If the container is null, the position is fixed. (default: parentElement(document.body))
  //     container: document.body,
  //     className: "clickable",
  //     preventClickDefault: true,
  //     draggable: true,
  //     resizable: true,
  //     scalable: false,
  //     rotatable: false,
  //     warpable: false,
  //     // Enabling pinchable lets you use events that
  //     // can be used in draggable, resizable, scalable, and rotateable.
  //     pinchable: false, // ["resizable", "scalable", "rotatable"]
  //     origin: true,
  //     keepRatio: true,
  //     // Resize, Scale Events at edges.
  //     edge: false,
  //     throttleDrag: 0,
  //     throttleResize: 0,
  //     throttleScale: 0,
  //     throttleRotate: 0,
  //   })

  //   moveable
  //     .on("dragStart", ({ target, clientX, clientY }) => {
  //       console.log("onDragStart", target)
  //     })
  //     .on(
  //       "drag",
  //       ({
  //         target,
  //         transform,
  //         left,
  //         top,
  //         right,
  //         bottom,
  //         beforeDelta,
  //         beforeDist,
  //         delta,
  //         dist,
  //         clientX,
  //         clientY,
  //       }) => {
  //         console.log("onDrag left, top", left, top)
  //         target!.style.left = `${left}px`
  //         target!.style.top = `${top}px`
  //         // console.log("onDrag translate", dist);
  //         // target!.style.transform = transform;
  //       }
  //     )
  //     .on("dragEnd", ({ target, isDrag, clientX, clientY }) => {
  //       console.log("onDragEnd", target, isDrag)
  //     })

  //   /* resizable */
  //   moveable
  //     .on("resizeStart", ({ target, clientX, clientY }) => {
  //       console.log("onResizeStart", target)
  //     })
  //     .on(
  //       "resize",
  //       ({ target, width, height, dist, delta, clientX, clientY }) => {
  //         console.log("onResize", target)
  //         delta[0] && (target!.style.width = `${width}px`)
  //         delta[1] && (target!.style.height = `${height}px`)
  //         const canvasVideo = document.getElementById(
  //           "__screen_canvas__"
  //         ) as HTMLCanvasElement
  //         canvasVideo.width = width
  //         canvasVideo.height = height
  //       }
  //     )
  //     .on("resizeEnd", ({ target, isDrag, clientX, clientY }) => {
  //       console.log("onResizeEnd", target, isDrag)
  //     })
  // })

  stopScreenAreaBtn.addEventListener("click", () => {
    // setButtonsState("stop")

    if (moveable) {
      moveable.destroy()
      moveable = undefined
    }

    if (videoRecorder) {
      videoRecorder.stop()
      videoRecorder = undefined
    }

    destroyCanvas()
  })

  // startScreenAreaBtn.addEventListener("click", async () => {
  //   // window.electronAPI.setIgnoreMouseEvents(true)
  //   const screen = document.getElementById("__screen__")
  //   screen.style.cssText = `pointer-events: none; ${screen.style.cssText} outline: 2px solid red;`
  //   console.log("screen", screen)

  //   const screenMove = moveable.getControlBoxElement()
  //   screenMove.style.cssText = `pointer-events: none; opacity: 0; ${screenMove.style.cssText}`

  //   setButtonsState("start")

  //   const videoStream = await navigator.mediaDevices.getDisplayMedia({
  //     video: true,
  //   })
  //   const audioStream = await navigator.mediaDevices.getUserMedia({
  //     audio: {
  //       deviceId: activeAudioDevice.deviceId,
  //       echoCancellation: true,
  //       noiseSuppression: true,
  //       sampleRate: 44100,
  //     },
  //     video: false,
  //   })

  //   const combinedStream = new MediaStream([
  //     ...videoStream.getVideoTracks(),
  //     ...audioStream.getAudioTracks(),
  //   ])

  //   const canvas = document.getElementById("__screen_canvas__")
  //   createVideo(combinedStream, canvas)

  //   // navigator.mediaDevices.getDisplayMedia({ video: true }).then((stream) => {
  //   // })
  // })

  const initStream = async (settings: StreamSettings): Promise<MediaStream> => {
    let videoStream: MediaStream
    let audioStream: MediaStream

    if (settings.action == "fullScreenVideo") {
      videoStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      })

      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: settings.audioDeviseId,
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
        video: false,
      })
    }

    if (settings.action == "cropVideo") {
      videoStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      })

      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: settings.audioDeviseId,
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
        video: false,
      })
    }

    const combinedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...audioStream.getAudioTracks(),
    ])

    return combinedStream
  }

  const createCanvas = () => {
    // Создание видимого поля для иллюстрации захвата области экрана
    const screen = document.createElement("div")
    screen.id = "__screen__"
    screen.classList.add("clickable")
    screen.style.cssText =
      "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 640px; height: 480px; outline: solid 2px #4af; outline-offset: 2px;"
    document.body.appendChild(screen)

    // Создание canvas для захвата области экрана
    const canvasPosition = screen.getBoundingClientRect()
    const canvas = document.createElement("canvas")
    canvas.id = "__screen_canvas__"
    canvas.style.cssText = `
      position: absolute; 
      top: 0; 
      left: 0; 
      width: 100%; 
      height: 100%; 
      opacity: 0; 
      z-index: 99999;
      outline: solid 2px red;
    `

    // Установка размеров canvas
    canvas.width = canvasPosition.width // ширина захваченной области
    canvas.height = canvasPosition.height // высота захваченной области
    screen.appendChild(canvas)

    return canvas
  }

  const createVideo = (_stream, _canvas) => {
    const stream = _canvas
      ? new MediaStream([
          ..._canvas.captureStream().getVideoTracks(),
          ..._stream.getAudioTracks(),
        ])
      : _stream
    videoRecorder = new MediaRecorder(stream)
    let chunks = []

    if (_canvas) {
      const canvasPosition = document
        .getElementById("__screen__")
        .getBoundingClientRect()
      const canvasVideo = document.createElement("video")
      canvasVideo.id = "__canvas_video_stream__"
      canvasVideo.srcObject = new MediaStream([..._stream.getVideoTracks()])
      canvasVideo.play()

      // Координаты области экрана для захвата
      const ctx = _canvas.getContext("2d")
      const captureX = canvasPosition.left
      const captureY = canvasPosition.top
      const captureWidth = canvasPosition.width
      const captureHeight = canvasPosition.height

      // Обновление canvas с захваченной областью экрана
      function updateCanvas() {
        ctx.drawImage(
          canvasVideo,
          captureX,
          captureY,
          captureWidth,
          captureHeight,
          0,
          0,
          canvasPosition.width,
          canvasPosition.height
        )
        requestAnimationFrame(updateCanvas)
      }

      updateCanvas()
    }

    videoRecorder.onpause = function (e) {
      console.log("stream pause")
    }

    videoRecorder.onstart = function (e) {
      // chrome.storage.local.set({ streamState: 'STARTED' })
    }

    videoRecorder.ondataavailable = function (e) {
      chunks.push(e.data)
    }

    videoRecorder.onstop = async function (e) {
      const blob = new Blob(chunks, { type: "video/webm" })
      chunks = [] // Reset the chunks for the next recording

      // Create a link to download the recorded video
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = "recorded-video.webm"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)

      stream.getTracks().forEach((track) => track.stop())
      if (_canvas) {
        _stream.getTracks().forEach((track) => track.stop())
      }

      const screenOverlay = document.getElementById("__screen__")
      const canvasVideo = document.getElementById("__canvas_video_stream__")

      if (screenOverlay) {
        screenOverlay.remove()
      }

      if (canvasVideo) {
        canvasVideo.remove()
      }
    }

    if (_canvas) {
      _stream.oninactive = () => {
        if (videoRecorder) {
          videoRecorder.stop()
        }
      }
    }

    videoRecorder.start()
  }

  window.electronAPI.ipcRenderer.on(
    "start-recording",
    (event, data: StreamSettings) => {
      if (data.action == "fullScreenVideo") {
        initStream(data).then((stream) => {
          createVideo(stream, undefined)
        })
      }

      if (data.action == "cropVideo") {
        createCanvas()
        const screen = document.getElementById("__screen__")
        moveable = new Moveable(document.body, {
          target: screen as MoveableRefTargetType,
          // If the container is null, the position is fixed. (default: parentElement(document.body))
          container: document.body,
          className: "clickable",
          preventClickDefault: true,
          draggable: true,
          resizable: true,
          scalable: false,
          rotatable: false,
          warpable: false,
          // Enabling pinchable lets you use events that
          // can be used in draggable, resizable, scalable, and rotateable.
          pinchable: false, // ["resizable", "scalable", "rotatable"]
          origin: true,
          keepRatio: true,
          // Resize, Scale Events at edges.
          edge: false,
          throttleDrag: 0,
          throttleResize: 0,
          throttleScale: 0,
          throttleRotate: 0,
        })

        moveable
          .on("dragStart", ({ target, clientX, clientY }) => {
            console.log("onDragStart", target)
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

        /* resizable */
        moveable
          .on("resizeStart", ({ target, clientX, clientY }) => {
            console.log("onResizeStart", target)
          })
          .on(
            "resize",
            ({ target, width, height, dist, delta, clientX, clientY }) => {
              console.log("onResize", target)
              delta[0] && (target!.style.width = `${width}px`)
              delta[1] && (target!.style.height = `${height}px`)
              const canvasVideo = document.getElementById(
                "__screen_canvas__"
              ) as HTMLCanvasElement
              canvasVideo.width = width
              canvasVideo.height = height
            }
          )
          .on("resizeEnd", ({ target, isDrag, clientX, clientY }) => {
            console.log("onResizeEnd", target, isDrag)
          })
        const startScreenAreaBtn = document.getElementById(
          "startScreenAreaBtn"
        ) as HTMLButtonElement
        startScreenAreaBtn.addEventListener(
          "click",
          () => {
            const screen = document.getElementById("__screen__")
            screen.style.cssText = `pointer-events: none; ${screen.style.cssText} outline: 2px solid red;`
            const screenMove = moveable.getControlBoxElement()
            screenMove.style.cssText = `pointer-events: none; opacity: 0; ${screenMove.style.cssText}`
            initStream(data).then((stream) => {
              const canvas = document.getElementById("__screen_canvas__")
              createVideo(stream, canvas)
            })
          },
          false
        )
      }

      console.log("Index Page start-recording", data.audioDeviseId)
    }
  )
})()
