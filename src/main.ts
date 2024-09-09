import "@dotenvx/dotenvx"
import {
  app,
  BrowserWindow,
  desktopCapturer,
  session,
  screen,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  protocol,
  dialog,
  nativeTheme,
  globalShortcut,
  shell,
} from "electron"
import path from "path"
import os from "os"
import { getCurrentUser } from "./commands/current-user.command"
import { LoginEvents } from "./events/login.events"
import { FileUploadEvents } from "./events/file-upload.events"
import { uploadFileChunkCommand } from "./commands/upload-file-chunk.command"
import { createFileUploadCommand } from "./commands/create-file-upload.command"
import { ChunkSlicer } from "./file-uploader/chunk-slicer"
import { TokenStorage } from "./storages/token-storage"
import {
  IAuthData,
  IDropdownPageData,
  IDropdownPageSelectData,
  ISimpleStoreData,
  IUser,
  SimpleStoreEvents,
} from "./helpers/types"
import { AppState } from "./storages/app-state"
import { SimpleStore } from "./storages/simple-store"
import log from "electron-log/main"
import { ChunkStorageService } from "./file-uploader/chunk-storage.service"
import { Chunk } from "./file-uploader/chunk"
import { autoUpdater } from "electron-updater"
import { getTitle } from "./helpers/get-title"
import { setLog } from "./helpers/set-log"

// Optional, initialize the logger for any renderer process
log.initialize()

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit()
}

let dropdownWindow: BrowserWindow
let mainWindow: BrowserWindow
let modalWindow: BrowserWindow
let loginWindow: BrowserWindow
let contextMenu: Menu
let tray: Tray
let isAppQuitting = false

const tokenStorage = new TokenStorage()
const appState = new AppState()
const store = new SimpleStore()
const chunkStorage = new ChunkStorageService()

app.removeAsDefaultProtocolClient("glabix-video-recorder")
app.commandLine.appendSwitch("force-compositing-mode")
app.commandLine.appendSwitch("enable-transparent-visuals")

const gotTheLock = app.requestSingleInstanceLock()

function init(url: string) {
  // Someone tried to run a second instance, we should focus our window.
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
  // const url = commandLine.pop()
  try {
    const u = new URL(url)
    const access_token = u.searchParams.get("access_token")
    const refresh_token = u.searchParams.get("refresh_token")
    let expires_at = u.searchParams.get("expires_at")
    const organization_id = u.searchParams.get("organization_id")
    if ((access_token, refresh_token, expires_at, organization_id)) {
      if (expires_at.includes("00:00") && !expires_at.includes("T00:00")) {
        //небольшой хак, чтобы дата распарсилась корректно
        expires_at = expires_at.replace("00:00", "+00:00") // Заменяем на корректный формат ISO
        expires_at = expires_at.replace(" ", "") // Заменяем на корректный формат ISO
      }
      const authData: IAuthData = {
        token: {
          access_token,
          refresh_token,
          expires_at,
        },
        organization_id: +organization_id,
      }
      loginWindow.show()
      ipcMain.emit(LoginEvents.TOKEN_CONFIRMED, authData)
    }
  } catch (e) {
    setLog(e, true)
  }
}

if (!gotTheLock) {
  app.quit()
} else {
  if (os.platform() == "darwin") {
    app.on("open-url", (event, url) => {
      init(url)
    })
  }
  if (os.platform() == "win32") {
    app.on("second-instance", (event, commandLine, workingDirectory) => {
      const url = commandLine.pop()
      init(url)
    })
  }

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(() => {
    autoUpdater.checkForUpdatesAndNotify()
    setLog(JSON.stringify(import.meta.env), true)
    // ipcMain.handle(
    //   "get-screen-resolution",
    //   () => screen.getPrimaryDisplay().workAreaSize
    // )
    try {
      tokenStorage.readAuthData()
      createMenu()
    } catch (e) {
      setLog(e, true)
    }
    createWindow()
    chunkStorage.initStorages()
    checkUnprocessedFiles()

    session.defaultSession.setDisplayMediaRequestHandler(
      (request, callback) => {
        desktopCapturer.getSources({ types: ["screen"] }).then((sources) => {
          // Grant access to the first screen found.
          callback({ video: sources[0], audio: "loopback" })
        })
      }
    )
  })
}

function registerShortCuts() {
  globalShortcut.register("Command+H", () => {
    hideWindows()
  })
}

