"use strict"

// Let's get that intellisense working
/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const options = {
  appId: "com.glabix-screen.app",
  productName: "Glabix Screen",
  protocols: {
    name: "Glabix Screen",
    schemes: ["glabix-screen"],
  },
  // "store" | “normal" | "maximum" - For testing builds, use 'store' to reduce build time significantly.
  compression: "store",
  files: ["!out/"],
  icon: "public/logo-square.png",
  win: {
    target: [{ target: "nsis-web", arch: ["x64"] }],
  },
  mac: {
    target: [{ target: "dmg", arch: ["arm64", "x64"] }],
    category: "public.app-category.productivity",
    executableName: "Глабикс Экран",
    hardenedRuntime: true,
    gatekeeperAssess: true,
    extendInfo: {
      NSScreenCaptureDescription: "Предоставьте доступ к записи экрану",
      NSMicrophoneUsageDescription: "Предоставьте доступ к микрофону",
      NSCameraUsageDescription: "Предоставьте доступ к камере",
    },
    notarize: true,
  },
  nsisWeb: {
    shortcutName: "Глабикс Экран",
  },
}

module.exports = options
