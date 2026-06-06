import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "./firebase"
import { CLASE_INDEPENDIENTE_ID, normalizarCodigoClase } from "./clase"

const COLECCION = "gruposEnEstudio"

/** Sin pulso reciente → el grupo ya no se muestra (≈2 intervalos de pulso). */
export const MAX_EDAD_GRUPO_MS = 75_000

/** Revisa caducidad aunque Firestore no emita cambios. */
const INTERVALO_REVISION_MS = 10_000

export type GrupoEnEstudio = {
  claseId: string
  nombreClase: string
  maestroNombre: string
  semana: number
  fecha: string
  diaLabel: string
}

type GrupoCache = GrupoEnEstudio & { lastPulseMs: number }

function grupoDoc(claseId: string) {
  return doc(db, COLECCION, normalizarCodigoClase(claseId))
}

function parseLastPulse(raw: unknown): number {
  const ts = raw as { toDate?: () => Date; seconds?: number } | undefined
  if (ts?.toDate) return ts.toDate().getTime()
  if (typeof ts?.seconds === "number") return ts.seconds * 1000
  return 0
}

function filtrarVivos(cache: GrupoCache[], ahora = Date.now()): GrupoEnEstudio[] {
  return cache
    .filter((g) => g.lastPulseMs > 0 && ahora - g.lastPulseMs <= MAX_EDAD_GRUPO_MS)
    .map(({ lastPulseMs: _, ...rest }) => rest)
    .sort((a, b) => a.nombreClase.localeCompare(b.nombreClase, "es"))
}

/** Maestro: publica datos del grupo y mantiene el pulso. */
export async function marcarGrupoEnEstudio(
  claseId: string,
  datos: {
    nombreClase: string
    maestroNombre: string
    semana: number
    fecha: string
    diaLabel: string
  }
) {
  const id = normalizarCodigoClase(claseId)
  if (!id || id === CLASE_INDEPENDIENTE_ID) return

  await setDoc(
    grupoDoc(id),
    {
      claseId: id,
      nombreClase: datos.nombreClase.trim().slice(0, 48),
      maestroNombre: datos.maestroNombre.trim().slice(0, 32),
      semana: datos.semana,
      fecha: datos.fecha,
      diaLabel: datos.diaLabel,
      lastPulse: serverTimestamp(),
    },
    { merge: true }
  )
}

/** Alumno (o cualquier miembro): solo renueva el pulso sin pisar datos del maestro. */
export async function pulsoGrupoEnEstudio(claseId: string) {
  const id = normalizarCodigoClase(claseId)
  if (!id || id === CLASE_INDEPENDIENTE_ID) return

  await setDoc(
    grupoDoc(id),
    { claseId: id, lastPulse: serverTimestamp() },
    { merge: true }
  )
}

export async function quitarGrupoEnEstudio(claseId: string) {
  const id = normalizarCodigoClase(claseId)
  if (!id || id === CLASE_INDEPENDIENTE_ID) return
  try {
    await deleteDoc(grupoDoc(id))
  } catch {
    // ignorar
  }
}

export function subscribeGruposEnEstudio(
  onData: (grupos: GrupoEnEstudio[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  let cache: GrupoCache[] = []

  const emitir = () => onData(filtrarVivos(cache))

  const unsubSnap = onSnapshot(
    collection(db, COLECCION),
    (snap) => {
      cache = []
      snap.forEach((d) => {
        const id = d.id
        if (id === CLASE_INDEPENDIENTE_ID) return
        const data = d.data()
        cache.push({
          claseId: id,
          nombreClase: (data.nombreClase as string) ?? id,
          maestroNombre: (data.maestroNombre as string) ?? "",
          semana: (data.semana as number) ?? 1,
          fecha: (data.fecha as string) ?? "",
          diaLabel: (data.diaLabel as string) ?? "",
          lastPulseMs: parseLastPulse(data.lastPulse),
        })
      })
      emitir()
    },
    (err) => onError?.(err)
  )

  const tick = window.setInterval(emitir, INTERVALO_REVISION_MS)

  return () => {
    unsubSnap()
    window.clearInterval(tick)
  }
}

export const INTERVALO_PULSO_GRUPO_MS = 30_000
