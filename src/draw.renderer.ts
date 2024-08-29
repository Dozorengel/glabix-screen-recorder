import { KonvaPointerEvent } from "konva/lib/PointerEvents"
import Konva from "konva"
import "./styles/panel.scss"

let stage: Konva.Stage
const drawToggle = document.getElementById("draw-toggle")
let countdownTimer: number | null
let laserColor = getComputedStyle(document.documentElement).getPropertyValue(
  "--accent-13"
)
let laserStrokeWidth = 15

drawToggle.addEventListener("click", () => {
  const panelControls = document.querySelector("#panel-controls")!
  const panelDraw = document.querySelector("#panel-draw")!

  drawToggle.classList.add("bg-gray-300")
  panelControls.classList.remove("visible")
  panelControls.classList.add("invisible")
  panelDraw.classList.add("visible")
  panelDraw.classList.remove("invisible")

  const panelDrawCloseBtn = panelDraw.querySelector("#panel-draw-close-btn")!
  panelDrawCloseBtn.addEventListener("click", () => {
    destroyCanvas()

    drawToggle.classList.remove("bg-gray-300")
    panelControls.classList.add("visible")
    panelControls.classList.remove("invisible")
    panelDraw.classList.remove("visible")
    panelDraw.classList.add("invisible")
  })

  if (stage) {
    destroyCanvas()
    // panelDraw.classList.toggle("visible")
    // panelDraw.classList.toggle("invisible")
    return
  }

  // change laser color
  panelDraw
    .querySelectorAll("[data-color]")
    ?.forEach((colorBtn: HTMLButtonElement) => {
      colorBtn.addEventListener("click", () => {
        laserColor = getComputedStyle(
          document.documentElement
        ).getPropertyValue(`--${colorBtn.dataset.color}`)
      })
    })

  // change laser stroke width
  panelDraw
    .querySelector(".panel-slider")
    .addEventListener("input", (event) => {
      laserStrokeWidth = +(event.target as HTMLInputElement).value
    })

  stage = new Konva.Stage({
    container: "draw-container",
    width: window.innerWidth,
    height: window.innerHeight,
  })

  const layer = new Konva.Layer()
  stage.add(layer)
  const layerOpacity = new Konva.Layer()
  stage.add(layerOpacity)

  let isPaint: boolean
  let lastLine: Konva.Line
  let circle: Konva.Circle

  stage.on("mouseenter", () => {
    stage.container().style.cursor = "cell"
  })
  stage.on("mouseleave", () => {
    stage.container().style.cursor = "default"
  })

  stage.on("mousedown touchstart", () => {
    if (countdownTimer) {
      window.clearTimeout(countdownTimer)
    }
    isPaint = true
    const pos = stage.getPointerPosition()

    lastLine = new Konva.Line({
      stroke: laserColor,
      strokeWidth: laserStrokeWidth,
      bezier: true,
      lineCap: "round",
      points: [pos.x, pos.y, pos.x, pos.y],
    })
    layer.add(lastLine)

    circle = new Konva.Circle({
      x: pos.x,
      y: pos.y,
      fill: laserColor,
      radius: laserStrokeWidth * 2,
      opacity: 0.5,
    })
    layerOpacity.add(circle)
  })

  stage.on("mousemove touchmove", (e: KonvaPointerEvent) => {
    if (!isPaint) {
      return
    }

    // prevent scrolling on touch devices
    e.evt.preventDefault()

    const pos = stage.getPointerPosition()
    const newPoints = lastLine.points().concat([pos.x, pos.y])
    lastLine.points(newPoints)
    circle.x(pos.x)
    circle.y(pos.y)
  })

  stage.on("mouseup touchend", () => {
    isPaint = false

    startCountdown().then(() => {
      const tween = new Konva.Tween({
        node: layer,
        duration: 0.2,
        opacity: 0,
        onFinish: () => {
          layer.destroyChildren()
          layer.opacity(1)
        },
      })
      tween.play()
    })

    const tweenOpacity = new Konva.Tween({
      node: layerOpacity,
      duration: 0.2,
      opacity: 0,
      onFinish: () => {
        layerOpacity.destroyChildren()
        layerOpacity.opacity(1)
      },
    })
    tweenOpacity.play()
  })
})

export function destroyCanvas() {
  if (stage) {
    stage.clear()
    stage.destroy()
    stage = null
    countdownTimer = null
  }
}

function startCountdown(): Promise<boolean> {
  return new Promise((resolve) => {
    if (countdownTimer) {
      window.clearTimeout(countdownTimer)
    }

    countdownTimer = window.setTimeout(() => {
      if (countdownTimer) {
        countdownTimer = null
        resolve(true)
      }
    }, 2000)
  })
}
