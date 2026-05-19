import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore"
import { db } from "./firebase"
import { safeLocalGet, safeLocalSet } from "./storage"

const STORAGE_KEY = "comentariosPorFecha"

export function leerComentariosLocal(): Record<string, string> {
  const saved = safeLocalGet(STORAGE_KEY)
  if (!saved) return {}
  try {
    return JSON.parse(saved)
  } catch {
    return {}
  }
}

export function guardarComentariosLocal(data: Record<string, string>) {
  safeLocalSet(STORAGE_KEY, JSON.stringify(data))
}

export function subscribeComentarios(
  onData: (data: Record<string, string>) => void,
  onError: (error: Error) => void
) {
  return onSnapshot(
    collection(db, "comentarios"),
    (snapshot) => {
      const data: Record<string, string> = {}
      snapshot.forEach((item) => {
        data[item.id] = item.data().texto as string
      })
      guardarComentariosLocal(data)
      onData(data)
    },
    (error) => onError(error as Error)
  )
}

export async function migrarComentariosLocales(data: Record<string, string>) {
  await Promise.all(
    Object.entries(data).map(([fecha, texto]) => guardarComentario(fecha, texto))
  )
}

export async function guardarComentario(fecha: string, texto: string, semana?: number) {
  await setDoc(doc(db, "comentarios", fecha), {
    fecha,
    texto,
    ...(semana != null ? { semana } : {}),
    updatedAt: serverTimestamp(),
  })
}

export async function eliminarComentario(fecha: string) {
  await deleteDoc(doc(db, "comentarios", fecha))
}
