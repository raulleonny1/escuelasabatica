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
import { normalizarCodigoClase } from "./clase"
import {
  nuevoIdSesion,
  safeLocalGet,
  safeLocalSet,
  safeSessionGet,
  safeSessionSet,
} from "./storage"

const NOMBRE_KEY = "chatNombre"
const SESSION_KEY = "chatSessionId"
const JOIN_KEY_PREFIX = "chatJoinAnnounced_"

const PRESENCIA_APP_MS = 90_000
const PRESENCIA_CHAT_MS = 45_000
const HEARTBEAT_APP_MS = 15_000
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

function claseIdNorm(claseId: string) {
  return normalizarCodigoClase(claseId)
}

function messagesCol(claseId: string) {
  return collection(db, "clases", claseIdNorm(claseId), "chatMessages")
}

function presenceCol(claseId: string) {
  return collection(db, "clases", claseIdNorm(claseId), "chatPresence")
}

function joinKey(claseId: string) {
  return `${JOIN_KEY_PREFIX}${claseIdNorm(claseId)}`
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
  enApp: boolean
}

function dedupePorNombre(docs: PresenciaDoc[], maxEdadMs: number): ChatUsuarioEnLinea[] {
  const ahora = Date.now()
  const vistos = new Set<string>()
  const activos: ChatUsuarioEnLinea[] = []

  for (const item of docs) {
    if (!item.lastSeenMs || ahora - item.lastSeenMs >= maxEdadMs) continue
    const clave = item.nombre.trim().toLowerCase()
    if (vistos.has(clave)) continue
    vistos.add(clave)
    activos.push({ presenceId: item.id, nombre: item.nombre })
  }

  activos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
  return activos
}

function filtrarUsuariosConectados(docs: PresenciaDoc[]): ChatUsuarioEnLinea[] {
  const recientes = docs.filter((item) => {
    if (!item.lastSeenMs) return false
    if (Date.now() - item.lastSeenMs >= PRESENCIA_APP_MS) return false
    return item.enApp || item.enChat
  })
  return dedupePorNombre(recientes, PRESENCIA_APP_MS)
}

function filtrarUsuariosEnChat(docs: PresenciaDoc[]): ChatUsuarioEnLinea[] {
  const recientes = docs.filter(
    (item) => item.enChat && item.lastSeenMs && Date.now() - item.lastSeenMs < PRESENCIA_CHAT_MS
  )
  return dedupePorNombre(recientes, PRESENCIA_CHAT_MS)
}

async function limpiarPresenciaObsoleta(claseId: string) {
  const ahora = Date.now()
  const snap = await getDocs(presenceCol(claseId))
  await Promise.all(
    snap.docs.map(async (item) => {
      const data = item.data()
      const ts = data.lastSeen as Timestamp | undefined
      const ms = ts?.toMillis?.() ?? 0
      const enChat = data.enChat === true
      const enApp = data.enApp === true
      if (!ms || ahora - ms >= PRESENCIA_APP_MS * 2) {
        await deleteDoc(item.ref).catch(() => {})
      } else if (!enChat && !enApp && ahora - ms >= PRESENCIA_APP_MS) {
        await deleteDoc(item.ref).catch(() => {})
      }
    })
  )
}

export async function enviarMensajeChat(
  claseId: string,
  nombre: string,
  texto: string,
  sessionId: string
) {
  const limpio = texto.trim().slice(0, 2000)
  if (!limpio || !claseId) return
  await addDoc(messagesCol(claseId), {
    nombre: nombre.trim().slice(0, 32),
    texto: limpio,
    tipo: "message",
    sessionId,
    createdAt: serverTimestamp(),
  })
}

export async function anunciarEntradaChat(claseId: string, nombre: string, sessionId: string) {
  const key = joinKey(claseId)
  if (safeSessionGet(key) === sessionId) return
  await addDoc(messagesCol(claseId), {
    nombre: nombre.trim().slice(0, 32),
    texto: `${nombre.trim()} entró al chat`,
    tipo: "join",
    sessionId,
    createdAt: serverTimestamp(),
  })
  safeSessionSet(key, sessionId)
}

