import axios from "axios"
import { ipcMain } from "electron"
import { FileUploadEvents } from "../events/file-upload.events"
export function createFileUploadCommand(
  token: string,
  orgId: number,
  filename: string,
  chunks: Blob[],
  title: string
) {
  const url = `${import.meta.env.VITE_API_PATH}screen_recorder/organizations/${orgId}/uploads`
  const params = {
    chunks_count: chunks.length,
    filename,
    title,
  }
  axios
    .post<{ uuid: string }>(
      url,
      { ...params },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    .then((res) => {
      console.log("Создан файл", res.data.uuid, chunks.length)
      const uuid = res.data.uuid
      const params = { uuid, chunks }
      ipcMain.emit(FileUploadEvents.FILE_CREATED_ON_SERVER, params)
    })
    .catch((e) => {
      console.log(e)
    })
}
