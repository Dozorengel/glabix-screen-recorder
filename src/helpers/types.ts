export type ScreenAction = "fullScreenVideo" | "cropVideo" | "camera"
export interface StreamSettings {
  action: ScreenAction
  audioDeviseId?: string
  video?: boolean
  cameraDeviceId?: string
}
