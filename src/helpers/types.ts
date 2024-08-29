export type ScreenAction = "fullScreenVideo" | "cropVideo" | "cameraOnly"
export type RecorderState = "recording" | "paused" | "stopped"
export interface StreamSettings {
  action: ScreenAction
  audioDeviceId?: string
  video?: boolean
  cameraDeviceId?: string
}

export interface IAppState {
  user?: IUser
  organization?: IOrganization
}

export interface IUser {
  id: number
}

export interface IOrganization {
  id: number
}

export interface IJWTToken {
  expires_at: string
  access_token: string
  refresh_token: string
}

export interface IAuthData {
  token: IJWTToken
  organization_id: number
}

export enum SimpleStoreEvents {
  UPDATE = "simple-store:update",
  CHANGED = "simple-store:changed",
}

export interface ISimpleStoreData {
  key: string
  value: any
}
