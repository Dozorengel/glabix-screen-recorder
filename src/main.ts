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
import { getCurrentUser } from "./commands/cirrent-user.command"
import { e } from "vite/dist/node/types.d-aGj9QkWt"
import { LoginEvents } from "./events/login.events"

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (require("electron-squirrel-startup")) {
//   app.quit()
// }

let mainWindow: BrowserWindow
let modalWindow: BrowserWindow
let loginWindow: BrowserWindow
const appState = {
  user: null,
}

app.removeAsDefaultProtocolClient("glabix-video-recorder")

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
    const url = commandLine.pop()
    const u = new URL(url)
    const token = u.searchParams.get("token")
    if (token) {
      loginWindow.show()
      ipcMain.emit(LoginEvents.TOKEN_CONFIRMED, token)
    }
  })

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(() => {
    // ipcMain.handle(
    //   "get-screen-resolution",
    //   () => screen.getPrimaryDisplay().workAreaSize
    // )

    createWindow()
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

  // modalWindow.webContents.openDevTools()
}

function createLoginWindow() {
  loginWindow = new BrowserWindow({
    width: 400,
    height: 300,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // для безопасного взаимодействия с рендерером
      nodeIntegration: true, // повышаем безопасность
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
  const tray = new Tray(image)

  const contextMenu = Menu.buildFromTemplate([
    // {
    //   label: "Запись видео всего экрана",
    //   click: () => {
    //     mainWindow.show()
    //   },
    // },
    {
      label: "Начать",
      click: () => {
        if (!+process.env.LOGIN_IS_REQUIRED || appState.user) {
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
  if (["fullScreenVideo"].includes(data.action)) {
    modalWindow.hide()
  }
})

ipcMain.on("start-recording", (event, data) => {
  mainWindow.webContents.send("start-recording", data)
  modalWindow.hide()
})

ipcMain.on(LoginEvents.LOGIN_ATTEMPT, (event, credentials) => {
  const { username, password } = credentials
  // Простой пример проверки логина
  if (username === "1" && password === "1") {
    ipcMain.emit(LoginEvents.LOGIN_SUCCESS, event)
  } else {
    event.reply(LoginEvents.LOGIN_FAILED)
  }
})

ipcMain.on(LoginEvents.LOGIN_SUCCESS, (event) => {
  loginWindow.hide()
  mainWindow.show()
  modalWindow.show()
})

ipcMain.on(LoginEvents.TOKEN_CONFIRMED, (event) => {
  getCurrentUser(event as string)
})

ipcMain.on(LoginEvents.USER_VERIFIED, (event) => {
  appState.user = event as any
  ipcMain.emit(LoginEvents.LOGIN_SUCCESS)
})
