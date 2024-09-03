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
} from "electron"
import path from "path"
import os from "os"
import { getCurrentUser } from "./commands/current-user.command"
import { LoginEvents } from "./events/login.events"
import { FileUploadEvents } from "./events/file-upload.events"
import { uploadFileChunkCommand } from "./commands/upload-file-chunk.command"
import { ChunksUploader } from "./file-uploader/chunks-uploader"
import { createFileUploadCommand } from "./commands/create-file-upload.command"
import { ChunkSlicer } from "./file-uploader/chunk-slicer"
import { TokenStorage } from "./storages/token-storage"
import {
  IAuthData,
  ISimpleStoreData,
  IUser,
  SimpleStoreEvents,
} from "./helpers/types"
import { AppState } from "./storages/app-state"
import { SimpleStore } from "./storages/simple-store"
import log from "electron-log/main"
import { ChunkStorageService } from "./file-uploader/chunk-storage.service"
import { Chunk } from "./file-uploader/chunk"

// Optional, initialize the logger for any renderer process
log.initialize()

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit()
}

let mainWindow: BrowserWindow
let modalWindow: BrowserWindow
let loginWindow: BrowserWindow
let contextMenu: Menu
let tray: Tray

const tokenStorage = new TokenStorage()
const appState = new AppState()
const store = new SimpleStore()
const chunkStorage = new ChunkStorageService()

app.removeAsDefaultProtocolClient("glabix-video-recorder")
app.disableHardwareAcceleration()

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
    console.log("🌶️ ", e)
    log.error("😄", e)
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
    // ipcMain.handle(
    //   "get-screen-resolution",
    //   () => screen.getPrimaryDisplay().workAreaSize
    // )
    tokenStorage.readAuthData()
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
  if (chunkStorage.hasUnloadedFiles) {
    console.log(123123123123)
    const nextChunk = chunkStorage.getNextChunk()
    if (nextChunk) {
      console.log(12312312)
      ipcMain.emit(FileUploadEvents.LOAD_FILE_CHUNK, {
        chunk: nextChunk,
      })
    }
  }
}

function createWindow() {
  const { x, y, width, height } = screen.getPrimaryDisplay().bounds
  // Create the browser window.
  mainWindow = new BrowserWindow({
    transparent: true,
    frame: false,
    roundedCorners: false, // macOS, not working on Windows
    thickFrame: false,
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

  // and load the index.html of the app.
  // mainWindow.setSimpleFullScreen(false)
  if (os.platform() == "darwin") {
    mainWindow.setWindowButtonVisibility(false)
  }
  // mainWindow.loadFile("index.html")
  mainWindow.setAlwaysOnTop(true, "normal", 999999)

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
  createMenu()
  createModal(mainWindow)
  createLoginWindow()
}

function createModal(parentWindow) {
  modalWindow = new BrowserWindow({
    // frame: false,
    // thickFrame: false,
    titleBarStyle: "hidden",
    // fullscreenable: false,
    resizable: false,
    width: 300,
    show: false,
    alwaysOnTop: true,
    parent: parentWindow,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      zoomFactor: 1.0,
      nodeIntegration: true, // Enable Node.js integration
      // contextIsolation: false, // Disable context isolation (not recommended for production)
    },
  })
  // modalWindow.webContents.openDevTools()

  modalWindow.on("blur", () => {
    mainWindow.focus()
  })

  modalWindow.on("close", () => {
    app.quit()
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    modalWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/modal.html`)
  } else {
    modalWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/modal.html`)
    )
  }
}

function createLoginWindow() {
  loginWindow = new BrowserWindow({
    width: 390,
    height: 265,
    show: false,
    resizable: false,
    frame: false,
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // для безопасного взаимодействия с рендерером
      nodeIntegration: true, // повышаем безопасность
      zoomFactor: 1.0,
      // contextIsolation: true,  // повышаем безопасность
    },
  })
  loginWindow.on("close", () => {
    app.quit()
  })
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    loginWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/login.html`)
  } else {
    loginWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/login.html`)
    )
  }
}

