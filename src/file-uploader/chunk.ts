import fs from "fs"
import * as buffer from "buffer"
import { ChunksStorage } from "./chunk-storage"

export class Chunk {
  readonly size: number
  readonly fileUuid: string
  readonly index: number
  readonly buffer: Buffer
  readonly chunkPath: string
  readonly storage: ChunksStorage
  private _processed = false

  constructor(
    size: number,
    fileUuid: string,
    index: number,
    buffer: Buffer,
    chunkPath: string
  ) {
    console.log("chunk created")
    this.index = index
    this.fileUuid = fileUuid
    this.size = size
    this.buffer = buffer
    this.chunkPath = chunkPath
  }

  get processed() {
    return this._processed
  }

  startProcess(): void {
    this._processed = true
  }

  cancelProcess(): void {
    this._processed = false
  }

  getData(): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      fs.readFile(this.chunkPath, (err, data) => {
        if (data) {
          resolve(data)
        }
        reject(err)
      })
    })
  }
}
