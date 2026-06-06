import type { PDFDocumentProxy } from "pdfjs-dist"
import { getFechasSemana, type DiaSemana } from "@/lib/semana"
import { getTerminosBusquedaDia } from "@/lib/leccionPdf"

export type DiaLeccionTexto = {
  fecha: string
  etiqueta: string
  titulo: string
  contenido: string
  /** Párrafos ya separados como en el PDF */
  parrafos: string[]
}

type LineaExtraida = {
  texto: string
  y: number
  fontSize: number
  page: number
}

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function indiceEnTexto(texto: string, termino: string): number {
  return normalizarTexto(texto).indexOf(normalizarTexto(termino))
}

function esRuidoPdf(texto: string): boolean {
  const t = texto.trim()
  if (!t) return true
  if (/^\d{1,3}$/.test(t)) return true
  if (/^sabbath school/i.test(t)) return true
  if (/^adult/i.test(t) && t.length < 30) return true
  if (/^www\./i.test(t)) return true
  return false
}

function unirLineasEnOracion(anterior: string, siguiente: string): string {
  const a = anterior.trimEnd()
  const b = siguiente.trimStart()
  if (!a) return b
  if (!b) return a
  if (a.endsWith("-")) return a.slice(0, -1) + b
  return `${a} ${b}`
}

function mediana(nums: number[]): number {
  if (!nums.length) return 14
  const s = [...nums].sort((x, y) => x - y)
  return s[Math.floor(s.length / 2)]
}

async function extraerLineasPdf(doc: PDFDocumentProxy): Promise<LineaExtraida[]> {
  const lineas: LineaExtraida[] = []

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    const vp = page.getViewport({ scale: 1 })
    const altura = vp.height

    const filas = new Map<number, { partes: { x: number; t: string; fs: number }[] }>()

    for (const item of content.items) {
      if (!("str" in item)) continue
      const raw = String(item.str)
      if (!raw.trim()) continue
      const tr = item.transform
      const x = tr[4]
      const yTop = altura - tr[5]
      const fs = Math.max(Math.abs(tr[0]), Math.abs(tr[3]), 9)
      const yKey = Math.round(yTop / 2.5) * 2.5

      if (!filas.has(yKey)) filas.set(yKey, { partes: [] })
      filas.get(yKey)!.partes.push({ x, t: raw.trim(), fs })
    }

    const ys = [...filas.keys()].sort((a, b) => a - b)
    for (const y of ys) {
      const partes = filas.get(y)!.partes.sort((a, b) => a.x - b.x)
      const texto = partes
        .map((pt) => pt.t)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
      if (!texto || esRuidoPdf(texto)) continue
      const fontSize = partes.reduce((acc, pt) => acc + pt.fs, 0) / partes.length
      lineas.push({ texto, y, fontSize, page: p })
    }
  }

  return lineas
}

/** Agrupa líneas del PDF en párrafos según espacio vertical (como el impreso). */
export function lineasAParrafos(lineas: LineaExtraida[]): string[] {
  if (!lineas.length) return []

  const parrafos: string[] = []
  let acumulado = ""
  let prev: LineaExtraida | null = null

  for (const lin of lineas) {
    if (!prev) {
      acumulado = lin.texto
      prev = lin
      continue
    }

    const gapsPagina = lineas
      .filter((l) => l.page === prev!.page)
      .slice(1)
      .map((l, i, arr) => l.y - (i === 0 ? lineas.find((x) => x.page === l.page)!.y : arr[i - 1].y))

    const lineasPagina = lineas.filter((l) => l.page === prev!.page)
    const gaps: number[] = []
    for (let i = 1; i < lineasPagina.length; i++) {
      gaps.push(lineasPagina[i].y - lineasPagina[i - 1].y)
    }
    const gapTipico = mediana(gaps) || 14

    const cambioPagina = lin.page !== prev.page
    const gapY = cambioPagina ? gapTipico * 2 : lin.y - prev.y
    const saltoParrafo = gapY > gapTipico * 1.45 || cambioPagina

    if (saltoParrafo && acumulado.trim()) {
      parrafos.push(acumulado.trim())
      acumulado = lin.texto
    } else {
      acumulado = unirLineasEnOracion(acumulado, lin.texto)
    }
    prev = lin
  }

  if (acumulado.trim()) parrafos.push(acumulado.trim())
  return parrafos.filter((p) => p.length > 1 && !esRuidoPdf(p))
}

export async function extraerParrafosPdf(doc: PDFDocumentProxy): Promise<string[]> {
  const lineas = await extraerLineasPdf(doc)
  return lineasAParrafos(lineas)
}

