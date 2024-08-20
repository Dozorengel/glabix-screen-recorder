;(function () {
  const cameraSelect = document.getElementById(
    "cameraSelect"
  ) as HTMLSelectElement
  const webcamRound = document.getElementById(
    "webcam-round"
  ) as HTMLVideoElement
  const webcamSquare = document.getElementById(
    "webcam-square"
  ) as HTMLVideoElement
  const cameraOnlyBtn = document.getElementById(
    "cameraOnlyBtn"
  ) as HTMLButtonElement
  const stopCameraOnlyBtn = document.getElementById(
    "stopCameraOnlyBtn"
  ) as HTMLButtonElement
  const startRecordBtn = document.getElementById(
    "startWebcameraRecordBtn"
  ) as HTMLButtonElement
  const stopRecordBtn = document.getElementById(
    "stopWebcameraRecordBtn"
  ) as HTMLButtonElement

  let currentStream
  let recordedChunks: Blob[] = []
  let mediaRecorder: MediaRecorder
  let selectedDeviceId

  // move to global state, is Camera only
  let isCamOnly: Boolean

  async function getCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices()

    const webcamRoundDevices = devices.filter(
      (device) => device.kind === "videoinput"
    )

    webcamRoundDevices.forEach((device) => {
      const option = document.createElement("option")
      option.value = device.deviceId
      option.text = device.label || `Camera ${cameraSelect.length + 1}`
      cameraSelect.appendChild(option)
    })
  }

  cameraOnlyBtn.addEventListener("click", () => {
    if (currentStream) {
      isCamOnly = true

      switchCameraView(isCamOnly)

      if (selectedDeviceId.length > 0) {
        startVideo(selectedDeviceId, isCamOnly)
        startRecordBtn.disabled = false
      } else {
        stopVideo()
        startRecordBtn.disabled = true
      }
    } else {
      console.log("Choose webcamera")
    }
  })

  stopCameraOnlyBtn.addEventListener("click", () => {
    console.log("Cam only stoppped")
    switchCameraView(!isCamOnly)
  })

  cameraSelect.addEventListener("change", (event) => {
    selectedDeviceId = (event.target as HTMLSelectElement).value
    if (selectedDeviceId.length > 0) {
      switchCameraView(isCamOnly)
      startVideo(selectedDeviceId, isCamOnly)
    } else {
      stopVideo()
      isCamOnly = false
    }
  })

  startRecordBtn.addEventListener("click", () => {
    if (currentStream) {
      console.log("Started webcamera record")
      startRecordWebcam(currentStream)
      window.electronAPI.toggleWebcamButtons(
        true,
        startRecordBtn,
        stopRecordBtn,
        cameraSelect
      )
    } else {
      console.log("No device selected")
    }
  })

  stopRecordBtn.addEventListener("click", () => {
    if (mediaRecorder) {
      console.log("Stopped webcamera record")
      mediaRecorder.stop()
      window.electronAPI.toggleWebcamButtons(
        false,
        startRecordBtn,
        stopRecordBtn,
        cameraSelect
      )
    } else {
      console.log("No device selected")
    }
  })

  function switchCameraView(isCamOnly) {
    if (isCamOnly) {
      webcamRound.classList.add("hidden")
      webcamSquare.classList.remove("hidden")
      webcamSquare.srcObject = currentStream
    } else {
      webcamRound.classList.remove("hidden")
      webcamSquare.classList.add("hidden")
      webcamRound.srcObject = currentStream
    }
  }

  function startVideo(deviseId, isCamOnly) {
    const constraints = {
      video: { deviceId: { exact: deviseId } },
    }

    const media = navigator.mediaDevices.getUserMedia(constraints)

    media
      .then((stream) => {
        currentStream = stream
        switchCameraView(isCamOnly)
      })
      .catch((e) => console.log(e))
  }

  function startRecordWebcam(stream) {
    mediaRecorder = new MediaRecorder(stream)

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data)
      }
    }

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
  }

  function stopVideo() {
    const tracks = currentStream.getTracks()
    tracks.forEach((track) => track.stop())
    webcamRound.classList.add("hidden")
    webcamRound.srcObject = null
    webcamSquare.classList.add("hidden")
    webcamSquare.srcObject = null
    currentStream = null
  }

  getCameras()
})()