export function subscribeChatMessages(
  claseId: string,
  onData: (messages: ChatMessage[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!claseId) {
    onData([])
    return () => {}
  }

  const q = query(messagesCol(claseId), orderBy("createdAt", "asc"), limit(200))
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

function mapPresenceSnapshot(snapshot: { docs: { id: string; data: () => Record<string, unknown> }[] }) {
  return snapshot.docs.map((item) => {
    const data = item.data()
    const ts = data.lastSeen as Timestamp | undefined
    return {
      id: item.id,
      nombre: (data.nombre as string) ?? "Anónimo",
      lastSeenMs: ts?.toMillis?.() ?? 0,
      enChat: data.enChat === true,
      enApp: data.enApp === true || data.enChat === true,
    }
  })
}

export function subscribePresenciaChat(
  claseId: string,
  onData: (usuarios: ChatUsuarioEnLinea[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!claseId) {
    onData([])
    return () => {}
  }

  let cache: PresenciaDoc[] = []
  const emitir = () => onData(filtrarUsuariosConectados(cache))

  const unsub = onSnapshot(
    presenceCol(claseId),
    (snapshot) => {
      cache = mapPresenceSnapshot(snapshot)
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

export function subscribePresenciaCompleta(
  claseId: string,
  onData: (conectados: ChatUsuarioEnLinea[], enChat: ChatUsuarioEnLinea[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!claseId) {
    onData([], [])
    return () => {}
  }

  let cache: PresenciaDoc[] = []
  const emitir = () =>
    onData(filtrarUsuariosConectados(cache), filtrarUsuariosEnChat(cache))

  const unsub = onSnapshot(
    presenceCol(claseId),
    (snapshot) => {
      cache = mapPresenceSnapshot(snapshot)
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

function presenceRef(claseId: string, nombre: string) {
  return doc(db, "clases", claseIdNorm(claseId), "chatPresence", getPresenceDocId(nombre))
}

export function iniciarPresenciaEnApp(
  claseId: string,
  nombre: string,
  sessionId: string
): () => void {
  if (!claseId) return () => {}

  const nombreLimpio = nombre.trim().slice(0, 32)
  const ref = presenceRef(claseId, nombreLimpio)

  const actualizar = () => {
    setDoc(
      ref,
      {
        nombre: nombreLimpio,
        sessionId,
        enApp: true,
        lastSeen: serverTimestamp(),
      },
      { merge: true }
    ).catch(() => {})
  }

  actualizar()
  const heartbeat = setInterval(actualizar, HEARTBEAT_APP_MS)

  return () => {
    clearInterval(heartbeat)
    setDoc(ref, { enApp: false, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {})
  }
}

export function iniciarPresenciaEnChat(
  claseId: string,
  nombre: string,
  sessionId: string
): () => void {
  if (!claseId) return () => {}

  const nombreLimpio = nombre.trim().slice(0, 32)
  const ref = presenceRef(claseId, nombreLimpio)

  const actualizar = () => {
    setDoc(
      ref,
      {
        nombre: nombreLimpio,
        sessionId,
        enApp: true,
        enChat: true,
        lastSeen: serverTimestamp(),
        lastActiveInChat: serverTimestamp(),
      },
      { merge: true }
    ).catch(() => {})
  }

  const salirDelChat = () => {
    setDoc(ref, { enChat: false, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {})
  }

  actualizar()
  limpiarPresenciaObsoleta(claseId).catch(() => {})

  const heartbeat = setInterval(actualizar, HEARTBEAT_CHAT_MS)

  return () => {
    clearInterval(heartbeat)
    salirDelChat()
  }
}

export function pulsoActividadEnChat(claseId: string, nombre: string) {
  if (!claseId) return
  const nombreLimpio = nombre.trim().slice(0, 32)
  const ref = presenceRef(claseId, nombreLimpio)
  setDoc(
    ref,
    {
      nombre: nombreLimpio,
      enApp: true,
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
