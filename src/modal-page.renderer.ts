import "./styles/modal-page.scss"
import { getMediaPermission } from "./helpers/media-permissions"
import { ScreenAction, StreamSettings } from "./helpers/types"
;(function () {
  let videoRecorder: MediaRecorder
  let audioRecorder: MediaRecorder
  let audioDevicesList: MediaDeviceInfo[] = []
  let activeAudioDevice: MediaDeviceInfo
  let videoDevicesList: MediaDeviceInfo[] = []
  let activeVideoDevice: MediaDeviceInfo
  let activeScreenAction: ScreenAction = "fullScreenVideo"
  let streamSettings: StreamSettings = {
    action: activeScreenAction,
    video: true,
  }

  async function setupMediaPermissions() {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const cameraPermission = await getMediaPermission("camera")
    const microPermission = await getMediaPermission("microphone")

    audioDevicesList = devices.filter((d) => d.kind == "audioinput")
    activeAudioDevice = audioDevicesList.length
      ? audioDevicesList[0]
      : undefined
    videoDevicesList = devices.filter((d) => d.kind == "videoinput")
    activeVideoDevice = videoDevicesList.length
      ? videoDevicesList[0]
      : undefined

    // console.log(
    //   "devicesInfo",
    //   devices,
    //   audioDevicesList,
    //   videoDevicesList,
    //   activeAudioDevice,
    //   cameraPermission,
    //   microPermission
    // )
  }

  function renderDeviceButton(
    template: HTMLTemplateElement,
    device: MediaDeviceInfo
  ): HTMLElement {
    const clone = template.content.cloneNode(true) as HTMLElement
    const text = clone.querySelector("span")
    const checkbox = clone.querySelector(
      "input[type='checkbox']"
    ) as HTMLInputElement
    text.textContent = device.label
    checkbox.name =
      device.kind == "videoinput" ? "isVideoEnabled" : "isAudioEnabled"
    return clone
  }

  document.addEventListener("DOMContentLoaded", () => {
    const actionButtons = document.querySelectorAll(
      ".js-btn-action-type"
    ) as NodeListOf<HTMLElement>

    actionButtons.forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          actionButtons.forEach((btn) => {
            btn.classList.remove("hover")
          })
          button.classList.add("hover")
          const action = button.dataset.action as ScreenAction

          if (action != activeScreenAction) {
            activeScreenAction = button.dataset.action as ScreenAction
            streamSettings = { ...streamSettings, action: activeScreenAction }

            window.electronAPI.ipcRenderer.send(
              "record-settings-change",
              streamSettings
            )
          }
        },
        false
      )
    })

    setupMediaPermissions().then(() => {
      const mediaDeviceContainer = document.querySelector(
        "#media_device_container"
      )
      const mediaDeviceTpl = document.querySelector(
        "#media_device_tpl"
      ) as HTMLTemplateElement

      if (activeVideoDevice) {
        mediaDeviceContainer.appendChild(
          renderDeviceButton(mediaDeviceTpl, activeVideoDevice)
        )
      }

      if (activeAudioDevice) {
        mediaDeviceContainer.appendChild(
          renderDeviceButton(mediaDeviceTpl, activeAudioDevice)
        )
      }

      const checkboxes = document.querySelectorAll(".media-device-checkbox")
      checkboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
          const input = event.target as HTMLInputElement
          let options = {}

          if (input.name == "isVideoEnabled") {
            options = {
              cameraDeviceId: input.checked
                ? activeVideoDevice.deviceId
                : undefined,
            }
          }

          if (input.name == "isAudioEnabled") {
            options = {
              audioDeviceId: input.checked
                ? activeAudioDevice.deviceId
                : undefined,
            }
          }

          streamSettings = { ...streamSettings, ...options }
          window.electronAPI.ipcRenderer.send(
            "record-settings-change",
            streamSettings
          )
        })
      })
    })
  })

  const startBtn = document.querySelector("#startBtn")
  startBtn.addEventListener(
    "click",
    () => {
      if (streamSettings.action == "fullScreenVideo") {
        window.electronAPI.ipcRenderer.send(
          "record-settings-change",
          streamSettings
        )
      }

      window.electronAPI.ipcRenderer.send("start-recording", streamSettings)
    },
    false
  )
})()
