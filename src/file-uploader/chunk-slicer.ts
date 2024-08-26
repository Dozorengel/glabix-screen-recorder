export class ChunkSlicer {
  readonly chunkSize: number
  private chunks: Blob[] = []
  private chunkEnd = 0
  private chunkStart = 0
  readonly file: Blob
  private videoId: string
  private currentChunkCounter = 0
  private numberOfChunks = 0
  constructor(file: Blob, chunkSize: number) {
    this.file = file
    this.chunkSize = chunkSize
    this.videoId = Date.now().toString()
    this.process()
  }

  get allChunks() {
    return this.chunks
  }

  private process() {
    this.numberOfChunks = Math.ceil(this.file.size / this.chunkSize)
    this.createChunk()
  }

  private createChunk() {
    this.currentChunkCounter++
    this.chunkEnd = Math.min(this.chunkStart + this.chunkSize, this.file.size)
    const chunk = this.file.slice(this.chunkStart, this.chunkEnd)
    this.chunks = [...this.chunks, chunk]
    this.chunkStart += this.chunkSize
    if (this.chunkStart < this.file.size) {
      this.createChunk()
    }
  }
}
