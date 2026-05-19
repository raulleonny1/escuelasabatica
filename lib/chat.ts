import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "./firebase"

const NOMBRE_KEY = "chatNombre"
const SESSION_KEY = "chatSessionId"
const JOIN_KEY = "chatJoinAnnounced"

export type ChatMessage = {
  id: string
  nombre: string
  texto: string
  tipo: "message" | "join"
  createdAt: Date | null
}

export type ChatUsuarioEnLinea = {
  sessionId: string
  nombre: string
}

export function leerNombreChat(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem(NOMBRE_KEY)?.trim() ?? ""
}

export function guardarNombreChat(nombre: string) {
  localStorage.setItem(NOMBRE_KEY, nombre.trim())
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("chat-nombre-guardado"))
  }
}

export function getChatSessionId(): string {
  if (typeof window === "undefined") return ""
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export async function enviarMensajeChat(nombre: string, texto: string, sessionId: string) {
  const limpio = texto.trim().slice(0, 2000)
  if (!limpio) return
  await addDoc(collection(db, "chatMessages"), {
    nombre: nombre.trim().slice(0, 32),
    texto: limpio,
    tipo: "message",
    sessionId,
    createdAt: serverTimestamp(),
  })
}

export async function anunciarEntradaChat(nombre: string, sessionId: string) {
  if (sessionStorage.getItem(JOIN_KEY) === sessionId) return
  await addDoc(collection(db, "chatMessages"), {
    nombre: nombre.trim().slice(0, 32),
    texto: `${nombre.trim()} entró al chat`,
    tipo: "join",
    sessionId,
    createdAt: serverTimestamp(),
  })
  sessionStorage.setItem(JOIN_KEY, sessionId)
}

export function subscribeChatMessages(
  onData: (messages: ChatMessage[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const q = query(collection(db, "chatMessages"), orderBy("createdAt", "asc"), limit(200))
  return onSnapshot(
    q,
    (snapshot) => {
      const messages: ChatMessage[] = snapshot.docs.map((item) => {
        const data = item.data()
        const ts = data.createdAt as Timestamp | undefined
        return {
          id: item.id,
          nombre: (data.nombre as string) ?? "",
          texto: (data.texto as string) ?? "",
          tipo: data.tipo === "join" ? "join" : "message",
          createdAt: ts?.toDate?.() ?? null,
        }
      })
      onData(messages)
    },
    (error) => onError(error as Error)
  )
}

const PRESENCIA_MS = 90_000

export function subscribePresenciaChat(
  onData: (usuarios: ChatUsuarioEnLinea[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, "chatPresence"),
    (snapshot) => {
      const ahora = Date.now()
      const usuarios: ChatUsuarioEnLinea[] = []
      snapshot.forEach((item) => {
        const data = item.data()
        const ts = data.lastSeen as Timestamp | undefined
        const ms = ts?.toMillis?.() ?? 0
        if (ms && ahora - ms < PRESENCIA_MS) {
          usuarios.push({
            sessionId: item.id,
            nombre: (data.nombre as string) ?? "Anónimo",
          })
        }
      })
      usuarios.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
      onData(usuarios)
    },
    (error) => onError(error as Error)
  )
}

export function iniciarPresenciaChat(nombre: string, sessionId: string): () => void {
  const ref = doc(db, "chatPresence", sessionId)

  const actualizar = () => {
    setDoc(
      ref,
      {
        nombre: nombre.trim().slice(0, 32),
        lastSeen: serverTimestamp(),
      },
      { merge: true }
    ).catch(() => {})
  }

  actualizar()
  const interval = setInterval(actualizar, 30_000)

  const onHide = () => {
    if (document.visibilityState === "hidden") actualizar()
  }
  document.addEventListener("visibilitychange", onHide)

  return () => {
    clearInterval(interval)
    document.removeEventListener("visibilitychange", onHide)
    deleteDoc(ref).catch(() => {})
  }
}

export function formatHoraChat(date: Date | null): string {
  if (!date) return ""
  return date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })
}
