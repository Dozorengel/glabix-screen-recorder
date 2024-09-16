import { Configuration } from "app-builder-lib"

const options: Configuration = {
  appId: "com.glabix-screen.app",
  productName: "Глабикс.Экран",
  protocols: {
    name: "Глабикс.Экран",
    schemes: ["glabix-screen"],
  },
  // "store" | “normal" | "maximum" - For testing builds, use 'store' to reduce build time significantly.
  compression: "store",
  files: ["!out/"],
  icon: "public/logo-square.png",
  win: {
    target: [{ target: "nsis-web", arch: ["x64"] }],
    executableName: "Глабикс.Экран",
  },
  mac: {
    target: [{ target: "dmg", arch: ["arm64", "x64"] }],
    category: "public.app-category.productivity",
    executableName: "Глабикс.Экран",
    hardenedRuntime: true,
    gatekeeperAssess: true,
    extendInfo: {
      NSScreenCaptureDescription: "Предоставьте доступ к записи экрану",
      NSMicrophoneUsageDescription: "Предоставьте доступ к микрофону",
      NSCameraUsageDescription: "Предоставьте доступ к камере",
    },
    notarize: true,
    entitlements: "build/entitlements.mac.plist",
    entitlementsInherit: "build/entitlements.mac.plist",
  },
  nsisWeb: {
    shortcutName: "Глабикс.Экран",
  },
}

export default options
