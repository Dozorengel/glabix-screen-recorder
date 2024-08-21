import "./styles/modal-page.css"
import Moveable, { MoveableRefTargetType } from "moveable"
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
  let moveable: Moveable

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
    const button = clone.querySelector("button")
    button.textContent = device.label
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
          activeScreenAction = button.dataset.action as ScreenAction
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
    })
  })

  const startBtn = document.querySelector("#startBtn")
  startBtn.addEventListener(
    "click",
    () => {
      console.log("activeAudioDevice", activeAudioDevice, audioDevicesList)
      let streamSettings: StreamSettings = {
        action: activeScreenAction,
      }

      if (activeScreenAction == "fullScreenVideo") {
        streamSettings = {
          ...streamSettings,
          video: true,
          audioDeviseId: activeAudioDevice.deviceId,
        }
      }

      if (activeScreenAction == "cropVideo") {
        streamSettings = {
          ...streamSettings,
          video: true,
          audioDeviseId: activeAudioDevice.deviceId,
        }
      }

      if (activeScreenAction == "camera") {
        streamSettings = {
          ...streamSettings,
          cameraDeviceId: activeVideoDevice.deviceId,
          audioDeviseId: activeAudioDevice.deviceId,
        }
      }

      window.electronAPI.ipcRenderer.send("start-recording", streamSettings)
    },
    false
  )
})()
