import "./styles/modal-page.scss"
import { getMediaPermission } from "./helpers/media-permissions"
import {
  DropdownListType,
  IDropdownItem,
  IDropdownList,
  IDropdownPageData,
  IDropdownPageSelectData,
  IScreenActionItem,
  ScreenAction,
  SimpleStoreEvents,
  StreamSettings,
} from "./helpers/types"

;(function () {
  let openedDropdownType: DropdownListType | undefined = undefined
  const audioDeviceContainer = document.querySelector("#audio_device_container")
  const videoDeviceContainer = document.querySelector("#video_device_container")
  const screenActionsList: IDropdownItem[] = [
    {
      id: "fullScreenVideo",
      label: "Запись всего экрана",
      isSelected: true,
      extraData: {
        icon: "i-display",
      },
    },
    {
      id: "cropVideo",
      label: "Произвольная область",
      isSelected: false,
      extraData: {
        icon: "i-expand-wide",
      },
    },
    {
      id: "cameraOnly",
      label: "Только камера",
      isSelected: false,
      extraData: {
        icon: "i-video",
      },
    },
  ]
  let activeScreenActionItem: IDropdownItem = screenActionsList[0]
  let audioDevicesList: MediaDeviceInfo[] = []
  let activeAudioDevice: MediaDeviceInfo
  const noVideoDevice: MediaDeviceInfo = {
    deviceId: "no-camera",
    label: "Без камеры",
    kind: "videoinput",
    groupId: "",
    toJSON: () => {},
  }
  const noAudioDevice: MediaDeviceInfo = {
    deviceId: "no-microphone",
    label: "Без микрофона",
    kind: "audioinput",
    groupId: "",
    toJSON: () => {},
  }
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
    audioDevicesList = [noAudioDevice, ...audioDevicesList]
    activeAudioDevice = audioDevicesList[0]
    videoDevicesList = devices.filter((d) => d.kind == "videoinput")
    videoDevicesList = [noVideoDevice, ...videoDevicesList]
    activeVideoDevice = videoDevicesList[0]

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

  function renderScreenSettings(item: IDropdownItem) {
    const container = document.querySelector(
      "#screen_settings_container"
    ) as HTMLElement
    const template = document.querySelector(
      "#screen_settings_tpl"
    ) as HTMLTemplateElement

    const clone = template.content.cloneNode(true) as HTMLElement
    const btn = clone.querySelector("button")
    const text = clone.querySelector("span")
    const icon = clone.querySelector("i")

    btn.setAttribute("data-action", item.id)

    text.textContent = item.label

    if (item.extraData && item.extraData.icon) {
      if (["i-display", "i-expand-wide"].includes(item.extraData.icon)) {
        const i = document.createElement("div")
        i.classList.add("icon-dot", "i-br")
        icon.appendChild(i)
      }

      icon.classList.add(item.extraData.icon)
    }

    container.innerHTML = null
    container.appendChild(clone)
  }

  renderScreenSettings(activeScreenActionItem)

  function renderDeviceButton(device: MediaDeviceInfo): HTMLElement {
    const template = document.querySelector(
      "#media_device_tpl"
    ) as HTMLTemplateElement
    const clone = template.content.cloneNode(true) as HTMLElement
    const btn = clone.querySelector("button")
    const checkbox = clone.querySelector(
      "input[type='checkbox']"
    ) as HTMLInputElement
    const text = clone.querySelector("span")
    const icon = clone.querySelector("i")

    const btnClass =
      device.kind == "videoinput" ? "js-video-device" : "js-audio-device"
    const iconClass =
      device.kind == "videoinput"
        ? device.deviceId == "no-camera"
          ? "i-video-slash"
          : "i-video"
        : device.deviceId == "no-microphone"
          ? "i-microphone-slash"
          : "i-microphone"

    btn.classList.add(btnClass)
    text.textContent = device.label
    checkbox.name =
      device.kind == "videoinput" ? "isVideoEnabled" : "isAudioEnabled"
    checkbox.checked = !["no-camera", "no-microphone"].includes(device.deviceId)
    icon.classList.add(iconClass)

    return clone
  }

  function getDropdownItems(type: DropdownListType): IDropdownItem[] {
    let items: IDropdownItem[] = []

    if (type == "screenActions") {
      items = screenActionsList.map((item) => {
        return {
          label: item.label,
          id: item.id,
          isSelected: item.id == activeScreenActionItem.id,
          extraData: item.extraData,
        }
      })
    }

    if (type == "videoDevices") {
      items = videoDevicesList.map((d) => {
        return {
          label: d.label,
          id: d.deviceId,
          isSelected: d.deviceId == activeVideoDevice.deviceId,
          extraData: {
            icon: d.deviceId == "no-camera" ? "i-video-slash" : "i-video",
          },
        }
      })
    }

    if (type == "audioDevices") {
      items = audioDevicesList.map((d) => {
        return {
          label: d.label,
          id: d.deviceId,
          isSelected: d.deviceId == activeAudioDevice.deviceId,
          extraData: {
            icon:
              d.deviceId == "no-microphone"
                ? "i-microphone-slash"
                : "i-microphone",
          },
        }
      })
    }

    return items
  }

  function sendSettings() {
    if (streamSettings.audioDeviceId == "no-microphone") {
      delete streamSettings.audioDeviceId
    }

    if (streamSettings.cameraDeviceId == "no-camera") {
      delete streamSettings.cameraDeviceId
    }

    window.electronAPI.ipcRenderer.send(
      "record-settings-change",
      streamSettings
    )
  }

  document.addEventListener("DOMContentLoaded", () => {
    const windowsToolbar = document.querySelector(".windows-toolbar")
    const windowsMinimizeBtn = document.querySelector("#windows_minimize")
    const windowsCloseBtn = document.querySelector("#windows_close")
    const isWindows = navigator.userAgent.indexOf("Windows") != -1
    if (isWindows) {
      windowsToolbar.removeAttribute("hidden")
    }
    windowsMinimizeBtn.addEventListener(
      "click",
      () => {
        if (isWindows) {
          window.electronAPI.ipcRenderer.send("windows:minimize", {})
        }
      },
      false
    )
    windowsCloseBtn.addEventListener(
      "click",
      () => {
        if (isWindows) {
          window.electronAPI.ipcRenderer.send("windows:close", {})
        }
      },
      false
    )

    window.electronAPI.ipcRenderer.on(
      "dropdown:select",
      (event, data: IDropdownPageSelectData) => {
        streamSettings = { ...streamSettings, ...data }

        if (data.action && data.action != streamSettings.action) {
          activeScreenAction = data.action
          activeScreenActionItem = data.item
          renderScreenSettings(data.item)
        }

        if (data.audioDeviceId) {
          activeAudioDevice = audioDevicesList.find(
            (d) => d.deviceId == data.audioDeviceId
          )
          audioDeviceContainer.innerHTML = null
          audioDeviceContainer.appendChild(
            renderDeviceButton(activeAudioDevice)
          )
        }

        if (data.cameraDeviceId) {
          activeVideoDevice = videoDevicesList.find(
            (d) => d.deviceId == data.cameraDeviceId
          )
          videoDeviceContainer.innerHTML = null
          videoDeviceContainer.appendChild(
            renderDeviceButton(activeVideoDevice)
          )
        }

        openedDropdownType = undefined
        sendSettings()
      }
    )

    // const actionButton = document.querySelector(".js-btn-action-type") as HTMLElement

    document.addEventListener(
      "click",
      (event) => {
        const btn = event.target as HTMLElement

        if (btn.classList.contains("js-btn-action-type")) {
          if (openedDropdownType == "screenActions") {
            window.electronAPI.ipcRenderer.send("dropdown:close", {})
            openedDropdownType = undefined
          } else {
            const offsetY = btn.getBoundingClientRect().top
            const action = btn.dataset.action as ScreenAction
            const list: IDropdownList = {
              type: "screenActions",
              items: getDropdownItems("screenActions"),
            }
            window.electronAPI.ipcRenderer.send("dropdown:open", {
              action,
              offsetY,
              list,
            })
            openedDropdownType = "screenActions"
          }
        }

        if (btn.classList.contains("js-video-device")) {
          if (openedDropdownType == "videoDevices") {
            window.electronAPI.ipcRenderer.send("dropdown:close", {})
            openedDropdownType = undefined
          } else {
            const offsetY = btn.getBoundingClientRect().top
            const list: IDropdownList = {
              type: "videoDevices",
              items: getDropdownItems("videoDevices"),
            }
            window.electronAPI.ipcRenderer.send("dropdown:open", {
              offsetY,
              list,
            })
            openedDropdownType = "videoDevices"
          }
        }

        if (btn.classList.contains("js-audio-device")) {
          if (openedDropdownType == "audioDevices") {
            window.electronAPI.ipcRenderer.send("dropdown:close", {})
            openedDropdownType = undefined
          } else {
            const offsetY = btn.getBoundingClientRect().top
            const list: IDropdownList = {
              type: "audioDevices",
              items: getDropdownItems("audioDevices"),
            }
            window.electronAPI.ipcRenderer.send("dropdown:open", {
              offsetY,
              list,
            })
            openedDropdownType = "audioDevices"
          }
        }
      },
      false
    )

    setupMediaPermissions().then(() => {
      if (activeVideoDevice) {
        videoDeviceContainer.appendChild(renderDeviceButton(activeVideoDevice))
      }

      if (activeAudioDevice) {
        audioDeviceContainer.appendChild(renderDeviceButton(activeAudioDevice))
      }

      const checkboxes = document.querySelectorAll(".media-device-checkbox")
      checkboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
          const input = event.target as HTMLInputElement
          let options = {}

          if (input.name == "isVideoEnabled") {
            if (!input.checked) {
              activeVideoDevice = noVideoDevice
            }

            options = {
              cameraDeviceId: input.checked
                ? activeVideoDevice.deviceId == "no-camera"
                  ? undefined
                  : activeVideoDevice.deviceId
                : undefined,
            }
          }

          if (input.name == "isAudioEnabled") {
            if (!input.checked) {
              activeAudioDevice = noAudioDevice
            }
            options = {
              audioDeviceId: input.checked
                ? activeAudioDevice.deviceId == "no-microphone"
                  ? undefined
                  : activeAudioDevice.deviceId
                : undefined,
            }
          }

          streamSettings = { ...streamSettings, ...options }
          sendSettings()
        })
      })
    })
  })

  const startBtn = document.querySelector("#startBtn")
  startBtn.addEventListener(
    "click",
    () => {
      if (streamSettings.action == "fullScreenVideo") {
        sendSettings()
      }

      window.electronAPI.ipcRenderer.send("start-recording", streamSettings)
    },
    false
  )

  window.electronAPI.ipcRenderer.on(
    SimpleStoreEvents.CHANGED,
    (event, data) => {
      console.log("modal SimpleStoreEvents.CHANGED", data)
    }
  )
  window.electronAPI.ipcRenderer.on(
    "dropdown:open",
    (event, data: IDropdownPageData) => {
      console.log("dropdown is open")
    }
  )
})()
