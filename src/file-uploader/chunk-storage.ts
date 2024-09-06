import { Chunk } from "./chunk"
import fs from "fs"

export class ChunksStorage {
  readonly fileUuid: string
  private _chunks: Chunk[] = []

  constructor(fileUuid: string, chunks: Chunk[]) {
    this.fileUuid = fileUuid
    this._chunks = chunks
  }

  get chunks() {
    return this._chunks.sort((a, b) => a.index - b.index)
  }

  getNextChunk(): Chunk | null {
    if (!this.chunks.length) {
      return null
    }
    const chunk = this.chunks[0]
    return chunk
  }

  getChunk(index: number): Chunk | null {
    const chunk = this.chunks.find((c) => c.index)
    if (!chunk) {
      return null
    }
    return chunk
  }

  removeChunk(chunk: Chunk): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.unlink(chunk.chunkPath, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve(null)
          this._chunks = this.chunks.filter((c) => chunk !== c)
        }
      })
    })
  }

  hasUnloadChunks() {
    return this.chunks.find((c) => c.processed)
  }
}
