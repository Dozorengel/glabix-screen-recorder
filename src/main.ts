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
} from "electron"
import path from "path"

import Store from "electron-store"
import ElectronStore from "electron-store"

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (require("electron-squirrel-startup")) {
//   app.quit()
// }

// Create an instance of Store
const store = new Store({
  defaults: {
    isRecording: false, // Set the default recording state to false
  },
})

let mainWindow: BrowserWindow

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
      // nodeIntegration: true, // Enable Node.js integration
      // contextIsolation: false, // Disable context isolation (not recommended for production)
    },
  })

  // and load the index.html of the app.
  mainWindow.setWindowButtonVisibility(false)
  mainWindow.loadFile("index.html")
  mainWindow.setAlwaysOnTop(true, "normal", 3000)

  mainWindow.setIgnoreMouseEvents(true, { forward: true })

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    )
  }

  createMenu()
}

function createMenu() {
  const image = nativeImage
    .createFromPath(path.join(__dirname, "favicon-24.png"))
    .resize({ height: 16, width: 16 })
  const tray = new Tray(image)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Запись видео всего экрана",
      click: () => {
        mainWindow.show()
      },
    },
    {
      label: "Запись видео области экрана",
      click: () => {
        console.log("Crop screen")
      },
    },
    {
      label: "Нарисовать стрелку",
      id: "createCanvas",
      click: () => createCanvas(),
    },
    {
      label: "Закончить рисование",
      id: "destroyCanvas",
      visible: false,
      click: () => destroyCanvas(),
    },
    // { label: 'Parent show', click: () => { mainWindow.show() } },
    // { label: 'Child show', click: () => { childWindow.show() } },
    {
      label: "Parent hide",
      click: () => {
        mainWindow.hide()
      },
    },
    // { label: 'Child hide', click: () => { childWindow.hide() } },
    {
      label: "Выйти",
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setToolTip("Glabix video app.")
  tray.setContextMenu(contextMenu)

  function createCanvas() {
    mainWindow.webContents.send("create-canvas")

    const createCanvasItemIndex = contextMenu.items.findIndex(
      (i) => i.id === "createCanvas"
    )
    contextMenu.items[createCanvasItemIndex].visible = false

    const destroyCanvasItemIndex = contextMenu.items.findIndex(
      (i) => i.id === "destroyCanvas"
    )
    contextMenu.items[destroyCanvasItemIndex].visible = true

    tray.setContextMenu(contextMenu)
  }

  function destroyCanvas() {
    mainWindow.webContents.send("destroy-canvas")

    const createCanvasItemIndex = contextMenu.items.findIndex(
      (i) => i.id === "createCanvas"
    )
    contextMenu.items[createCanvasItemIndex].visible = true

    const destroyCanvasItemIndex = contextMenu.items.findIndex(
      (i) => i.id === "destroyCanvas"
    )
    contextMenu.items[destroyCanvasItemIndex].visible = false

    tray.setContextMenu(contextMenu)
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // ipcMain.handle(
  //   "get-screen-resolution",
  //   () => screen.getPrimaryDisplay().workAreaSize
  // )

  createWindow()

  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ["screen"] }).then((sources) => {
      // Grant access to the first screen found.
      callback({ video: sources[0], audio: "loopback" })
    })
  })
})

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

// Initialize is_recording from store
let isRecording = store.get("is_recording") || false

// Listen for IPC events to update is_recording
ipcMain.on("set-recording", (event, recordingState) => {
  isRecording = recordingState
  store.set("is_recording", isRecording)
})

// Listen for IPC events to get current recording state
ipcMain.handle("get-recording", () => {
  return isRecording
})
