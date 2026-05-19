import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore"
import { db } from "./firebase"

const STORAGE_KEY = "comentariosPorFecha"

export function leerComentariosLocal(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return {}
  try {
    return JSON.parse(saved)
  } catch {
    return {}
  }
}

export function guardarComentariosLocal(data: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
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

export async function guardarComentario(fecha: string, texto: string) {
  await setDoc(doc(db, "comentarios", fecha), {
    fecha,
    texto,
    updatedAt: serverTimestamp(),
  })
}

export async function eliminarComentario(fecha: string) {
  await deleteDoc(doc(db, "comentarios", fecha))
}
