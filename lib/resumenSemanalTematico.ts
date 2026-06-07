import { formatearParrafosDia } from "@/lib/leccionFormato"
import type { DiaLeccionCompleto, PreguntaRespondida } from "@/lib/leccionAuxiliar"

export type ObjetivoSemanal = {
  numero: number
  verbo: string
  titulo: string
  parrafos: string[]
  indicadores: string[]
}

export type ResumenSemanalTematico = {
  semana: number
  tituloLeccion: string
  introPedagogica: string
  objetivos: ObjetivoSemanal[]
  cierre: string
}

type MarcoObjetivo = {
  verbo: string
  titulo: (leccion: string) => string
  puntaje: (texto: string) => number
  orden: number
}

const MARCOS: MarcoObjetivo[] = [
  {
    verbo: "Comprender",
    titulo: (l) => `Comprender el mensaje central de «${l}»`,
    orden: 1,
    puntaje: (t) =>
      contarPatrones(t, [
        /mensaje|enseña|significa|central|idea|propósito|invita|revela|muestra|explica|panorama|síntesis|resumen|lección|semana|tema\s+de/,
        /contexto|significado|por\s+qué|importancia|desafío|pregunta\s+central/,
      ]),
  },
  {
    verbo: "Descubrir",
    titulo: () => "Descubrir en las Escrituras los fundamentos bíblicos del estudio",
    orden: 2,
    puntaje: (t) =>
      contarPatrones(t, [
        /escritura|biblia|pasaje|versículo|versiculo|texto|evangelio|profeta|apóstol|apostol/,
        /relato|historia|episodio|narra|cuenta|génesis|exodo|mateo|marcos|lucas|juan|hechos|romanos/,
        /jesús|jesus|cristo|pablo|moises|moses|david|elías|elias|daniel|israel|jerusalén|jerusalen/,
      ]),
  },
  {
    verbo: "Reflexionar",
    titulo: () => "Reflexionar sobre las implicaciones para la fe personal",
    orden: 3,
    puntaje: (t) =>
      contarPatrones(t, [
        /fe|creer|confiar|corazón|corazon|oración|oracion|relación|relacion|dios|gracia|amor|perdón|perdon/,
        /esperanza|paz|gozo|arrepent|santidad|consagr|medi|nosotros|nuestra|personal|experiencia|meditar/,
        /significa\s+para|implica|desafía|desafia|cuestiona|convicción|conviccion/,
      ]),
  },
  {
    verbo: "Aplicar",
    titulo: () => "Aplicar lo aprendido a la vida diaria y al servicio cristiano",
    orden: 4,
    puntaje: (t) =>
      contarPatrones(t, [
        /vida|iglesia|servir|servicio|obediencia|testimonio|práctica|practica|hoy|comunidad|familia|trabajo/,
        /decisión|decision|conducta|compartir|llamado|misión|mision|prójimo|projimo|obedec|testificar/,
        /cambiar|transform|vivir|demostrar|mostrar\s+en|llevar\s+a|poner\s+en\s+práctica/,
      ]),
  },
]

function contarPatrones(texto: string, grupos: RegExp[]): number {
  const t = texto.toLowerCase()
  let n = 0
  for (const re of grupos) {
    const m = t.match(new RegExp(re.source, "gi"))
    if (m) n += m.length
  }
  return n
}

function extraerTituloLeccion(dias: DiaLeccionCompleto[]): string {
  for (const dia of dias) {
    const bloques = formatearParrafosDia(dia.parrafos)
    for (const b of bloques) {
      if (b.tipo === "tituloLeccion") {
        return b.texto.replace(/\s+/g, " ").trim()
      }
    }
  }
  return "Lección de la semana"
}

function normalizarOracion(texto: string): string {
  return texto.replace(/\s+/g, " ").trim()
}

function oraciones(texto: string): string[] {
  return normalizarOracion(texto)
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25)
}

function poolResumenSemana(dias: DiaLeccionCompleto[]): string[] {
  const vistos = new Set<string>()
  const out: string[] = []

  for (const dia of dias) {
    const resumen = dia.resumen.trim()
    if (resumen.length < 30) continue

    for (const oracion of oraciones(resumen)) {
      const clave = oracion.toLowerCase().slice(0, 90)
      if (vistos.has(clave)) continue
      vistos.add(clave)
      out.push(oracion)
    }
  }

  return out
}

function poolRespuestasSemana(dias: DiaLeccionCompleto[]): string[] {
  const vistos = new Set<string>()
  const out: string[] = []

  for (const dia of dias) {
    for (const p of dia.preguntas) {
      const resp = p.respuesta.trim()
      if (resp.length < 40) continue
      for (const oracion of oraciones(resp)) {
        const clave = oracion.toLowerCase().slice(0, 90)
        if (vistos.has(clave)) continue
        vistos.add(clave)
        out.push(oracion)
      }
    }
  }

  return out
}

