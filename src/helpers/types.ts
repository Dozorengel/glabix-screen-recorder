export type ScreenAction = "fullScreenVideo" | "cropVideo" | "cameraOnly"
export interface StreamSettings {
  action: ScreenAction
  audioDeviceId?: string
  video?: boolean
  cameraDeviceId?: string
}
