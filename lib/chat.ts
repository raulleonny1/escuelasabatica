import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
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
import {
  nuevoIdSesion,
  safeLocalGet,
  safeLocalSet,
  safeSessionGet,
  safeSessionSet,
} from "./storage"

const NOMBRE_KEY = "chatNombre"
const SESSION_KEY = "chatSessionId"
const JOIN_KEY = "chatJoinAnnounced"

/** Sin actividad en el chat = ya no aparece como “en el chat” */
const PRESENCIA_CHAT_MS = 45_000
const HEARTBEAT_CHAT_MS = 10_000
const TICK_UI_MS = 2_000

export type ChatMessage = {
  id: string
  nombre: string
  texto: string
  tipo: "message" | "join"
  createdAt: Date | null
}

export type ChatUsuarioEnLinea = {
  presenceId: string
  nombre: string
}

export function leerNombreChat(): string {
  return safeLocalGet(NOMBRE_KEY)?.trim() ?? ""
}

export function guardarNombreChat(nombre: string) {
  safeLocalSet(NOMBRE_KEY, nombre.trim())
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("chat-nombre-guardado"))
  }
}

export function getChatSessionId(): string {
  if (typeof window === "undefined") return ""
  let id = safeSessionGet(SESSION_KEY)
  if (!id) {
    id = nuevoIdSesion()
    safeSessionSet(SESSION_KEY, id)
  }
  return id
}

export function getPresenceDocId(nombre: string): string {
  const slug = nombre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64)
  return slug || "usuario"
}

type PresenciaDoc = {
  id: string
  nombre: string
  lastSeenMs: number
  enChat: boolean
}

function filtrarUsuariosEnChat(docs: PresenciaDoc[]): ChatUsuarioEnLinea[] {
  const ahora = Date.now()
  const vistos = new Set<string>()
  const activos: ChatUsuarioEnLinea[] = []

  for (const item of docs) {
    if (!item.enChat) continue
    if (!item.lastSeenMs || ahora - item.lastSeenMs >= PRESENCIA_CHAT_MS) continue
    const clave = item.nombre.trim().toLowerCase()
    if (vistos.has(clave)) continue
    vistos.add(clave)
    activos.push({ presenceId: item.id, nombre: item.nombre })
  }

  activos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
  return activos
}

async function limpiarPresenciaObsoleta() {
  const ahora = Date.now()
  const snap = await getDocs(collection(db, "chatPresence"))
  await Promise.all(
    snap.docs.map(async (item) => {
      const data = item.data()
      const ts = data.lastSeen as Timestamp | undefined
      const ms = ts?.toMillis?.() ?? 0
      const enChat = data.enChat === true
      if (!ms || ahora - ms >= PRESENCIA_CHAT_MS * 2) {
        await deleteDoc(item.ref).catch(() => {})
      } else if (!enChat && ahora - ms >= PRESENCIA_CHAT_MS) {
        await deleteDoc(item.ref).catch(() => {})
      }
    })
  )
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
  if (safeSessionGet(JOIN_KEY) === sessionId) return
  await addDoc(collection(db, "chatMessages"), {
    nombre: nombre.trim().slice(0, 32),
    texto: `${nombre.trim()} entró al chat`,
    tipo: "join",
    sessionId,
    createdAt: serverTimestamp(),
  })
  safeSessionSet(JOIN_KEY, sessionId)
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

export function subscribePresenciaChat(
  onData: (usuarios: ChatUsuarioEnLinea[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  let cache: PresenciaDoc[] = []

  const emitir = () => onData(filtrarUsuariosEnChat(cache))

  const unsub = onSnapshot(
    collection(db, "chatPresence"),
    (snapshot) => {
      cache = snapshot.docs.map((item) => {
        const data = item.data()
        const ts = data.lastSeen as Timestamp | undefined
        return {
          id: item.id,
          nombre: (data.nombre as string) ?? "Anónimo",
          lastSeenMs: ts?.toMillis?.() ?? 0,
          enChat: data.enChat === true,
        }
      })
      emitir()
    },
    (error) => onError(error as Error)
  )

  const tick = setInterval(emitir, TICK_UI_MS)

  return () => {
    clearInterval(tick)
    unsub()
  }
}

/** Presencia solo mientras el usuario está en la pestaña/panel del chat */
export function iniciarPresenciaEnChat(nombre: string, sessionId: string): () => void {
  const nombreLimpio = nombre.trim().slice(0, 32)
  const presenceId = getPresenceDocId(nombreLimpio)
  const ref = doc(db, "chatPresence", presenceId)

  const actualizar = () => {
    setDoc(
      ref,
      {
        nombre: nombreLimpio,
        sessionId,
        enChat: true,
        lastSeen: serverTimestamp(),
        lastActiveInChat: serverTimestamp(),
      },
      { merge: true }
    ).catch(() => {})
  }

  const salirDelChat = () => {
    setDoc(
      ref,
      {
        enChat: false,
        lastSeen: serverTimestamp(),
      },
      { merge: true }
    ).catch(() => {})
  }

  actualizar()
  limpiarPresenciaObsoleta().catch(() => {})

  const heartbeat = setInterval(actualizar, HEARTBEAT_CHAT_MS)

  const onVisible = () => {
    if (document.visibilityState === "hidden") {
      salirDelChat()
    } else {
      actualizar()
    }
  }

  const onPageHide = () => salirDelChat()

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisible)
  }
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", onPageHide)
  }

  return () => {
    clearInterval(heartbeat)
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisible)
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("pagehide", onPageHide)
    }
    salirDelChat()
  }
}

/** Latido al escribir o enviar (sigue contando como interactuando) */
export function pulsoActividadEnChat(nombre: string) {
  const nombreLimpio = nombre.trim().slice(0, 32)
  const ref = doc(db, "chatPresence", getPresenceDocId(nombreLimpio))
  setDoc(
    ref,
    {
      nombre: nombreLimpio,
      enChat: true,
      lastSeen: serverTimestamp(),
      lastActiveInChat: serverTimestamp(),
    },
    { merge: true }
  ).catch(() => {})
}

export function formatHoraChat(date: Date | null): string {
  if (!date) return ""
  return date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })
}
