"use client"

import { useEffect, useRef } from "react"

export function HeroVisual() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let time = 0

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    resize()
    window.addEventListener("resize", resize)

    const draw = () => {
      const width = canvas.offsetWidth
      const height = canvas.offsetHeight

      ctx.clearRect(0, 0, width, height)

      // Create gradient mesh effect
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2)
      gradient.addColorStop(0, "rgba(10, 132, 255, 0.3)")
      gradient.addColorStop(0.5, "rgba(48, 209, 88, 0.2)")
      gradient.addColorStop(1, "rgba(10, 132, 255, 0)")

      // Draw flowing splines
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const yOffset = Math.sin(time * 0.5 + i) * 30
        const amplitude = 60 + i * 20

        ctx.moveTo(0, height / 2 + yOffset)

        for (let x = 0; x <= width; x += 10) {
          const y = height / 2 + Math.sin((x / width) * Math.PI * 2 + time + i) * amplitude + yOffset
          ctx.lineTo(x, y)
        }
      }

      const lineGradient = ctx.createLinearGradient(0, 0, width, 0)
      lineGradient.addColorStop(0, "rgba(48, 209, 88, 0.6)")
      lineGradient.addColorStop(0.5, "rgba(10, 132, 255, 0.8)")
      lineGradient.addColorStop(1, "rgba(94, 92, 230, 0.6)")

      ctx.strokeStyle = lineGradient
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw mesh points
      for (let x = 0; x < width; x += 40) {
        for (let y = 0; y < height; y += 40) {
          const distX = x - width / 2
          const distY = y - height / 2
          const dist = Math.sqrt(distX * distX + distY * distY)
          const maxDist = width / 2

          if (dist < maxDist) {
            const opacity = (1 - dist / maxDist) * 0.5
            const size = Math.sin(time + x * 0.01 + y * 0.01) * 2 + 3

            ctx.beginPath()
            ctx.arc(x, y, size, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(10, 132, 255, ${opacity})`
            ctx.fill()
          }
        }
      }

      // Center glow
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(width / 2, height / 2, width / 3, 0, Math.PI * 2)
      ctx.fill()

      time += 0.02
      animationFrameId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas ref={canvasRef} className="w-full h-[400px] md:h-[500px] float-animation" style={{ maxWidth: "600px" }} />
  )
}