function todasLasPreguntas(dias: DiaLeccionCompleto[]): PreguntaRespondida[] {
  return dias.flatMap((d) => d.preguntas).filter((p) => p.pregunta.trim().length > 12)
}

function preguntaAIndicador(pregunta: string): string {
  let t = pregunta.trim().replace(/^[\d.]+\s*/, "").replace(/[¿?]/g, "").trim()
  if (t.length > 100) t = `${t.slice(0, 97)}…`

  if (/^qué|^que/i.test(t)) return `Identificar ${t.replace(/^qu[eé]\s+/i, "")}`
  if (/^cuál|^cual/i.test(t)) return `Determinar ${t.replace(/^cu[aá]l\s+/i, "")}`
  if (/^cómo|^como/i.test(t)) return `Explicar ${t.replace(/^c[oó]mo\s+/i, "")}`
  if (/^por qué|^por que/i.test(t)) return `Analizar ${t.replace(/^por\s+qu[eé]\s+/i, "")}`
  if (/^en qué|^en que/i.test(t)) return `Reconocer ${t.replace(/^en\s+qu[eé]\s+/i, "")}`

  return t.charAt(0).toUpperCase() + t.slice(1)
}

function asignarAMarco(texto: string): number {
  let mejor = 0
  let mejorPunt = -1
  MARCOS.forEach((marco, i) => {
    const punt = marco.puntaje(texto)
    if (punt > mejorPunt || (punt === mejorPunt && marco.orden < MARCOS[mejor].orden)) {
      mejorPunt = punt
      mejor = i
    }
  })
  return mejor
}

function tejerOraciones(lista: string[]): string[] {
  if (!lista.length) return []

  const parrafos: string[] = []
  let actual = ""

  for (const oracion of lista) {
    if (actual.length + oracion.length > 520 && actual.length > 90) {
      parrafos.push(actual.trim())
      actual = oracion
    } else {
      actual = actual ? `${actual} ${oracion}` : oracion
    }
  }
  if (actual.trim()) parrafos.push(actual.trim())
  return parrafos
}

function deduplicarIndicadores(lista: string[]): string[] {
  const out: string[] = []
  for (const raw of lista) {
    const t = raw.trim()
    if (t.length < 12) continue
    const dup = out.some(
      (x) => x.toLowerCase().slice(0, 40) === t.toLowerCase().slice(0, 40)
    )
    if (!dup) out.push(t)
  }
  return out.slice(0, 3)
}

function cierreDesdePool(pool: string[], tituloLeccion: string): string {
  if (pool.length >= 2) {
    const ultimas = pool.slice(-2).join(" ")
    if (ultimas.length > 50) return ultimas
  }
  return `Al cerrar «${tituloLeccion}», el estudio busca que la Palabra no se quede en la página, sino que oriente la fe y las decisiones concretas de esta semana.`
}

export function construirResumenSemanalTematico(
  semana: number,
  dias: DiaLeccionCompleto[]
): ResumenSemanalTematico {
  const tituloLeccion = extraerTituloLeccion(dias)
  const pool = [...poolResumenSemana(dias), ...poolRespuestasSemana(dias)]

  const asignado: string[][] = MARCOS.map(() => [])
  for (const oracion of pool) {
    asignado[asignarAMarco(oracion)].push(oracion)
  }

  const preguntas = todasLasPreguntas(dias)
  const indicadoresPorMarco: string[][] = MARCOS.map(() => [])
  for (const p of preguntas) {
    const texto = `${p.pregunta} ${p.respuesta}`
    indicadoresPorMarco[asignarAMarco(texto)].push(preguntaAIndicador(p.pregunta))
  }

  const objetivos: ObjetivoSemanal[] = MARCOS.map((marco, i) => ({
    numero: marco.orden,
    verbo: marco.verbo,
    titulo: marco.titulo(tituloLeccion),
    parrafos: tejerOraciones(asignado[i]),
    indicadores: deduplicarIndicadores(indicadoresPorMarco[i]),
  })).filter((o) => o.parrafos.length > 0 || o.indicadores.length > 0)

  if (!objetivos.length && pool.length) {
    objetivos.push({
      numero: 1,
      verbo: "Sintetizar",
      titulo: `Retener lo esencial de «${tituloLeccion}»`,
      parrafos: tejerOraciones(pool),
      indicadores: [],
    })
  }

  const introPedagogica =
    objetivos.length > 0
      ? `Resumen de la semana completa, organizado por lo que el estudio busca lograr: comprender, descubrir, reflexionar y aplicar. No repasa día a día ni repite los títulos de cada jornada.`
      : `Aún no hay resumen descargado para la semana ${semana}. Abre la lección con internet para cargar el PDF auxiliar de resumen.`

  return {
    semana,
    tituloLeccion,
    introPedagogica,
    objetivos,
    cierre: cierreDesdePool(pool, tituloLeccion),
  }
}
