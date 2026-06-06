import {
  LIBROS_RVR_1909,
  construirBibliaDesdeVersos,
  type BibliaData,
  type VersoJson,
} from "@/lib/biblia"

export type ReferenciaBiblica = {
  libro: string
  capitulo: number
  versiculoInicio: number
  versiculoFin?: number
  textoOriginal: string
}

export type PasajeResuelto = {
  referencia: string
  versiculos: { numero: number; texto: string }[]
  error?: string
}

const ALIAS_LIBRO: Record<string, string> = {
  genesis: "Génesis",
  exodo: "Éxodo",
  levitico: "Levítico",
  numeros: "Números",
  deuteronomio: "Deuteronomio",
  josue: "Josué",
  jueces: "Jueces",
  rut: "Rut",
  salmo: "Salmos",
  salmos: "Salmos",
  cantares: "Canción de canciones",
  cantar: "Canción de canciones",
  eclesiastes: "Ecclesiastés",
  ezequiel: "Ezequiel",
  oseas: "Oseas",
  habacuc: "Habacuc",
  sofonias: "Sofonías",
  haggeo: "Haggeo",
  zacarias: "Zacarías",
  malaquias: "Malaquías",
  apocalipsis: "Revelación",
  revelacion: "Revelación",
}

let bibliaCache: BibliaData | null = null
let bibliaCargando: Promise<BibliaData> | null = null