function unregisterShortCuts() {
  globalShortcut.unregisterAll()
}

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("glabix-video-recorder", process.execPath, [
      path.resolve(process.argv[1]),
    ])
  }
} else {
  app.setAsDefaultProtocolClient("glabix-video-recorder")
}

function checkUnprocessedFiles() {
  setLog(`check Unprocessed Files`, false)
  if (chunkStorage.hasUnloadedFiles()) {
    setLog(`chunkStorage has Unloaded Files`, false)
    const nextChunk = chunkStorage.getNextChunk()
    if (nextChunk) {
      setLog(
        `Next chunk №${nextChunk.index} by file ${nextChunk.fileUuid}`,
        false
      )
      ipcMain.emit(FileUploadEvents.LOAD_FILE_CHUNK, {
        chunk: nextChunk,
      })
    } else {
      setLog(`No next chunk`, false)
    }
  } else {
    setLog(`No unprocessed files!`, false)
  }
}

function createWindow() {
  const { x, y, width, height } = screen.getPrimaryDisplay().bounds
  // Create the browser window.
  mainWindow = new BrowserWindow({
    transparent: true,
    frame: false,
    thickFrame: false,
    resizable: false,
    minimizable: false,
    roundedCorners: false, // macOS, not working on Windows
    show: false,
    alwaysOnTop: true,
    x,
    y,
    width,
    height,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      zoomFactor: 1.0,
      nodeIntegration: true, // Enable Node.js integration
      // contextIsolation: false, // Disable context isolation (not recommended for production)
    },
  })
  mainWindow.setBounds(screen.getPrimaryDisplay().bounds)

  if (os.platform() == "darwin") {
    mainWindow.setWindowButtonVisibility(false)
  }

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  mainWindow.setAlwaysOnTop(true, "screen-saver")

  // mainWindow.setFullScreenable(false)
  // mainWindow.setIgnoreMouseEvents(true, { forward: true })

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/index.html`)
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    )
  }
  mainWindow.webContents.setFrameRate(60)
  createModal(mainWindow)
  createLoginWindow()
}

function createModal(parentWindow) {
  modalWindow = new BrowserWindow({
    titleBarStyle: "hidden",
    fullscreenable: false,
    maximizable: false,
    resizable: false,
    width: 300,
    height: 370,
    show: false,
    alwaysOnTop: true,
    parent: parentWindow,
    minimizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      zoomFactor: 1.0,
      nodeIntegration: true, // Enable Node.js integration
      // contextIsolation: false, // Disable context isolation (not recommended for production)
    },
  })
  // modalWindow.webContents.openDevTools()
  modalWindow.setAlwaysOnTop(true, "screen-saver")
  modalWindow.on("hide", () => {
    dropdownWindow.hide()
  })
  modalWindow.on("show", () => {})
  modalWindow.on("blur", () => {
    mainWindow.focus()
  })

  modalWindow.on("close", (event) => {
    if (!isAppQuitting) {
      event.preventDefault()
      hideWindows()
    }
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    modalWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/modal.html`)
  } else {
    modalWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/modal.html`)
    )
  }

  createDropdownWindow(modalWindow)
}

function createDropdownWindow(parentWindow) {
  dropdownWindow = new BrowserWindow({
    titleBarStyle: "hiddenInset",
    titleBarOverlay: true,
    frame: false,
    fullscreen: false,
    thickFrame: false,
    fullscreenable: false,
    maximizable: false,
    // resizable: false,
    width: 300,
    height: 300,
    autoHideMenuBar: true,
    show: false,
    alwaysOnTop: true,
    parent: parentWindow,
    minimizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      zoomFactor: 1.0,
      nodeIntegration: true, // Enable Node.js integration
      // contextIsolation: false, // Disable context isolation (not recommended for production)
    },
  })
  // dropdownWindow.webContents.openDevTools()
  dropdownWindow.setAlwaysOnTop(true, "screen-saver")
  if (os.platform() == "darwin") {
    dropdownWindow.setWindowButtonVisibility(false)
  }

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    dropdownWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/dropdown.html`)
  } else {
    dropdownWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/dropdown.html`)
    )
  }
}

function createLoginWindow() {
  loginWindow = new BrowserWindow({
    width: 390,
    height: 265,
    show: false,
    resizable: false,
    maximizable: false,
    frame: false,
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // для безопасного взаимодействия с рендерером
      nodeIntegration: true, // повышаем безопасность
      zoomFactor: 1.0,
      // contextIsolation: true,  // повышаем безопасность
    },
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    loginWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/login.html`)
  } else {
    loginWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/login.html`)
    )
  }

  loginWindow.once("ready-to-show", () => {
    showWindows()
  })
}

function showWindows() {
  registerShortCuts()
  if (tokenStorage.dataIsActual()) {
    if (mainWindow) {
      mainWindow.show()
    }
    if (modalWindow) {
      modalWindow.show()
    }
  } else {
    if (loginWindow) loginWindow.show()
  }
}

function hideWindows() {
  unregisterShortCuts()
  if (tokenStorage.dataIsActual()) {
    if (mainWindow) mainWindow.hide()
    if (modalWindow) modalWindow.hide()
  } else {
    if (loginWindow) loginWindow.hide()
  }
}

function toggleWindows() {
  if (tokenStorage.dataIsActual()) {
    if (modalWindow.isVisible() && mainWindow.isVisible()) {
      hideWindows()
    } else {
      showWindows()
    }
  } else {
    if (loginWindow.isVisible()) {
      hideWindows()
    } else {
      showWindows()
    }
  }
}

function createTrayIcon(): Electron.NativeImage {
  let imagePath = "tray-win.png"

  if (os.platform() == "darwin") {
    imagePath = nativeTheme.shouldUseDarkColors
      ? "tray-macos-light.png"
      : "tray-macos-dark.png"
  }

  return nativeImage
    .createFromPath(path.join(__dirname, imagePath))
    .resize({ width: 20, height: 20 })
}

function createMenu() {
  tray = new Tray(createTrayIcon())
  tray.setToolTip("Glabix Экран")

  tray.on("click", (e) => {
    toggleWindows()
  })

  tray.on("right-click", (e) => {
    tray.popUpContextMenu(contextMenu)
  })

  contextMenu = Menu.buildFromTemplate([
    {
      id: "menuLogOutItem",
      label: "Разлогиниться",
      visible: tokenStorage.dataIsActual(),
      click: () => {
        tokenStorage.reset()
        mainWindow.hide()
        modalWindow.hide()
        loginWindow.show()
      },
    },
    {
      label: "Выйти",
      click: () => {
        app.quit()
      },
    },
  ])
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on("before-quit", () => {
  unregisterShortCuts()
  isAppQuitting = true
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

ipcMain.on("set-ignore-mouse-events", (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win.setIgnoreMouseEvents(ignore, options)
})

ipcMain.on("record-settings-change", (event, data) => {
  mainWindow.webContents.send("record-settings-change", data)
})

ipcMain.on("dropdown:close", (event, data) => {
  dropdownWindow.hide()
})
ipcMain.on("dropdown:select", (event, data: IDropdownPageSelectData) => {
  modalWindow.webContents.send("dropdown:select", data)
  dropdownWindow.hide()
})

ipcMain.on("dropdown:open", (event, data: IDropdownPageData) => {
  const dropdownWindowBounds = dropdownWindow.getBounds()
  const modalWindowBounds = modalWindow.getBounds()
  const screenBounds = screen.getPrimaryDisplay().bounds
  const gap = 20
  const itemHeight = 48
  const height = data.list.items.length * itemHeight
  const positionRight =
    modalWindowBounds.x +
    modalWindowBounds.width +
    dropdownWindowBounds.width +
    gap
  const positionY = modalWindowBounds.y + data.offsetY
  const diffX = screenBounds.width - positionRight

  if (diffX < 0) {
    dropdownWindow.setBounds({
      x: modalWindowBounds.x - dropdownWindowBounds.width - gap,
      y: positionY,
    })
  } else {
    dropdownWindow.setBounds({
      x: modalWindowBounds.x + modalWindowBounds.width + gap,
      y: positionY,
    })
  }

  if (height) {
    dropdownWindow.setBounds({ height })
  }

  dropdownWindow.show()
  dropdownWindow.webContents.send("dropdown:open", data)
})

ipcMain.on("start-recording", (event, data) => {
  mainWindow.webContents.send("start-recording", data)
  modalWindow.hide()
})
ipcMain.on("stop-recording", (event, data) => {
  mainWindow.webContents.send("stop-recording")
  modalWindow.show()
})
ipcMain.on("windows:minimize", (event, data) => {
  modalWindow.close()
})
ipcMain.on("windows:close", (event, data) => {
  modalWindow.close()
})

ipcMain.on(SimpleStoreEvents.UPDATE, (event, data: ISimpleStoreData) => {
  const { key, value } = data
  store.set(key, value)
  mainWindow.webContents.send(SimpleStoreEvents.CHANGED, store.get())
  modalWindow.webContents.send(SimpleStoreEvents.CHANGED, store.get())
})

ipcMain.on("main-window-focus", (event, data) => {
  mainWindow.focus()
})

ipcMain.on(LoginEvents.LOGIN_ATTEMPT, (event, credentials) => {
  const { username, password } = credentials
  // Простой пример проверки логина
  if (username === "1" && password === "1") {
  } else {
    event.reply(LoginEvents.LOGIN_FAILED)
  }
})

ipcMain.on(LoginEvents.LOGIN_SUCCESS, (event) => {
  setLog(`LOGIN_SUCCESS`, false)
  contextMenu.getMenuItemById("menuLogOutItem").visible = true
  loginWindow.hide()
  mainWindow.show()
  modalWindow.show()
})

ipcMain.on(LoginEvents.TOKEN_CONFIRMED, (event) => {
  setLog(`TOKEN_CONFIRMED`, false)
  const { token, organization_id } = event as IAuthData
  tokenStorage.encryptAuthData({ token, organization_id })
  getCurrentUser(tokenStorage.token.access_token)
})

ipcMain.on(LoginEvents.USER_VERIFIED, (event) => {
  setLog(`USER_VERIFIED`, false)
  const user = event as IUser
  appState.set({ ...appState.state, user })
  ipcMain.emit(LoginEvents.LOGIN_SUCCESS)
})

ipcMain.on(FileUploadEvents.FILE_CREATED, (event, file) => {
  const blob = new Blob([file], { type: "video/webm" })
  const size = 10 * 1024 * 1024
  const chunksSlicer = new ChunkSlicer(blob, size)
  const processedChunks = [...chunksSlicer.allChunks]
  const fileName = "test-video-" + Date.now() + ".mp4"
  const title = getTitle()
  createFileUploadCommand(
    tokenStorage.token.access_token,
    tokenStorage.organizationId,
    fileName,
    processedChunks,
    title
  )
})

ipcMain.on(FileUploadEvents.FILE_CREATED_ON_SERVER, (event) => {
  const { uuid, chunks } = event
  setLog(
    `File-${uuid} created on server, chunks length ${chunks?.length}`,
    false
  )
  chunkStorage.addStorage(chunks, uuid).then(() => {
    checkUnprocessedFiles()
  })
  const shared =
    import.meta.env.VITE_AUTH_APP_URL +
    "recorder/org/" +
    tokenStorage.organizationId +
    "/" +
    "library/" +
    uuid
  shell.openExternal(shared)
})

ipcMain.on(FileUploadEvents.LOAD_FILE_CHUNK, (event) => {
  const { chunk } = event
  const typedChunk = chunk as Chunk
  const uuid = typedChunk.fileUuid
  const chunkNumber = typedChunk.index + 1
  setLog(`Chunk ${chunkNumber} by file-${uuid} start upload`, false)
  const callback = (err, data) => {
    typedChunk.cancelProcess()
    if (!err) {
      chunkStorage
        .removeChunk(typedChunk)
        .then(() => {
          setLog(`Chunk ${chunkNumber} by file-${uuid} was uploaded`, false)
          ipcMain.emit(FileUploadEvents.FILE_CHUNK_UPLOADED, {
            uuid,
            chunkNumber,
          })
        })
        .catch((e) => {
          setLog(e, true)
        })
    } else {
      setLog(err, true)
    }
  }
  typedChunk.getData().then((data) => {
    typedChunk.startProcess()
    uploadFileChunkCommand(
      tokenStorage.token.access_token,
      tokenStorage.organizationId,
      uuid,
      data,
      chunkNumber,
      callback
    )
  })
})

ipcMain.on(FileUploadEvents.FILE_CHUNK_UPLOADED, (event) => {
  const { uuid, chunkNumber } = event
  setLog(
    `FileUploadEvents.FILE_CHUNK_UPLOADED: ${chunkNumber} by file ${uuid} uploaded`,
    false
  )
  checkUnprocessedFiles()
})

ipcMain.on(LoginEvents.LOGOUT, (event) => {
  contextMenu.getMenuItemById("menuLogOutItem").visible = false
})

ipcMain.on("log", (evt, data) => {
  console.log(data)
})
