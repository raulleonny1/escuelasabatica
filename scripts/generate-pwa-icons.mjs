import { createCanvas, loadImage } from "canvas"
import { writeFileSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, "..", "public")
const logoPath = join(publicDir, "logoes.png")

const BG = "#f4f1eb"

/** Escala el logo sin deformar (contain) centrado en un cuadrado */
function dibujarIconoCuadrado(img, size, { padding = 0.08, fondo = BG } = {}) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext("2d")

  ctx.fillStyle = fondo
  ctx.fillRect(0, 0, size, size)

  const area = size * (1 - padding * 2)
  const scale = Math.min(area / img.width, area / img.height)
  const w = img.width * scale
  const h = img.height * scale
  const x = (size - w) / 2
  const y = (size - h) / 2

  ctx.drawImage(img, x, y, w, h)
  return canvas.toBuffer("image/png")
}

async function main() {
  if (!existsSync(logoPath)) {
    console.error("No se encontró public/logoes.png")
    process.exit(1)
  }

  const logo = await loadImage(logoPath)
  console.log(`Origen: logoes.png (${logo.width}×${logo.height})`)

  for (const size of [192, 512]) {
    const buf = dibujarIconoCuadrado(logo, size, { padding: 0.06 })
    writeFileSync(join(publicDir, `icon-${size}.png`), buf)
    console.log(`icon-${size}.png`)
  }

  // Copia para Apple / referencia directa
  const buf1024 = dibujarIconoCuadrado(logo, 1024, { padding: 0.06 })
  writeFileSync(join(publicDir, "apple-touch-icon.png"), buf1024)
  console.log("apple-touch-icon.png")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
