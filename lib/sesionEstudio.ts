import { doc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from "firebase/firestore"
import { db } from "./firebase"
import { normalizarCodigoClase } from "./clase"
import {
  fechaLocalHoy,
  getFechaDestacadaEnSemana,
  getFechasSemana,
  getSemanaActual,
} from "./semana"

export const ESTUDIO_INICIADO_EVENT = "estudio-iniciado"

export type SesionEstudio = {
  semana: number
  fecha: string
  diaLabel: string
  iniciadaPor: string
  iniciadaAt: Date | null
}

export function getEstudioDeHoy() {
  const semana = getSemanaActual()
  const fecha = getFechaDestacadaEnSemana(semana)
  const dias = getFechasSemana(semana)
  const dia = dias.find((d) => d.fecha === fecha)
  return {
    semana,
    fecha,
    diaLabel: dia ? `${dia.diaCorto} ${dia.diaNum} ${dia.mesCorto}` : fecha,
    esHoy: fecha === fechaLocalHoy(),
  }
}

function sesionRef(claseId: string) {
  return doc(db, "clases", normalizarCodigoClase(claseId), "sesion", "actual")
}

export async function iniciarSesionEstudio(
  claseId: string,
  iniciadaPor: string,
  semana?: number,
  fecha?: string,
  nombreClase?: string
) {
  const hoy = getEstudioDeHoy()
  const s = semana ?? hoy.semana
  const f = fecha ?? hoy.fecha
  const dias = getFechasSemana(s)
  const dia = dias.find((d) => d.fecha === f)
  const diaLabel = dia ? `${dia.diaCorto} ${dia.diaNum} ${dia.mesCorto}` : f

  await setDoc(sesionRef(claseId), {
    semana: s,
    fecha: f,
    diaLabel,
    iniciadaPor: iniciadaPor.trim().slice(0, 32),
    iniciadaAt: serverTimestamp(),
  })

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(ESTUDIO_INICIADO_EVENT, {
        detail: { semana: s, fecha: f, diaLabel, iniciadaPor },
      })
    )
  }

  return { semana: s, fecha: f, diaLabel }
}

export function subscribeSesionEstudio(
  claseId: string,
  onData: (sesion: SesionEstudio | null) => void,
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
      const d = snap.data()
      const ts = d.iniciadaAt as { toDate?: () => Date } | undefined
      onData({
        semana: (d.semana as number) ?? 1,
        fecha: (d.fecha as string) ?? "",
        diaLabel: (d.diaLabel as string) ?? "",
        iniciadaPor: (d.iniciadaPor as string) ?? "",
        iniciadaAt: ts?.toDate?.() ?? null,
      })
    },
    (err) => onError?.(err as Error)
  )
}
