import type { PDFDocumentProxy } from "pdfjs-dist"
import { getFechaDestacadaEnSemana } from "@/lib/semana"

const NOMBRES_DIA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

/** Fecha a la que ir al abrir Lección: hoy si cae en la semana, si no el sábado de esa semana */
export function getFechaLecturaParaSemana(semana: number): string {
  return getFechaDestacadaEnSemana(semana)
}

export function getTerminosBusquedaDia(fecha: string): string[] {
  const d = new Date(fecha + "T12:00:00")
  const nombre = NOMBRES_DIA[d.getDay()]
  const num = d.getDate()
  const mes = MESES[d.getMonth()]
  return [`${nombre} ${num} de ${mes}`, `${nombre} ${num}`, nombre]
}

export async function findPageIndexForDay(
  doc: PDFDocumentProxy,
  fecha: string
): Promise<number> {
  const terminos = getTerminosBusquedaDia(fecha).map(normalizarTexto)

  for (const termino of terminos) {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      const text = normalizarTexto(
        content.items.map((it) => ("str" in it ? String(it.str) : "")).join("")
      )
      if (text.includes(termino)) return i - 1
    }
  }

  return 0
}
