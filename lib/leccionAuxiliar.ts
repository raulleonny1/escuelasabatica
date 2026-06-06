import { getPdfUrl } from "@/lib/pdfUrls"
import { cargarLeccionPorDias, extraerParrafosPdf, type DiaLeccionTexto } from "@/lib/leccionTexto"

export type PreguntaRespondida = {
  numero?: string
  pregunta: string
  respuesta: string
  pasajes?: string
}

const cacheParrafos = new Map<string, string[]>()

async function cargarParrafosPdf(url: string): Promise<string[] | null> {
  const cacheado = cacheParrafos.get(url)
  if (cacheado) return cacheado
  try {
    const pdfjs = await import("pdfjs-dist")
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js"
    const doc = await pdfjs.getDocument(url).promise
    const parrafos = await extraerParrafosPdf(doc)
    await doc.destroy().catch(() => {})
    cacheParrafos.set(url, parrafos)
    return parrafos
  } catch {
    return null
  }
}

function limpiarTextoResumen(texto: string): string {
  return texto
    .replace(/\s*—\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Un bloque de resumen por cada día (índice 0 = sábado … 6 = viernes). */
export function parsearResumenPorDia(parrafos: string[]): string[] {
  const dias = Array.from({ length: 7 }, () => "")
  if (!parrafos.length) return dias

  const texto = parrafos.join("\n\n").replace(/\s+/g, " ").trim()

  if (texto.includes("❖")) {
    const trozos = texto
      .split(/❖/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20)
    let inicio = 0
    if (trozos[0] && trozos[0].length < 90 && /^[A-D]\s/.test(trozos[0])) inicio = 1
    trozos.slice(inicio).forEach((sec, i) => {
      if (i < 7) dias[i] = limpiarTextoResumen(sec)
    })
    return dias
  }

  const numerados = texto
    .split(/(?=\d+\.\s+[A-ZÁÉÍ¿«])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25)
  if (numerados.length >= 2) {
    numerados.forEach((sec, i) => {
      if (i < 7) dias[i] = limpiarTextoResumen(sec)
    })
    return dias
  }

  parrafos
    .map((p) => limpiarTextoResumen(p))
    .filter((p) => p.length > 20)
    .forEach((p, i) => {
      if (i < 7) dias[i] = p
    })
  return dias
}

function limpiarEncabezadoPreguntas(texto: string): string {
  return texto
    .replace(/^Lección\s+\d+[^\n]*\n?/i, "")
    .replace(/^Cánticos de las Escrituras:[^\n]*\n?/i, "")
    .trim()
}

function extraerPasajes(rest: string): { respuesta: string; pasajes?: string } {
  const match = rest.match(/Pasajes?\s+bíblicos?:\s*(.+)$/i)
  if (!match) return { respuesta: rest.trim() }
  return {
    respuesta: rest.slice(0, match.index).trim(),
    pasajes: match[1].trim(),
  }
}

function parsearPreguntasEnSecciones(texto: string): PreguntaRespondida[][] {
  const limpio = limpiarEncabezadoPreguntas(texto.replace(/\s+/g, " "))
  const secciones: PreguntaRespondida[][] = []
  const bloques = limpio.split(/(?=\b[A-Z]\.\s+)/).filter(Boolean)

  for (const sec of bloques) {
    if (!/\d+\.\s+/.test(sec)) continue
    const cuerpo = sec.replace(/^[A-Z]\.\s+[^0-9]+/, "").trim()
    const grupo: PreguntaRespondida[] = []
    const re = /(\d+)\.\s+([\s\S]*?)(?=\d+\.\s+|$)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(cuerpo)) !== null) {
      const raw = m[2].trim()
      if (raw.length < 8) continue
      const partes = raw.split(/Respuesta:\s*/i)
      const pregunta = partes[0].trim()
      const { respuesta, pasajes } = extraerPasajes(
        partes.length > 1 ? partes.slice(1).join("Respuesta: ").trim() : ""
      )
      grupo.push({ numero: m[1], pregunta, respuesta, pasajes })
    }
    if (grupo.length) secciones.push(grupo)
  }
  return secciones
}

