import { KonvaPointerEvent } from "konva/lib/PointerEvents"
import Konva from "konva"
import Moveable, { MoveableRefTargetType } from "moveable"
import "./styles/panel.scss"

let stage: Konva.Stage
const drawToggle = document.getElementById("draw-toggle")
let countdownTimer: number | null
let laserColor = getComputedStyle(document.documentElement).getPropertyValue(
  "--accent-13"
)
let laserStrokeWidth = 5

drawToggle.addEventListener("click", () => {
  const panelControls = document.querySelector("#panel-controls")!
  const panelDraw = document.querySelector("#panel-draw")!

  drawToggle.classList.add("bg-gray-300")
  panelControls.classList.remove("visible")
  panelControls.classList.add("invisible")
  panelDraw.classList.add("visible")
  panelDraw.classList.remove("invisible")

  // handle draw end
  panelDraw
    .querySelector("#panel-draw-close-btn")
    .addEventListener("click", () => {
      if (stage) {
        stage.clear()
        stage.destroy()
        stage = null
        countdownTimer = null
      }

      drawToggle.classList.remove("bg-gray-300")
      panelControls.classList.add("visible")
      panelControls.classList.remove("invisible")
      panelDraw.classList.remove("visible")
      panelDraw.classList.add("invisible")
    })

  // change laser color
  const bullets = panelDraw.querySelectorAll("[data-color]")
  bullets.forEach((bullet: HTMLButtonElement) => {
    bullet.addEventListener("click", () => {
      bullets.forEach((b: HTMLButtonElement) => {
        b.classList.remove("border-2", "border-primary")
      })

      bullet.classList.add("border-2", "border-primary")
      laserColor = getComputedStyle(document.documentElement).getPropertyValue(
        `--${bullet.dataset.color}`
      )
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
      radius: laserStrokeWidth,
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

;(function () {
  document.addEventListener("DOMContentLoaded", () => {
    // let moveable: Moveable
    const container = document.querySelector(".panel-wrapper")
    let moveable = new Moveable(document.body, {
      target: container as MoveableRefTargetType,
      container: document.body,
      className: "moveable-invisible-container",
      draggable: true,
    })

    moveable
      .on("dragStart", ({ target, clientX, clientY }) => {
        target.classList.add("moveable-dragging")
      })
      .on(
        "drag",
        ({
          target,
          transform,
          left,
          top,
          right,
          bottom,
          beforeDelta,
          beforeDist,
          delta,
          dist,
          clientX,
          clientY,
        }) => {
          target!.style.left = `${left}px`
          target!.style.top = `${top}px`
        }
      )
      .on("dragEnd", ({ target, isDrag, clientX, clientY }) => {
        target.classList.remove("moveable-dragging")
      })
  })
})()
