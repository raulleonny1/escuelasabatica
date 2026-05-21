import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore"
import { db } from "./firebase"
import { normalizarCodigoClase } from "./clase"
import { getPresenceDocId } from "./chat"
import { safeLocalGet, safeLocalSet } from "./storage"

export type NotaClase = {
  texto: string
  autor: string
  semana?: number
}

function cacheKey(claseId: string) {
  return `comentariosClase_${normalizarCodigoClase(claseId)}`
}

function comentariosCol(claseId: string) {
  return collection(db, "clases", normalizarCodigoClase(claseId), "comentariosClase")
}

/** Un comentario por persona y día: 2025-05-21__maria-garcia */
export function idDocumentoComentario(fecha: string, autor: string): string {
  return `${fecha}__${getPresenceDocId(autor)}`
}

export function fechaDesdeIdComentario(docId: string): string {
  const sep = docId.indexOf("__")
  return sep >= 0 ? docId.slice(0, sep) : docId
}

export function misComentariosPorFecha(
  todos: Record<string, NotaClase>,
  miNombre: string
): Record<string, NotaClase> {
  const mi = miNombre.trim().toLowerCase()
  const out: Record<string, NotaClase> = {}
  for (const [docId, nota] of Object.entries(todos)) {
    if ((nota.autor ?? "").trim().toLowerCase() !== mi) continue
    out[fechaDesdeIdComentario(docId)] = nota
  }
  return out
}

export function leerComentariosClaseLocal(claseId: string): Record<string, NotaClase> {
  const saved = safeLocalGet(cacheKey(claseId))
  if (!saved) return {}
  try {
    const parsed = JSON.parse(saved) as Record<string, NotaClase | string>
    const out: Record<string, NotaClase> = {}
    for (const [docId, val] of Object.entries(parsed)) {
      if (typeof val === "string") {
        out[docId] = { texto: val, autor: "" }
      } else {
        out[docId] = val
      }
    }
    return out
  } catch {
    return {}
  }
}

export function guardarComentariosClaseLocal(claseId: string, data: Record<string, NotaClase>) {
  safeLocalSet(cacheKey(claseId), JSON.stringify(data))
}

export function subscribeComentariosClase(
  claseId: string,
  onData: (data: Record<string, NotaClase>) => void,
  onError: (error: Error) => void
) {
  if (!claseId) {
    onData({})
    return () => {}
  }

  return onSnapshot(
    comentariosCol(claseId),
    (snapshot) => {
      const data: Record<string, NotaClase> = {}
      snapshot.forEach((item) => {
        const d = item.data()
        data[item.id] = {
          texto: (d.texto as string) ?? "",
          autor: (d.autor as string) ?? "",
          semana: d.semana as number | undefined,
        }
      })
      guardarComentariosClaseLocal(claseId, data)
      onData(data)
    },
    (error) => onError(error as Error)
  )
}

export async function migrarComentariosClaseLocales(
  claseId: string,
  data: Record<string, NotaClase>
) {
  await Promise.all(
    Object.entries(data).map(([docId, nota]) => {
      const fecha = fechaDesdeIdComentario(docId)
      return guardarComentarioClase(claseId, fecha, nota.texto, nota.autor, nota.semana)
    })
  )
}

export async function guardarComentarioClase(
  claseId: string,
  fecha: string,
  texto: string,
  autor: string,
  semana?: number
) {
  const id = normalizarCodigoClase(claseId)
  const docId = idDocumentoComentario(fecha, autor)
  await setDoc(doc(db, "clases", id, "comentariosClase", docId), {
    fecha,
    texto: texto.trim(),
    autor: autor.trim().slice(0, 32),
    ...(semana != null ? { semana } : {}),
    updatedAt: serverTimestamp(),
  })
}

export async function eliminarComentarioClase(
  claseId: string,
  fecha: string,
  autor: string
) {
  const docId = idDocumentoComentario(fecha, autor)
  await deleteDoc(doc(db, "clases", normalizarCodigoClase(claseId), "comentariosClase", docId))
}
