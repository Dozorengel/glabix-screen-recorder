import { app, ipcMain, safeStorage } from "electron"
import * as fs from "fs"
import { IAuthData, IJWTToken } from "../helpers/types"
import { LoginEvents } from "../events/login.events"
import os from "os"
import path from "path"

export class TokenStorage {
  private _token: IJWTToken | null = null
  private _organizationId: number | null = null
  readonly filename =
    os.platform() == "darwin"
      ? path.join(
          os.homedir(),
          "Library",
          "Application Support",
          app.getName(),
          "authData.enc"
        )
      : path.join(
          os.homedir(),
          "AppData",
          "Roaming",
          app.getName(),
          "authData.enc"
        )
  get token(): IJWTToken | null {
    return this._token
  }

  get organizationId(): number | null {
    return this._organizationId
  }

  encryptAuthData(authData: IAuthData): void {
    if (safeStorage.isEncryptionAvailable()) {
      const encryptedData = safeStorage.encryptString(JSON.stringify(authData))
      fs.writeFileSync(this.filename, encryptedData)
      this._token = authData.token
      this._organizationId = +authData.organization_id
    } else {
      throw new Error("safeStorage Encryption is not available in this OS!")
    }
  }

  readAuthData(): void {
    if (fs.existsSync(this.filename)) {
      const encryptedDataBuffer = fs.readFileSync(this.filename)
      const encryptedDataString = safeStorage.decryptString(encryptedDataBuffer)
      const encryptedDataJSON = JSON.parse(encryptedDataString) as IAuthData
      this._token = encryptedDataJSON.token
      this._organizationId = +encryptedDataJSON.organization_id
    } else {
      this._token = null
      this._organizationId = null
    }
  }

  dataIsActual(): boolean {
    if (!this._token || !this._organizationId) {
      return false
    }

    const expiresAtDate = new Date(this.token.expires_at) // Преобразуем в объект даты
    const currentTime = new Date() // Текущее время
    const tokenIsActive = expiresAtDate > currentTime
    return this.token && Number.isInteger(this.organizationId) && tokenIsActive
  }

  reset() {
    this._token = null
    this._organizationId = null
    if (fs.existsSync(this.filename)) {
      fs.unlinkSync(this.filename)
    }
    ipcMain.emit(LoginEvents.LOGOUT, {})
  }
}
