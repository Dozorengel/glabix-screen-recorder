import { ipcMain } from "electron"
import { FileUploadEvents } from "../events/file-upload.events"

export class ChunksUploader {
  readonly chunks: Buffer[] = []
  readonly _uuid: string
  private currentChunkNumber = -1
  constructor(chunks: Buffer[], uuid: string) {
    this.chunks = chunks
    this._uuid = uuid
  }
  processNextChunk() {
    if (this.currentChunkNumber + 1 >= this.chunks.length) {
      return
    }
    this.currentChunkNumber = this.currentChunkNumber + 1
    ipcMain.emit(FileUploadEvents.LOAD_FILE_CHUNK, {
      chunk: this.chunks[this.currentChunkNumber],
      chunkNumber: this.currentChunkNumber + 1,
      uuid: this.uuid,
    })
  }
  get uuid() {
    return this._uuid
  }
}
