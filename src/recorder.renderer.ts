import Moveable, { MoveableRefTargetType } from "moveable"
import { ScreenAction, StreamSettings } from "./helpers/types"
import { ChunkSlicer } from "./file-uploader/chunk-slicer"
import { FileUploadEvents } from "./events/file-upload.events"
;(function () {
  const stopScreenAreaBtn = document.getElementById(
    "stopScreenAreaBtn"
  ) as HTMLButtonElement
  const changeCameraOnlySizeBtn = document.querySelectorAll(
    ".js-camera-only-size"
  )
  let lastScreenAction: ScreenAction = "fullScreenVideo"
  let videoRecorder: MediaRecorder
  let cropMoveable: Moveable
  let cameraMoveable: Moveable

  changeCameraOnlySizeBtn.forEach((button) => {
    button.addEventListener(
      "click",
      (event) => {
        const target = event.target as HTMLElement
        const size = target.dataset.size
        const container = document.querySelector(".webcamera-only-container")
        container.classList.remove("sm", "lg", "xl")
        container.classList.add(size)

        if (cameraMoveable) {
          cameraMoveable.updateRect()
        }
      },
      false
    )
  })

  stopScreenAreaBtn.addEventListener("click", () => {
    if (videoRecorder) {
      videoRecorder.stop()
      videoRecorder = undefined

      clearView()
    }
  })

  const initStream = async (settings: StreamSettings): Promise<MediaStream> => {
    let videoStream: MediaStream = new MediaStream()
    let audioStream: MediaStream = new MediaStream()

    if (settings.audioDeviceId) {
      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: settings.audioDeviceId,
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
        video: false,
      })
    }

    if (settings.action == "fullScreenVideo") {
      videoStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      })
    }

    if (settings.action == "cropVideo") {
      videoStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      })
    }

    if (settings.action == "cameraOnly" && settings.cameraDeviceId) {
      videoStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: settings.cameraDeviceId } },
      })
    }

    const combinedStream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...audioStream.getAudioTracks(),
    ])

    return combinedStream
  }

  const createVideo = (_stream, _canvas, _video) => {
    const stream = _canvas
      ? new MediaStream([
          ..._canvas.captureStream(30).getVideoTracks(),
          ..._stream.getAudioTracks(),
        ])
      : _stream
    videoRecorder = new MediaRecorder(stream)
    let chunks = []

    if (_video) {
      _video.srcObject = new MediaStream([..._stream.getVideoTracks()])

      if (_stream.getVideoTracks()[0]) {
        const stream_settings = _stream.getVideoTracks()[0].getSettings()
        console.log("stream_settings", stream_settings)
      }
    }

    if (_canvas) {
      const canvasVideo = document.createElement("video")
      canvasVideo.id = "__canvas_video_stream__"
      canvasVideo.style.cssText = `pointer-events: none; opacity: 0;`
      canvasVideo.srcObject = new MediaStream([..._stream.getVideoTracks()])
      document.body.appendChild(canvasVideo)
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

    videoRecorder.onstop = function (e) {
      const blob = new Blob(chunks, { type: "video/webm" })
      chunks = [] // Reset the chunks for the next recording

      const reader = new FileReader()
      reader.onload = function () {
        const arrayBuffer = reader.result

        window.electronAPI.ipcRenderer.send(
          FileUploadEvents.FILE_CREATED,
          arrayBuffer
        )
      }
      reader.readAsArrayBuffer(blob)

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
      if (screenOverlay) {
        screenOverlay.remove()
      }

      const canvasVideo = document.getElementById("__canvas_video_stream__")
      if (canvasVideo) {
        canvasVideo.remove()
      }

      if (_video) {
        const videoContainer = document.querySelector(
          ".webcamera-only-container"
        )
        videoContainer.setAttribute("hidden", "")
        _video.srcObject = null
      }
    }

    if (_canvas) {
      _stream.oninactive = () => {
        if (videoRecorder) {
          videoRecorder.stop()
        }
      }
    }
  }

  const startRecording = () => {
    if (videoRecorder) {
      videoRecorder.start()
    }
  }

  const clearView = () => {
    // const screenOverlay = document.getElementById("__screen__")
    // if (screenOverlay) {
    //   screenOverlay.remove()
    // }

    const canvasVideo = document.getElementById("__canvas_video_stream__")
    if (canvasVideo) {
      canvasVideo.remove()
    }

    const videoContainer = document.querySelector(".webcamera-only-container")
    if (videoContainer) {
      videoContainer.setAttribute("hidden", "")
    }

    const screenContainer = document.querySelector(".crop-screen-container")
    if (screenContainer) {
      screenContainer.setAttribute("hidden", "")
    }

    if (cropMoveable) {
      cropMoveable.destroy()
      cropMoveable = undefined
    }

    if (cameraMoveable) {
      cameraMoveable.destroy()
      cameraMoveable = undefined
    }
  }

  const initView = (settings: StreamSettings) => {
    if (lastScreenAction == settings.action) {
      return
    }

    lastScreenAction = settings.action
    clearView()

    if (settings.action == "cameraOnly") {
      const videoContainer = document.querySelector(".webcamera-only-container")
      const video = document.querySelector(
        "#webcam_only_video"
      ) as HTMLVideoElement
      videoContainer.removeAttribute("hidden")
      const rect = videoContainer.getBoundingClientRect()
      video.width = rect.width
      video.height = rect.height

      cameraMoveable = new Moveable(document.body, {
        target: videoContainer as MoveableRefTargetType,
        container: document.body,
        className: "moveable-invisible-container",
        draggable: true,
      })

      cameraMoveable.on("drag", ({ target, left, top }) => {
        target!.style.left = `${left}px`
        target!.style.top = `${top}px`
      })
    }

    if (settings.action == "cropVideo") {
      const screenContainer = document.querySelector(".crop-screen-container")
      screenContainer.removeAttribute("hidden")
      const screen = screenContainer.querySelector("#crop_video_screen")
      const canvasVideo = screen.querySelector("canvas")
      canvasVideo.width = screen.getBoundingClientRect().width
      canvasVideo.height = screen.getBoundingClientRect().height

      cropMoveable = new Moveable(document.body, {
        target: screen as MoveableRefTargetType,
        container: document.body,
        className: "moveable-container",
        draggable: true,
        resizable: true,
      })

      cropMoveable.on("drag", ({ target, left, top }) => {
        target!.style.left = `${left}px`
        target!.style.top = `${top}px`
      })

      /* resizable */
      cropMoveable.on("resize", (data) => {
        const { target, width, height, drag } = data

        target.style.top = `${drag.top}px`
        target.style.left = `${drag.left}px`
        target.style.width = `${width}px`
        target.style.height = `${height}px`

        canvasVideo.width = width
        canvasVideo.height = height
      })

      cropMoveable.updateRect()
    }
  }

  window.electronAPI.ipcRenderer.on(
    "record-settings-change",
    (event, data: StreamSettings) => {
      initView(data)

      if (data.action == "fullScreenVideo") {
        initStream(data).then((stream) => {
          createVideo(stream, undefined, undefined)
        })
      }

      if (data.action == "cameraOnly") {
        const video = document.querySelector(
          "#webcam_only_video"
        ) as HTMLVideoElement
        initStream(data).then((stream) => {
          createVideo(stream, undefined, video)
        })
      }

      if (data.action == "cropVideo") {
        const canvas = document.querySelector("#crop_video_screen canvas")
        initStream(data).then((stream) => {
          createVideo(stream, canvas, undefined)
        })
      }
    }
  )

  window.electronAPI.ipcRenderer.on(
    "start-recording",
    (event, data: StreamSettings) => {
      if (data.action == "fullScreenVideo") {
        const countdownContainer = document.querySelector(
          ".fullscreen-countdown-container"
        )
        const countdown = document.querySelector("#fullscreen_countdown")
        countdownContainer.removeAttribute("hidden")
        let timeleft = 2
        const startTimer = setInterval(function () {
          if (timeleft <= 0) {
            clearInterval(startTimer)
            countdownContainer.setAttribute("hidden", "")
            countdown.innerHTML = ""
            setTimeout(() => {
              startRecording()
            }, 10)
          } else {
            countdown.innerHTML = `${timeleft}`
          }
          timeleft -= 1
        }, 1000)
      } else {
        if (data.action == "cropVideo") {
          const screen = document.querySelector(
            "#crop_video_screen"
          ) as HTMLElement
          screen.classList.add("is-recording")
          const screenMove = cropMoveable.getControlBoxElement()
          screenMove.style.cssText = `pointer-events: none; opacity: 0; ${screenMove.style.cssText}`

          const canvasVideo = document.querySelector(
            "#__canvas_video_stream__"
          ) as HTMLVideoElement
          canvasVideo.play()

          // Координаты области экрана для захвата
          const canvas = document.querySelector(
            "#crop_video_screen canvas"
          ) as HTMLCanvasElement
          const canvasPosition = canvas.getBoundingClientRect()
          const ctx = canvas.getContext("2d")
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

        startRecording()
      }
    }
  )
})()
