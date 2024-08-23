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
  process() {
    this.numberOfChunks = Math.ceil(this.file.size / this.chunkSize)
    this.createChunk()
  }

  createChunk() {
    this.currentChunkCounter++
    console.log("created chunk: ", this.currentChunkCounter)
    this.chunkEnd = Math.min(this.chunkStart + this.chunkSize, this.file.size)
    const chunk = this.file.slice(this.chunkStart, this.chunkEnd)
    console.log("chunk", chunk.size)
    console.log(
      "i created a chunk of video " +
        this.chunkStart +
        " - " +
        this.chunkEnd +
        " minus 1	"
    )
    const chunkForm = new FormData()
    if (this.videoId.length > 0) {
      //we have a videoId
      chunkForm.append("videoId", this.videoId)
      console.log("added videoId")
    }
    chunkForm.append("file", chunk, "test")
    console.log("added file")

    console.log(chunk)
    this.fileUploadReq(chunkForm)
  }

  fileUploadReq(chunkForm) {
    const url =
      "https://170cdf6e-9b67-4991-93e0-c25cf5d465f4.mock.pstmn.io/file"
    const oReq = new XMLHttpRequest()
    oReq.open("POST", url, true)
    oReq.upload.addEventListener("progress", this.updateProgress.bind(this))
    // const blobEnd = this.chunkEnd
    // const contentRange = "bytes " + (this.chunkStart + 1) + "-" + blobEnd + "/" + this.file.size
    // oReq.setRequestHeader("Content-Range", contentRange)
    oReq.onload = (oEvent) => {
      // Uploaded.
      console.log("uploaded chunk")
      // const resp = JSON.parse(oReq.response)

      //now we have the video ID - loop through and add the remaining chunks
      //we start one chunk in, as we have uploaded the first one.
      //next chunk starts at + chunkSize from start
      this.chunkStart += this.chunkSize
      //if start is smaller than file size - we have more to still upload
      if (this.chunkStart < this.file.size) {
        //create the new chunk
        this.createChunk()
      }
    }
    oReq.send(chunkForm)
  }

  updateProgress(oEvent) {
    console.log(213)
    if (oEvent.lengthComputable) {
      const percentComplete = Math.round((oEvent.loaded / oEvent.total) * 100)

      const totalPercentComplete = Math.round(
        ((this.currentChunkCounter - 1) / this.numberOfChunks) * 100 +
          percentComplete / this.numberOfChunks
      )
      document.getElementById("chunk-information").innerHTML =
        "Chunk # " +
        this.currentChunkCounter +
        " is " +
        percentComplete +
        "% uploaded. Total uploaded: " +
        totalPercentComplete +
        "%"
    } else {
      console.log("not computable")
    }
  }
}
