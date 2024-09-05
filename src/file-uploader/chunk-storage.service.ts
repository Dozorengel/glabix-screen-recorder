import fs from "fs"
import path from "path"
import { ChunksStorage } from "./chunk-storage"
import { Chunk } from "./chunk"
import os from "os"
import { app } from "electron"

export class ChunkStorageService {
  private _storages: ChunksStorage[] = []
  readonly mainPath =
    os.platform() == "darwin"
      ? path.join(
          os.homedir(),
          "Library",
          "Application Support",
          app.getName(),
          "chunks_storage"
        )
      : path.join(
          os.homedir(),
          "AppData",
          "Roaming",
          app.getName(),
          "chunks_storage"
        )
  currentProcessedStorage: ChunksStorage
  IsLoadedNow = false

  constructor() {
    const pathh = path.join(this.mainPath)
    if (!fs.existsSync(pathh)) {
      fs.mkdirSync(pathh)
    }
  }

  hasUnloadedFiles(): boolean {
    return !!this._storages.flatMap((s) => s.chunks).find((c) => !c.processed)
  }

  addStorage(chunkBlobs: Blob[], fileUuid: string): Promise<void> {
    const dirPath = path.join(this.mainPath, fileUuid)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath)
    }

    const processChunk = (blob: Blob, i: number): Promise<Chunk> => {
      return new Promise<Chunk>((resolve, reject) => {
        blob
          .arrayBuffer()
          .then((data) => {
            const buffer = Buffer.from(data)
            this.writeChunk(i, fileUuid, buffer)
              .then((path) => {
                const chunk = new Chunk(blob.size, fileUuid, i, buffer, path)
                resolve(chunk)
              })
              .catch((e) => reject(e))
          })
          .catch((e) => reject(e))
      })
    }

    return new Promise<void>((resolve, reject) => {
      const chunksPromises = chunkBlobs.map((c, i) => processChunk(c, i))
      Promise.all(chunksPromises)
        .then((chunks) => {
          this._storages.push(new ChunksStorage(fileUuid, chunks))
          resolve()
        })
        .catch((e) => reject(e))
    })
  }

  writeChunk(index: number, fileUuid: string, buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunkPath = path.join(this.mainPath, fileUuid, `chunk-${index}`)
      fs.writeFile(chunkPath, buffer, (err) => {
        if (err) return reject(err)
        resolve(chunkPath)
      })
    })
  }

  initStorages() {
    this._storages = []
    try {
      const dirs = this.getDirectoriesSync(this.mainPath)
      console.log(dirs)
      // readChunks
      for (let i = 0; i < dirs.length; i++) {
        const dirPath = dirs[i]
        this.readChunksFromDirectorySync(dirPath)
      }
    } catch (err) {
      console.error("Ошибка:", err)
    }
    console.log(this._storages)
  }

  private readChunksFromDirectorySync(dirName: string) {
    console.log("readChunksFromDirectorySync")
    const chunks: Chunk[] = []
    try {
      const dirPath = path.join(this.mainPath, dirName)
      const files = this.getFilesSync(dirPath)
      for (const file of files) {
        const filePath = path.join(dirPath, file)
        const fileContent = fs.readFileSync(filePath, "utf-8")
        const buffer = Buffer.from(fileContent)
        const baseName = path.basename(filePath)
        if (baseName.startsWith("chunk-")) {
          // Извлекаем номер чанка после "chunk-"
          const chunkNumber = baseName.substring(6)
          const chunk = new Chunk(
            buffer.length,
            dirName,
            +chunkNumber,
            buffer,
            filePath
          )
          chunks.push(chunk)
          console.log(`chunk: ${filePath}:`, fileContent.length)
        } else {
          console.error('Имя файла не начинается с "chunk-"')
        }
      }
      if (chunks.length) {
        this._storages.push(new ChunksStorage(dirName, chunks))
      } else {
        console.log("this.removeDir(dirName)", dirName)
        this.rmdirStorage(dirName).catch((e) => console.log(e))
      }
    } catch (err) {
      console.error("Ошибка:", err)
    }
  }

  private getFilesSync(srcPath) {
    const entries = fs.readdirSync(srcPath, { withFileTypes: true })
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)

    return files
  }

  private getDirectoriesSync(srcPath) {
    const entries = fs.readdirSync(srcPath, { withFileTypes: true })
    const directories = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
    return directories
  }

  removeStorage(uuid: string) {
    if (this.currentProcessedStorage?.fileUuid === uuid) {
      this.currentProcessedStorage = null
    }
    this._storages = this._storages.filter((s) => s.fileUuid !== uuid)
  }

  getNextChunk(): Chunk | null {
    if (!this.currentProcessedStorage) {
      if (!this._storages.length) {
        console.log(139)
        return null
      }
      this.currentProcessedStorage = this._storages[0]
    }
    console.log(this.currentProcessedStorage)
    const nextChunk = this.currentProcessedStorage.getNextChunk()
    console.log("nextChunk")
    if (nextChunk) {
      console.log("После следующего чанка")
      return nextChunk
    }
    return null
  }

  removeChunk(chunk: Chunk): Promise<void> {
    return new Promise((resolve, reject) => {
      const storage = this._storages.find((s) => s.fileUuid === chunk.fileUuid)
      if (!storage) {
        console.log("Missing chunk's storage")
        reject(Error("Missing chunk's storage"))
      }
      storage
        .removeChunk(chunk)
        .then(() => {
          resolve()
        })
        .catch((e) => reject(e))
    })
  }

  private rmdirStorage(uuid: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const dirPath = path.join(this.mainPath, uuid)
      fs.rmdir(dirPath, (err) => {
        this.removeStorage(uuid)
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
}