function createMenu() {
  const image = nativeImage
    .createFromPath(path.join(__dirname, "favicon-24.png"))
    .resize({ height: 16, width: 16 })
  tray = new Tray(image)

  buildTrayMenu()
}

function buildTrayMenu() {
  const auth = tokenStorage.token
  if (auth) {
    contextMenu = Menu.buildFromTemplate([
      {
        label: "Начать",
        click: () => {
          if (tokenStorage.dataIsActual()) {
            mainWindow.show()
            modalWindow.show()
          } else {
            loginWindow.show()
          }
        },
      },
      {
        label: "Скрыть",
        click: () => {
          mainWindow.hide()
          modalWindow.hide()
        },
      },
      {
        label: "Разлогиниться",
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
  } else {
    contextMenu = Menu.buildFromTemplate([
      {
        label: "Начать",
        click: () => {
          if (tokenStorage.dataIsActual()) {
            mainWindow.show()
            modalWindow.show()
          } else {
            loginWindow.show()
          }
        },
      },
      {
        label: "Скрыть",
        click: () => {
          mainWindow.hide()
          modalWindow.hide()
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
  tray.setToolTip("Glabix video app")
  tray.setContextMenu(contextMenu)
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

ipcMain.on("set-ignore-mouse-events", (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win.setIgnoreMouseEvents(ignore, options)
})

ipcMain.on("record-settings-change", (event, data) => {
  mainWindow.webContents.send("record-settings-change", data)
})

ipcMain.on("start-recording", (event, data) => {
  mainWindow.webContents.send("start-recording", data)
  modalWindow.hide()
})
ipcMain.on("stop-recording", (event, data) => {
  modalWindow.show()
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
  buildTrayMenu()
  loginWindow.hide()
  mainWindow.show()
  modalWindow.show()
})

ipcMain.on(LoginEvents.TOKEN_CONFIRMED, (event) => {
  const { token, organization_id } = event as IAuthData
  tokenStorage.encryptAuthData({ token, organization_id })
  getCurrentUser(tokenStorage.token.access_token)
})

ipcMain.on(LoginEvents.USER_VERIFIED, (event) => {
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
  createFileUploadCommand(
    tokenStorage.token.access_token,
    tokenStorage.organizationId,
    fileName,
    processedChunks
  )
})

ipcMain.on(FileUploadEvents.FILE_CREATED_ON_SERVER, (event) => {
  const { uuid, chunks } = event
  chunkStorage.addStorage(chunks, uuid).then(() => {
    console.log(123 + "После resolve")
    checkUnprocessedFiles()
  })
})

ipcMain.on(FileUploadEvents.LOAD_FILE_CHUNK, (event) => {
  console.log("FileUploadEvents.LOAD_FILE_CHUNK")
  const { chunk } = event
  const typedChunk = chunk as Chunk
  const uuid = typedChunk.fileUuid
  const chunkNumber = typedChunk.index + 1
  const callback = (err, data) => {
    console.log("ура")
    typedChunk.cancelProcess()
    console.log("err", err)
    if (!err) {
      chunkStorage
        .removeChunk(typedChunk)
        .then(() => {
          console.log("send event", "FileUploadEvents.FILE_CHUNK_UPLOADED")
          ipcMain.emit(FileUploadEvents.FILE_CHUNK_UPLOADED, {
            uuid,
            chunkNumber,
          })
        })
        .catch((e) => {
          console.log("вонючее место")
          console.log(e)
        })
    } else {
      console.log(err)
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
  console.log("FileUploadEvents.FILE_CHUNK_UPLOADED")
  const { uuid, chunks } = event
  checkUnprocessedFiles()
})

ipcMain.on(LoginEvents.LOGOUT, (event) => {
  buildTrayMenu()
})

ipcMain.on("log", (evt, data) => {
  console.log(data)
})