/** Texto completo con párrafos separados por doble salto (legado). */
export async function extraerTextoPdf(doc: PDFDocumentProxy): Promise<string> {
  const parrafos = await extraerParrafosPdf(doc)
  return parrafos.join("\n\n")
}

function etiquetaDia(dia: DiaSemana): string {
  return `${dia.diaCorto} ${dia.diaNum} ${dia.mesCorto}`
}

function limpiarInicioDia(contenido: string, tituloDia: string): string {
  let t = contenido.trim()
  const normTitulo = normalizarTexto(tituloDia)
  if (normalizarTexto(t).startsWith(normTitulo.slice(0, 10))) {
    t = t.slice(tituloDia.length).trim()
  }
  return t.replace(/^\W+/, "").trim()
}

/** Divide párrafos del documento por día de la semana. */
export function dividirParrafosPorDias(
  parrafos: string[],
  semana: number
): DiaLeccionTexto[] {
  const dias = getFechasSemana(semana)
  const textoCompleto = parrafos.join("\n\n")

  type Marca = { fecha: string; etiqueta: string; titulo: string; indiceParrafo: number }
  const marcas: Marca[] = []

  for (const dia of dias) {
    const terminos = getTerminosBusquedaDia(dia.fecha)
    for (const termino of terminos) {
      const idxTexto = indiceEnTexto(textoCompleto, termino)
      if (idxTexto < 0) continue
      let idxParrafo = 0
      let pos = 0
      for (let i = 0; i < parrafos.length; i++) {
        if (pos >= idxTexto) {
          idxParrafo = i
          break
        }
        pos += parrafos[i].length + 2
        idxParrafo = i + 1
      }
      marcas.push({
        fecha: dia.fecha,
        etiqueta: etiquetaDia(dia),
        titulo: termino,
        indiceParrafo: idxParrafo,
      })
      break
    }
  }

  marcas.sort((a, b) => a.indiceParrafo - b.indiceParrafo)
  const unicos = marcas.filter((m, i, arr) => arr.findIndex((x) => x.fecha === m.fecha) === i)

  if (!unicos.length) {
    return [
      {
        fecha: dias[0]?.fecha ?? "",
        etiqueta: "Semana completa",
        titulo: `Semana ${semana}`,
        contenido: textoCompleto,
        parrafos: [...parrafos],
      },
    ]
  }

  const resultado: DiaLeccionTexto[] = []

  for (let i = 0; i < unicos.length; i++) {
    const actual = unicos[i]
    const fin = i + 1 < unicos.length ? unicos[i + 1].indiceParrafo : parrafos.length
    let slice = parrafos.slice(actual.indiceParrafo, fin)

    if (slice[0] && indiceEnTexto(slice[0], actual.titulo) >= 0) {
      slice = slice.slice(1)
    }

    slice = slice.filter((p) => !getTerminosBusquedaDia(actual.fecha).some((t) => indiceEnTexto(p, t) === 0 && p.length < 40))

    resultado.push({
      fecha: actual.fecha,
      etiqueta: actual.etiqueta,
      titulo: actual.titulo,
      contenido: slice.join("\n\n"),
      parrafos: slice,
    })
  }

  for (const dia of dias) {
    if (!resultado.some((r) => r.fecha === dia.fecha)) {
      resultado.push({
        fecha: dia.fecha,
        etiqueta: etiquetaDia(dia),
        titulo: "",
        contenido: "",
        parrafos: [],
      })
    }
  }

  resultado.sort((a, b) => {
    const ia = dias.findIndex((d) => d.fecha === a.fecha)
    const ib = dias.findIndex((d) => d.fecha === b.fecha)
    return ia - ib
  })

  return resultado
}

export function dividirLeccionPorDias(textoCompleto: string, semana: number): DiaLeccionTexto[] {
  const parrafos = textoCompleto
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
  return dividirParrafosPorDias(parrafos, semana)
}

const cacheParrafos = new Map<string, string[]>()

export function leerParrafosLeccionCacheados(url: string): string[] | null {
  return cacheParrafos.get(url) ?? null
}

export async function cargarLeccionPorDias(
  url: string,
  semana: number
): Promise<DiaLeccionTexto[]> {
  let parrafos = leerParrafosLeccionCacheados(url)
  if (!parrafos) {
    const pdfjs = await import("pdfjs-dist")
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js"
    const doc = await pdfjs.getDocument(url).promise
    parrafos = await extraerParrafosPdf(doc)
    await doc.destroy().catch(() => {})
    cacheParrafos.set(url, parrafos)
  }
  return dividirParrafosPorDias(parrafos, semana)
}
