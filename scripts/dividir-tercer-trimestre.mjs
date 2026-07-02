/**
 * Parte public/tercer trimestre.pdf en public/pdfs/semanaN/leccion.pdf
 * Ejecutar: node scripts/dividir-tercer-trimestre.mjs
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { PDFDocument } from "pdf-lib"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const origen = path.join(root, "public", "tercer trimestre.pdf")

/** Página donde empieza cada lección (marcador "Lección N: Para el"). */
const INICIOS = [4, 11, 18, 25, 32, 39, 46, 53, 60, 67, 74, 81, 88]

async function main() {
  const bytes = fs.readFileSync(origen)
  const doc = await PDFDocument.load(bytes)
  const total = doc.getPageCount()

  for (let i = 0; i < INICIOS.length; i++) {
    const semana = i + 1
    const desde = INICIOS[i] - 1
    const hasta = i + 1 < INICIOS.length ? INICIOS[i + 1] - 2 : total - 1
    const nuevo = await PDFDocument.create()
    const paginas = await nuevo.copyPages(
      doc,
      Array.from({ length: hasta - desde + 1 }, (_, j) => desde + j)
    )
    paginas.forEach((p) => nuevo.addPage(p))

    const dir = path.join(root, "public", "pdfs", `semana${semana}`)
    fs.mkdirSync(dir, { recursive: true })
    const destino = path.join(dir, "leccion.pdf")
    fs.writeFileSync(destino, await nuevo.save())
    console.log(`Semana ${semana}: páginas ${desde + 1}-${hasta + 1} → ${destino}`)
  }

  console.log("Listo.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
