import axios from "axios"
import { ipcMain } from "electron"
import { FileUploadEvents } from "../events/file-upload.events"
export function createFileUploadCommand(
  token: string,
  orgId: number,
  filename: string,
  chunks: Blob[]
) {
  const url = `${import.meta.env.VITE_API_PATH}screen_recorder/organizations/${orgId}/uploads`
  const params = { chunks_count: chunks.length, filename }
  axios
    .post<{ uuid: string }>(
      url,
      { ...params },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    .then((res) => {
      const uuid = res.data.uuid
      const params = { uuid, chunks }
      ipcMain.emit(FileUploadEvents.FILE_CREATED_ON_SERVER, params)
    })
    .catch((e) => {
      console.log(e)
    })
}
