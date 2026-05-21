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
const MAX_EDAD_MS = 2 * 60 * 60 * 1000

export type GrupoEnEstudio = {
  claseId: string
  nombreClase: string
  maestroNombre: string
  semana: number
  fecha: string
  diaLabel: string
}

function grupoDoc(claseId: string) {
  return doc(db, COLECCION, normalizarCodigoClase(claseId))
}

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

  await setDoc(grupoDoc(id), {
    claseId: id,
    nombreClase: datos.nombreClase.trim().slice(0, 48),
    maestroNombre: datos.maestroNombre.trim().slice(0, 32),
    semana: datos.semana,
    fecha: datos.fecha,
    diaLabel: datos.diaLabel,
    lastPulse: serverTimestamp(),
  })
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
  onData: (grupos: GrupoEnEstudio[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, COLECCION), (snap) => {
    const ahora = Date.now()
    const lista: GrupoEnEstudio[] = []

    snap.forEach((d) => {
      const id = d.id
      if (id === CLASE_INDEPENDIENTE_ID) return
      const data = d.data()
      const ts = data.lastPulse as { toDate?: () => Date } | undefined
      const ms = ts?.toDate?.()?.getTime() ?? 0
      if (!ms || ahora - ms > MAX_EDAD_MS) return

      lista.push({
        claseId: id,
        nombreClase: (data.nombreClase as string) ?? id,
        maestroNombre: (data.maestroNombre as string) ?? "",
        semana: (data.semana as number) ?? 1,
        fecha: (data.fecha as string) ?? "",
        diaLabel: (data.diaLabel as string) ?? "",
      })
    })

    lista.sort((a, b) => a.nombreClase.localeCompare(b.nombreClase, "es"))
    onData(lista)
  })
}
