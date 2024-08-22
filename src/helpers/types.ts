export type ScreenAction = "fullScreenVideo" | "cropVideo" | "cameraOnly"
export interface StreamSettings {
  action: ScreenAction
  audioDeviseId?: string
  video?: boolean
  cameraDeviceId?: string
}
