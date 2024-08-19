;(function () {
  const cameraSelect = document.getElementById(
    "cameraSelect"
  ) as HTMLSelectElement
  const video = document.getElementById("video") as HTMLVideoElement
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

  async function getCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = devices.filter(
      (device) => device.kind === "videoinput"
    )

    videoDevices.forEach((device) => {
      const option = document.createElement("option")
      option.value = device.deviceId
      option.text = device.label || `Camera ${cameraSelect.length + 1}`
      cameraSelect.appendChild(option)
    })
  }

  cameraSelect.addEventListener("change", (event) => {
    selectedDeviceId = (event.target as HTMLSelectElement).value
    if (selectedDeviceId.length > 0) {
      startVideo(selectedDeviceId)
      startRecordBtn.disabled = false
    } else {
      stopVideo()
      startRecordBtn.disabled = true
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

  function startVideo(deviseId) {
    const constraints = {
      video: { deviceId: { exact: deviseId } },
    }

    const media = navigator.mediaDevices.getUserMedia(constraints)

    media
      .then((stream) => {
        currentStream = stream
        video.srcObject = stream
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
    video.srcObject = null
    currentStream = null
  }

  getCameras()
})()
