;(function () {
  const cameraSelect = document.getElementById(
    "cameraSelect"
  ) as HTMLSelectElement
  const video = document.getElementById("video") as HTMLVideoElement

  let currentStream

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
    const selectedDeviceId = (event.target as HTMLSelectElement).value
    if (selectedDeviceId.length > 0) {
      startVideo(selectedDeviceId)
    } else {
      stopVideo()
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

  function stopVideo() {
    const tracks = currentStream.getTracks()
    tracks.forEach((track) => track.stop())
    video.srcObject = null
    currentStream = null
  }

  getCameras()
})()
