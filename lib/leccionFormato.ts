import { segmentarConPasajes } from "@/lib/pasajeBiblico"

export type BloqueLeccion =
  | { tipo: "tituloLeccion"; texto: string }
  | { tipo: "titulo"; texto: string }
  | { tipo: "subtitulo"; texto: string }
  | { tipo: "versiculoMemoria"; segmentos: ReturnType<typeof segmentarConPasajes> }
  | { tipo: "parrafo"; segmentos: ReturnType<typeof segmentarConPasajes>; inicial?: boolean }
  | { tipo: "cita"; segmentos: ReturnType<typeof segmentarConPasajes> }

const SECCIONES = [
  /^para\s+(?:el\s+)?estudio/i,
  /^para\s+estudiar/i,
  /^para\s+meditar/i,
  /^preguntas?\s+para/i,
  /^vers[ií]culo\s+(?:de\s+)?memoria/i,
  /^versiculo\s+(?:de\s+)?memoria/i,
  /^texto\s+de\s+la\s+lectura/i,
  /^conclusi[oó]n/i,
  /^s[aá]bado\s+tarde/i,
  /^la\s+lecci[oó]n\s+en\s+la\s+iglesia/i,
  /^inside\s+story/i,
  /^further\s+thought/i,
]

const ETIQUETA_VERSICULO = /^vers[ií]culo\s+(?:de\s+)?memoria/i

function esTituloSeccion(texto: string): boolean {
  const t = texto.trim()
  if (t.length > 85 || t.length < 4) return false
  if (/^\d+\.\s/.test(t)) return false
  if (t.includes("?") || t.startsWith("¿")) return false
  if (SECCIONES.some((re) => re.test(t))) return true
  if (/^[A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9\s,–—\-:]{5,}$/.test(t) && t.length < 55) return true
  return false
}

function esEtiquetaVersiculo(texto: string): boolean {
  return ETIQUETA_VERSICULO.test(texto.trim())
}

function esTituloLeccion(texto: string, indice: number): boolean {
  if (indice > 1) return false
  const t = texto.trim()
  if (t.length < 10 || t.length > 140) return false
  if (/\?/.test(t)) return false
  if (/^\d+\./.test(t)) return false
  if (esTituloSeccion(t) || esEtiquetaVersiculo(t)) return false
  if (/^\d+\s*:\s*\d+/.test(t) && t.length < 80) return false
  return true
}

function pareceCitaBiblica(texto: string): boolean {
  const t = texto.trim()
  if (t.length > 320 || t.length < 8) return false
  if (!/\d+\s*:\s*\d+/.test(t)) return false
  const refs = (t.match(/\d+\s*:\s*\d+/g) ?? []).length
  if (refs >= 1 && t.length < 260) return true
  if (refs >= 2 && t.length < 400) return true
  return false
}

function esParrafoCortoReferencia(texto: string): boolean {
  const t = texto.trim()
  return t.length < 100 && /\d+\s*:\s*\d+/.test(t) && !t.endsWith(".")
}

/** Un párrafo del PDF → bloque tipográfico. */
export function formatearParrafosDia(parrafos: string[]): BloqueLeccion[] {
  const lista = parrafos.map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean)
  if (!lista.length) return []

  const out: BloqueLeccion[] = []
  let esperandoVersiculo = false
  let parrafosCuerpo = 0

  for (let i = 0; i < lista.length; i++) {
    const texto = lista[i]

    if (esEtiquetaVersiculo(texto)) {
      out.push({ tipo: "subtitulo", texto: "Versículo de memoria" })
      esperandoVersiculo = true
      continue
    }

    if (esperandoVersiculo) {
      out.push({ tipo: "versiculoMemoria", segmentos: segmentarConPasajes(texto) })
      esperandoVersiculo = false
      continue
    }

    if (esTituloSeccion(texto)) {
      out.push({ tipo: "titulo", texto: texto.replace(/:$/, "") })
      continue
    }

    if (texto.endsWith(":") && texto.length < 65 && !/[?¿]/.test(texto)) {
      out.push({ tipo: "subtitulo", texto: texto })
      continue
    }

    if (esTituloLeccion(texto, i)) {
      out.push({ tipo: "tituloLeccion", texto })
      continue
    }

    if (pareceCitaBiblica(texto) || esParrafoCortoReferencia(texto)) {
      out.push({ tipo: "cita", segmentos: segmentarConPasajes(texto) })
      continue
    }

    out.push({
      tipo: "parrafo",
      segmentos: segmentarConPasajes(texto),
      inicial: parrafosCuerpo === 0,
    })
    parrafosCuerpo++
  }

  return out
}

/** @deprecated Usar formatearParrafosDia */
export function formatearContenidoDia(contenido: string): BloqueLeccion[] {
  const parrafos = contenido
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
  if (parrafos.length <= 1 && contenido.includes("\n")) {
    return formatearParrafosDia(
      contenido
        .split(/\n/)
        .map((l) => l.trim())
        .filter(Boolean)
    )
  }
  return formatearParrafosDia(parrafos)
}
