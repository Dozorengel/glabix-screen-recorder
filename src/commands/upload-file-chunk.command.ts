import axios from "axios"
import { ipcMain } from "electron"
import { FileUploadEvents } from "../events/file-upload.events"

export function uploadFileChunkCommand(
  token: string,
  orgId: number,
  uuid: string,
  chunk: Blob,
  chunkNumber: number
) {
  const url = `${process.env.API_PATH}screen_recorder/organizations/${orgId}/uploads/${uuid}`
  const chunkFormData = new FormData()
  const file = new File([chunk], "chunk" + "_" + chunkNumber)
  chunkFormData.append("number", chunkNumber)
  chunkFormData.append("file_part", file)
  axios
    .post(url, chunkFormData, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((response) => {
      if (response.status === 200 || response.status === 201) {
        console.log(`Successfully uploaded chunk ${chunkNumber}`)
        ipcMain.emit(FileUploadEvents.FILE_CHUNK_UPLOADED, {
          uuid,
          chunkNumber,
        })
      } else {
        console.error(`Failed to upload chunk ${chunkNumber}`, response)
      }
    })
    .catch((e) => {
      console.error(`Error uploading chunk ${chunkNumber}:`, e)
    })
}
