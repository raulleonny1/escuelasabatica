import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "./firebase"
import { normalizarCodigoClase } from "./clase"
import { getPresenceDocId } from "./chat"

export type EstadoSolicitudUnion = "pendiente" | "aceptada" | "rechazada"

export type SolicitudUnion = {
  presenceId: string
  nombre: string
  estado: EstadoSolicitudUnion
  respondidoPor: string
  claseNombre: string
  updatedAt: Date | null
}

function solicitudesCol(claseId: string) {
  return collection(db, "clases", normalizarCodigoClase(claseId), "solicitudesUnion")
}

function solicitudDoc(claseId: string, presenceId: string) {
  return doc(db, "clases", normalizarCodigoClase(claseId), "solicitudesUnion", presenceId)
}

export async function crearSolicitudUnion(
  claseIdDestino: string,
  nombreSolicitante: string,
  claseNombreDestino: string
) {
  const presenceId = getPresenceDocId(nombreSolicitante)
  await setDoc(solicitudDoc(claseIdDestino, presenceId), {
    nombre: nombreSolicitante.trim().slice(0, 32),
    estado: "pendiente",
    respondidoPor: "",
    claseNombre: claseNombreDestino.trim().slice(0, 48),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function responderSolicitudUnion(
  claseId: string,
  presenceIdSolicitante: string,
  aceptar: boolean,
  respondidoPor: string
) {
  await setDoc(
    solicitudDoc(claseId, presenceIdSolicitante),
    {
      estado: aceptar ? "aceptada" : "rechazada",
      respondidoPor: respondidoPor.trim().slice(0, 32),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export function subscribeSolicitudesPendientes(
  claseId: string,
  onData: (lista: SolicitudUnion[]) => void
): Unsubscribe {
  if (!claseId) {
    onData([])
    return () => {}
  }

  return onSnapshot(solicitudesCol(claseId), (snap) => {
    const lista: SolicitudUnion[] = []
    snap.forEach((d) => {
      const data = d.data()
      if ((data.estado as string) !== "pendiente") return
      const ts = data.updatedAt as { toDate?: () => Date } | undefined
      lista.push({
        presenceId: d.id,
        nombre: (data.nombre as string) ?? "",
        estado: "pendiente",
        respondidoPor: "",
        claseNombre: (data.claseNombre as string) ?? "",
        updatedAt: ts?.toDate?.() ?? null,
      })
    })
    lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    onData(lista)
  })
}

export function subscribeMiSolicitudUnion(
  claseId: string,
  nombreSolicitante: string,
  onData: (solicitud: SolicitudUnion | null) => void
): Unsubscribe {
  const presenceId = getPresenceDocId(nombreSolicitante)
  if (!claseId || !presenceId) {
    onData(null)
    return () => {}
  }

  return onSnapshot(solicitudDoc(claseId, presenceId), (snap) => {
    if (!snap.exists()) {
      onData(null)
      return
    }
    const data = snap.data()
    const ts = data.updatedAt as { toDate?: () => Date } | undefined
    onData({
      presenceId,
      nombre: (data.nombre as string) ?? "",
      estado: (data.estado as EstadoSolicitudUnion) ?? "pendiente",
      respondidoPor: (data.respondidoPor as string) ?? "",
      claseNombre: (data.claseNombre as string) ?? "",
      updatedAt: ts?.toDate?.() ?? null,
    })
  })
}
