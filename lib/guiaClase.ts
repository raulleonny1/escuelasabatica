import { doc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from "firebase/firestore"
import { db } from "./firebase"
import { normalizarCodigoClase } from "./clase"
import { getFechasSemana } from "./semana"

export const GUIA_CLASE_EVENT = "guia-clase-actualizada"

export type PestanaClase = "pdf" | "estudio" | "chat"

export type GuiaClase = {
  semana: number
  fecha: string
  diaLabel: string
  tipo: string
  pestana: PestanaClase
  materialUrl: string | null
  materialTitulo: string | null
  guiadoPor: string
  actualizadoMs: number
}

/** @deprecated usar GuiaClase */
export type SesionEstudio = Pick<
  GuiaClase,
  "semana" | "fecha" | "diaLabel" | "guiadoPor" | "actualizadoMs"
> & {
  iniciadaPor: string
  iniciadaAt: Date | null
}

export const ESTUDIO_INICIADO_EVENT = GUIA_CLASE_EVENT

function sesionRef(claseId: string) {
  return doc(db, "clases", normalizarCodigoClase(claseId), "sesion", "actual")
}

function diaLabelDe(semana: number, fecha: string) {
  const dias = getFechasSemana(semana)
  const dia = dias.find((d) => d.fecha === fecha)
  return dia ? `${dia.diaCorto} ${dia.diaNum} ${dia.mesCorto}` : fecha
}

function mapGuia(data: Record<string, unknown>): GuiaClase {
  const ts = data.actualizadoAt as { toMillis?: () => number } | undefined
  const ms = ts?.toMillis?.() ?? 0
  const semana = (data.semana as number) ?? 1
  const fecha = (data.fecha as string) ?? ""
  return {
    semana,
    fecha,
    diaLabel: (data.diaLabel as string) || diaLabelDe(semana, fecha),
    tipo: (data.tipo as string) ?? "leccion",
    pestana: (data.pestana as PestanaClase) ?? "pdf",
    materialUrl: (data.materialUrl as string | null) ?? null,
    materialTitulo: (data.materialTitulo as string | null) ?? null,
    guiadoPor: (data.guiadoPor as string) ?? (data.iniciadaPor as string) ?? "",
    actualizadoMs: ms,
  }
}

export type PublicarGuiaInput = {
  semana: number
  fecha: string
  tipo: string
  pestana: PestanaClase
  materialUrl?: string | null
  materialTitulo?: string | null
}

export async function publicarGuiaMaestro(
  claseId: string,
  maestroNombre: string,
  guia: PublicarGuiaInput
) {
  const diaLabel = diaLabelDe(guia.semana, guia.fecha)
  await setDoc(sesionRef(claseId), {
    semana: guia.semana,
    fecha: guia.fecha,
    diaLabel,
    tipo: guia.tipo,
    pestana: guia.pestana,
    materialUrl: guia.materialUrl ?? null,
    materialTitulo: guia.materialTitulo ?? null,
    guiadoPor: maestroNombre.trim().slice(0, 32),
    iniciadaPor: maestroNombre.trim().slice(0, 32),
    actualizadoAt: serverTimestamp(),
    iniciadaAt: serverTimestamp(),
  })
}

export function subscribeGuiaClase(
  claseId: string,
  onData: (guia: GuiaClase | null) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  if (!claseId) {
    onData(null)
    return () => {}
  }

  return onSnapshot(
    sesionRef(claseId),
    (snap) => {
      if (!snap.exists()) {
        onData(null)
        return
      }
      onData(mapGuia(snap.data()))
    },
    (err) => onError?.(err as Error)
  )
}

/** @deprecated usar subscribeGuiaClase */
export function subscribeSesionEstudio(
  claseId: string,
  onData: (sesion: SesionEstudio | null) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  return subscribeGuiaClase(claseId, (guia) => {
    if (!guia) {
      onData(null)
      return
    }
    onData({
      semana: guia.semana,
      fecha: guia.fecha,
      diaLabel: guia.diaLabel,
      guiadoPor: guia.guiadoPor,
      actualizadoMs: guia.actualizadoMs,
      iniciadaPor: guia.guiadoPor,
      iniciadaAt: guia.actualizadoMs ? new Date(guia.actualizadoMs) : null,
    })
  }, onError)
}

export function etiquetaTipoMaterial(tipo: string): string {
  switch (tipo) {
    case "visual":
      return "Visual"
    case "resumen":
      return "Resumen"
    case "preguntas":
      return "Preguntas"
    default:
      return "Lección"
  }
}
