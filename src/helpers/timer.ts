export class Timer {
  constructor(container: Element) {
    this.el = container
  }

  private el: Element
  private seconds = 0
  private minutes = 0
  private timerInterval: NodeJS.Timeout
  private time = "00:00"

  start() {
    this.timerInterval = setInterval(() => {
      this.seconds++

      if (this.seconds >= 60) {
        this.seconds = 0
        this.minutes++
      }

      this.time = `${String(this.minutes).padStart(2, "0")}:${String(this.seconds).padStart(2, "0")}`
      this.update()
    }, 1000)
  }

  update() {
    this.el.textContent = this.time
  }

  pause() {
    clearInterval(this.timerInterval)
  }

  stop() {
    clearInterval(this.timerInterval)
    this.seconds = 0
    this.minutes = 0
    this.time = "00:00"
    this.update()
  }
}
