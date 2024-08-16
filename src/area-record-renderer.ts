import Moveable, { MoveableRefTargetType } from "moveable"
import { destroyCanvas } from "./renderer"
;(function () {
  const getScreenAreaBtn = document.getElementById(
    "getScreenAreaBtn"
  ) as HTMLButtonElement
  const startScreenAreaBtn = document.getElementById(
    "startScreenAreaBtn"
  ) as HTMLButtonElement
  const stopScreenAreaBtn = document.getElementById(
    "stopScreenAreaBtn"
  ) as HTMLButtonElement
  let mediaRecorder: MediaRecorder
  let moveable: Moveable

  const setButtonsState = (activeState) => {
    const buttons = [getScreenAreaBtn, startScreenAreaBtn, stopScreenAreaBtn]
    buttons.forEach((button) => {
      if (activeState == "cropScreen") {
        button.disabled = button.id == "startScreenAreaBtn" ? false : true
      }
      if (activeState == "start") {
        button.disabled = button.id == "stopScreenAreaBtn" ? false : true
      }
      if (activeState == "stop") {
        button.disabled = button.id == "getScreenAreaBtn" ? false : true
      }
    })
  }

  getScreenAreaBtn.addEventListener("click", () => {
    window.electronAPI.setIgnoreMouseEvents(false)
    setButtonsState("cropScreen")
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
  })

  stopScreenAreaBtn.addEventListener("click", () => {
    setButtonsState("stop")

    if (moveable) {
      moveable.destroy()
    }

    if (mediaRecorder) {
      mediaRecorder.stop()
      mediaRecorder = undefined
    }

    destroyCanvas()
  })

  startScreenAreaBtn.addEventListener("click", () => {
    // window.electronAPI.setIgnoreMouseEvents(true)
    const screen = document.getElementById("__screen__")
    screen.style.cssText = `pointer-events: none; ${screen.style.cssText} outline: 2px solid red;`
    console.log("screen", screen)

    const screenMove = moveable.getControlBoxElement()
    screenMove.style.cssText = `pointer-events: none; opacity: 0; ${screenMove.style.cssText}`

    setButtonsState("start")
    navigator.mediaDevices.getDisplayMedia({ video: true }).then((stream) => {
      const canvas = document.getElementById("__screen_canvas__")
      createVideo(stream, canvas)
    })
  })

  const fetchBlob = async (url) => {
    const response = await fetch(url)
    const blob = await response.blob()
    const base64 = await convertBlobToBase64(blob)

    return base64
  }

  const convertBlobToBase64 = (blob) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.readAsDataURL(blob)
      reader.onloadend = () => {
        const base64data = reader.result

        resolve(base64data)
      }
    })
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
    const stream = _canvas ? _canvas.captureStream() : _stream
    console.log("_canvas", _canvas)
    mediaRecorder = new MediaRecorder(stream)
    let chunks = []

    if (_canvas) {
      const canvasPosition = document
        .getElementById("__screen__")
        .getBoundingClientRect()
      const canvasVideo = document.createElement("video")
      canvasVideo.id = "__canvas_video_stream__"
      canvasVideo.srcObject = _stream
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

    mediaRecorder.onpause = function (e) {
      console.log("stream pause")
    }

    mediaRecorder.onstart = function (e) {
      // chrome.storage.local.set({ streamState: 'STARTED' })
    }

    mediaRecorder.ondataavailable = function (e) {
      chunks.push(e.data)
    }

    mediaRecorder.onstop = async function (e) {
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

      // chrome.storage.local.set({ streamState: 'STOPPED' })
      // const blobFile = new Blob(chunks, { type: 'video/webm' })
      // const base64 = await fetchBlob(URL.createObjectURL(blobFile))
      // const downloadLink = document.createElement('a')
      // downloadLink.innerText = 'Скачать'
      // downloadLink.style.cssText = 'display: inline-block; color: #fff; background-color: #009966;height: 2rem; text-transform: uppercase; border-radius: .25rem; padding: .5rem; font-size: 12px; line-height: 16px;'
      // downloadLink.href = `${base64}`
      // downloadLink.download = 'Без названия.webm'

      // const video = document.createElement('video')
      // video.src = `${base64}`
      // video.controls = true
      // video.autoplay = true
      // video.style.cssText = 'width: 100%; height: 100%; max-width: 600px; max-height: 600px;'

      // const overlay = document.createElement('div')
      // overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; backdrop-filter: blur(5px); z-index: 9999999; display: flex; justify-content: center; align-items: center; flex-direction: column; gap: 20px;box-shadow: rgba(0, 0, 0, 0.2) 0px 0px 0px 9999px;'
      // overlay.id = '__overlay__'
      // overlay.appendChild(video)
      // overlay.appendChild(downloadLink)

      // overlay.addEventListener('click', (event) => {
      //   const target = event.target as HTMLElement
      //   if (target.id == '__overlay__') {
      //     overlay.remove()
      //   }
      // }, false)

      // document.body.appendChild(overlay)

      // const stopBtn = document.getElementById('stopVideoButton')
      // const screen = document.getElementById('__screen__')
      // const screenCanvas = document.getElementById('__screen_canvas__')

      // if (stopBtn) {
      //   stopBtn.remove()
      // }
      // if (screenCanvas) {
      //   screenCanvas.remove()
      // }
      // if (screen) {
      //   screen.remove()
      // }

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
        if (mediaRecorder) {
          mediaRecorder.stop()
        }
      }
    }

    mediaRecorder.start()
  }

  // chrome.runtime.onMessage.addListener((request) => {
  //   if (request.name === 'streamCanvasRecording') {
  //   }

  // if (request.name === 'streamRecording') {
  //   navigator.mediaDevices.getUserMedia({
  //     audio: false,
  //     video: {
  //       mandatory: {
  //         chromeMediaSource: 'desktop',
  //         chromeMediaSourceId: request.streamId,
  //       },
  //     },
  //   })
  //   .then((stream) => {
  //     createVideo(stream)
  //   })
  //   .finally(() => {
  //   })
  // }

  // if (request.name == 'endedRecording') {
  //   console.log('endedRecording', request.body.base64)
  //   // Create a new video element and show it in an overlay div (a lot of styles just for fun)

  // }

  // })
})()