export function parsearPreguntasTexto(parrafos: string[]): PreguntaRespondida[] {
  if (!parrafos.length) return []
  const texto = parrafos.join("\n\n")

  if (/Pregunta:\s/i.test(texto)) {
    const lista: PreguntaRespondida[] = []
    for (const bloque of texto.split(/Pregunta:\s*/i).filter(Boolean)) {
      const partes = bloque.split(/Respuesta:\s*/i)
      const pregunta = partes[0].replace(/\s+/g, " ").trim()
      if (!pregunta) continue
      const { respuesta, pasajes } = extraerPasajes(
        partes.slice(1).join("Respuesta: ").replace(/\s+/g, " ").trim()
      )
      lista.push({ pregunta, respuesta, pasajes })
    }
    return lista
  }

  const plano = texto.replace(/\s+/g, " ")
  if (/\b[A-Z]\.\s+.+\d+\.\s+/.test(plano)) {
    return parsearPreguntasEnSecciones(plano).flat()
  }

  const numeradas: PreguntaRespondida[] = []
  const re = /(\d+)\.\s+([\s\S]*?)(?=\d+\.\s+|$)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(plano)) !== null) {
    const cuerpo = m[2].trim()
    if (cuerpo.length < 10) continue
    const partes = cuerpo.split(/Respuesta:\s*/i)
    const pregunta = partes[0].trim()
    if (!pregunta || pregunta.length < 8) continue
    const { respuesta, pasajes } = extraerPasajes(
      partes.length > 1 ? partes.slice(1).join("Respuesta: ").trim() : ""
    )
    numeradas.push({ numero: m[1], pregunta, respuesta, pasajes })
  }
  return numeradas
}

/** Reparte ítems entre los 7 días (sábado → viernes). */
function repartirPorDias<T>(items: T[]): T[][] {
  const dias: T[][] = Array.from({ length: 7 }, () => [])
  items.forEach((item, i) => {
    dias[i % 7].push(item)
  })
  return dias
}

/** Secciones A/B/C del PDF → bloques de días consecutivos. */
function repartirSeccionesPreguntas(secciones: PreguntaRespondida[][]): PreguntaRespondida[][] {
  const dias: PreguntaRespondida[][] = Array.from({ length: 7 }, () => [])
  if (!secciones.length) return dias

  const rangos: number[][] =
    secciones.length === 3
      ? [[0, 1, 2], [3, 4], [5, 6]]
      : secciones.length === 2
        ? [[0, 1, 2, 3], [4, 5, 6]]
        : [Array.from({ length: 7 }, (_, i) => i)]

  secciones.forEach((grupo, si) => {
    const destinos = rangos[si] ?? [si]
    grupo.forEach((preg, pi) => {
      dias[destinos[pi % destinos.length]].push(preg)
    })
  })
  return dias
}

export function parsearPreguntasPorDia(parrafos: string[]): PreguntaRespondida[][] {
  const dias: PreguntaRespondida[][] = Array.from({ length: 7 }, () => [])
  if (!parrafos.length) return dias

  const texto = parrafos.join("\n\n")
  const plano = texto.replace(/\s+/g, " ")

  if (/\b[A-Z]\.\s+.+\d+\.\s+/.test(plano)) {
    const secciones = parsearPreguntasEnSecciones(plano)
    if (secciones.length >= 2) return repartirSeccionesPreguntas(secciones)
  }

  return repartirPorDias(parsearPreguntasTexto(parrafos))
}

/** Si el PDF no trae respuesta, se responde con el fragmento del resumen del mismo día. */
function completarRespuestasDelDia(
  preguntas: PreguntaRespondida[],
  resumen: string
): PreguntaRespondida[] {
  if (!preguntas.length) return []
  const fragmentos = resumen
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30)

  return preguntas.map((p, i) => {
    if (p.respuesta.trim()) return p
    const respuesta =
      fragmentos[i] ?? fragmentos[fragmentos.length - 1] ?? resumen
    return { ...p, respuesta: respuesta || "" }
  })
}

export type DiaLeccionCompleto = DiaLeccionTexto & {
  resumen: string
  preguntas: PreguntaRespondida[]
}

export async function cargarSemanaCompleta(semana: number): Promise<DiaLeccionCompleto[]> {
  const [diasLeccion, parrafosResumen, parrafosPreguntas] = await Promise.all([
    cargarLeccionPorDias(getPdfUrl(semana, "leccion"), semana),
    cargarParrafosPdf(getPdfUrl(semana, "resumen")),
    cargarParrafosPdf(getPdfUrl(semana, "preguntas")),
  ])

  const resumenPorDia = parsearResumenPorDia(parrafosResumen ?? [])
  const preguntasPorDia = parsearPreguntasPorDia(parrafosPreguntas ?? [])

  return diasLeccion.map((dia, i) => {
    const resumen = resumenPorDia[i] ?? ""
    const preguntas = completarRespuestasDelDia(preguntasPorDia[i] ?? [], resumen)
    return { ...dia, resumen, preguntas }
  })
}

export function diaTieneContenido(dia: DiaLeccionCompleto): boolean {
  return (
    dia.parrafos.length > 0 ||
    dia.contenido.trim().length > 0 ||
    dia.resumen.trim().length > 0 ||
    dia.preguntas.length > 0
  )
}
