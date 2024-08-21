import { electronAPI, envVars } from "./preload"

declare global {
  interface Window {
    electronAPI: typeof electronAPI
    envVars: typeof envVars
  }
}
