import axios from "axios"
import { ipcMain } from "electron"
import { LoginEvents } from "../events/login.events"
export async function getCurrentUser(token: string) {
  const url = `${process.env.API_PATH}/identities/current`

  axios
    .get(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => {
      ipcMain.emit(LoginEvents.USER_VERIFIED, res.data)
    })
}
