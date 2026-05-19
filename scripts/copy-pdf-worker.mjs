import { copyFileSync, existsSync, mkdirSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = join(__dirname, "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.js")
const dest = join(__dirname, "..", "public", "pdf.worker.min.js")

if (!existsSync(src)) {
  console.warn("pdf.worker.min.js no encontrado en pdfjs-dist")
  process.exit(0)
}

mkdirSync(dirname(dest), { recursive: true })
copyFileSync(src, dest)
console.log("Copiado pdf.worker.min.js a public/")