function normalizarClave(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function resolverNombreLibro(fragmento: string): string | null {
  const clave = normalizarClave(fragmento)
  if (ALIAS_LIBRO[clave]) return ALIAS_LIBRO[clave]
  for (const libro of LIBROS_RVR_1909) {
    if (normalizarClave(libro) === clave) return libro
  }
  for (const libro of LIBROS_RVR_1909) {
    if (normalizarClave(libro).startsWith(clave) || clave.startsWith(normalizarClave(libro))) {
      return libro
    }
  }
  return null
}

const librosPorLongitud = [...LIBROS_RVR_1909].sort((a, b) => b.length - a.length)

export async function cargarBiblia(): Promise<BibliaData> {
  if (bibliaCache) return bibliaCache
  if (bibliaCargando) return bibliaCargando
  bibliaCargando = fetch("/biblia/rvr1909.json")
    .then((r) => {
      if (!r.ok) throw new Error("Biblia no disponible")
      return r.json()
    })
    .then((data: { verses?: VersoJson[] }) => {
      if (!Array.isArray(data.verses)) throw new Error("Biblia incompleta")
      bibliaCache = construirBibliaDesdeVersos(data.verses)
      return bibliaCache
    })
  return bibliaCargando
}

export function parsearReferencia(texto: string): ReferenciaBiblica | null {
  const t = texto.trim().replace(/\s+/g, " ")
  const m = t.match(
    /^((?:\d\s+)?(?:1|2|3)\s+)?(.+?)\s+(\d+)\s*:\s*(\d+)(?:\s*[-–]\s*(\d+))?$/i
  )
  if (!m) return null
  const pref = (m[1] ?? "").trim()
  const nombreRaw = `${pref ? pref + " " : ""}${m[2].trim()}`.trim()
  const libro = resolverNombreLibro(nombreRaw)
  if (!libro) return null
  return {
    libro,
    capitulo: Number(m[3]),
    versiculoInicio: Number(m[4]),
    versiculoFin: m[5] ? Number(m[5]) : undefined,
    textoOriginal: t,
  }
}

export function encontrarReferenciasEnTexto(texto: string): ReferenciaBiblica[] {
  const refs: ReferenciaBiblica[] = []
  const vistos = new Set<string>()

  for (const libro of librosPorLongitud) {
    const esc = libro.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const re = new RegExp(
      `(?:\\b(\\d)\\s+)?\\b(${esc})\\s+(\\d+)\\s*:\\s*(\\d+)(?:\\s*[-–]\\s*(\\d+))?`,
      "gi"
    )
    let m: RegExpExecArray | null
    while ((m = re.exec(texto)) !== null) {
      const pref = m[1] ? `${m[1]} ` : ""
      const nombreRaw = `${pref}${m[2]}`.trim()
      const libroOk = resolverNombreLibro(nombreRaw) ?? resolverNombreLibro(m[2])
      if (!libroOk) continue
      const ref: ReferenciaBiblica = {
        libro: libroOk,
        capitulo: Number(m[3]),
        versiculoInicio: Number(m[4]),
        versiculoFin: m[5] ? Number(m[5]) : undefined,
        textoOriginal: m[0].trim(),
      }
      const key = `${ref.libro}|${ref.capitulo}|${ref.versiculoInicio}|${ref.versiculoFin ?? ""}`
      if (!vistos.has(key)) {
        vistos.add(key)
        refs.push(ref)
      }
    }
  }

  return refs.sort((a, b) => texto.indexOf(a.textoOriginal) - texto.indexOf(b.textoOriginal))
}

export function referenciaEtiqueta(ref: ReferenciaBiblica): string {
  const fin = ref.versiculoFin && ref.versiculoFin !== ref.versiculoInicio
    ? `–${ref.versiculoFin}`
    : ""
  return `${ref.libro} ${ref.capitulo}:${ref.versiculoInicio}${fin}`
}

export async function resolverPasaje(ref: ReferenciaBiblica): Promise<PasajeResuelto> {
  const etiqueta = referenciaEtiqueta(ref)
  try {
    const biblia = await cargarBiblia()
    const cap = biblia[ref.libro]?.[String(ref.capitulo)]
    if (!cap) return { referencia: etiqueta, versiculos: [], error: "Capítulo no encontrado" }
    const fin = ref.versiculoFin ?? ref.versiculoInicio
    const versiculos: { numero: number; texto: string }[] = []
    for (let v = ref.versiculoInicio; v <= fin; v++) {
      const txt = cap[String(v)]
      if (txt) versiculos.push({ numero: v, texto: txt })
    }
    if (versiculos.length === 0) {
      return { referencia: etiqueta, versiculos: [], error: "Versículo no encontrado" }
    }
    return { referencia: etiqueta, versiculos }
  } catch {
    return { referencia: etiqueta, versiculos: [], error: "No se pudo cargar la Biblia" }
  }
}

export type SegmentoTexto =
  | { tipo: "texto"; valor: string }
  | { tipo: "pasaje"; ref: ReferenciaBiblica }

export function segmentarConPasajes(texto: string): SegmentoTexto[] {
  if (!texto.trim()) return []

  const matches: { inicio: number; fin: number; ref: ReferenciaBiblica }[] = []

  for (const libro of librosPorLongitud) {
    const esc = libro.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const re = new RegExp(
      `(?:\\b(\\d)\\s+)?\\b(${esc})\\s+(\\d+)\\s*:\\s*(\\d+)(?:\\s*[-–]\\s*(\\d+))?`,
      "gi"
    )
    let m: RegExpExecArray | null
    while ((m = re.exec(texto)) !== null) {
      const pref = m[1] ? `${m[1]} ` : ""
      const libroOk = resolverNombreLibro(`${pref}${m[2]}`.trim()) ?? resolverNombreLibro(m[2])
      if (!libroOk) continue
      matches.push({
        inicio: m.index,
        fin: m.index + m[0].length,
        ref: {
          libro: libroOk,
          capitulo: Number(m[3]),
          versiculoInicio: Number(m[4]),
          versiculoFin: m[5] ? Number(m[5]) : undefined,
          textoOriginal: m[0].trim(),
        },
      })
    }
  }

  matches.sort((a, b) => a.inicio - b.inicio)

  const unicos: typeof matches = []
  let ultimoFin = -1
  for (const m of matches) {
    if (m.inicio < ultimoFin) continue
    unicos.push(m)
    ultimoFin = m.fin
  }

  const segmentos: SegmentoTexto[] = []
  let cursor = 0
  for (const m of unicos) {
    if (m.inicio > cursor) {
      segmentos.push({ tipo: "texto", valor: texto.slice(cursor, m.inicio) })
    }
    segmentos.push({ tipo: "pasaje", ref: m.ref })
    cursor = m.fin
  }
  if (cursor < texto.length) {
    segmentos.push({ tipo: "texto", valor: texto.slice(cursor) })
  }
  if (segmentos.length === 0) segmentos.push({ tipo: "texto", valor: texto })
  return segmentos
}
