import { createCanvas } from "canvas"
import { writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, "..", "public")

function drawIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext("2d")

  const r = size * 0.12
  ctx.fillStyle = "#1e3a5f"
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(size - r, 0)
  ctx.quadraticCurveTo(size, 0, size, r)
  ctx.lineTo(size, size - r)
  ctx.quadraticCurveTo(size, size, size - r, size)
  ctx.lineTo(r, size)
  ctx.quadraticCurveTo(0, size, 0, size - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = "#c9a227"
  ctx.lineWidth = size * 0.04
  ctx.strokeRect(size * 0.1, size * 0.1, size * 0.8, size * 0.8)

  ctx.fillStyle = "#c9a227"
  ctx.font = `bold ${Math.round(size * 0.38)}px Georgia, serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("✝", size / 2, size / 2 + size * 0.02)

  return canvas.toBuffer("image/png")
}

for (const size of [192, 512]) {
  writeFileSync(join(publicDir, `icon-${size}.png`), drawIcon(size))
  console.log(`icon-${size}.png`)
}
