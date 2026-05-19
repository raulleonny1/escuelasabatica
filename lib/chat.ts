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

const NOMBRE_KEY = "chatNombre"
const SESSION_KEY = "chatSessionId"
const JOIN_KEY = "chatJoinAnnounced"

/** Cuánto tiempo sin latido = ya no está en línea */
const PRESENCIA_MS = 22_000
/** Cada cuánto renueva la propia presencia */
const HEARTBEAT_MS = 8_000
/** Revisa en pantalla si alguien cayó (sin esperar cambio en Firestore) */
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

/** Un documento de presencia por nombre (evita duplicados por pestañas/recargas) */
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

function filtrarUsuariosActivos(
  docs: { id: string; nombre: string; lastSeenMs: number }[]
): ChatUsuarioEnLinea[] {
  const ahora = Date.now()
  const vistos = new Set<string>()
  const activos: ChatUsuarioEnLinea[] = []

  for (const item of docs) {
    if (!item.lastSeenMs || ahora - item.lastSeenMs >= PRESENCIA_MS) continue
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
      const ts = item.data().lastSeen as Timestamp | undefined
      const ms = ts?.toMillis?.() ?? 0
      if (!ms || ahora - ms >= PRESENCIA_MS) {
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

export function subscribePresenciaChat(
  onData: (usuarios: ChatUsuarioEnLinea[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  let cache: { id: string; nombre: string; lastSeenMs: number }[] = []

  const emitir = () => onData(filtrarUsuariosActivos(cache))

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

export function iniciarPresenciaChat(nombre: string): () => void {
  const nombreLimpio = nombre.trim().slice(0, 32)
  const presenceId = getPresenceDocId(nombreLimpio)
  const ref = doc(db, "chatPresence", presenceId)

  const actualizar = () => {
    setDoc(
      ref,
      {
        nombre: nombreLimpio,
        lastSeen: serverTimestamp(),
      },
      { merge: true }
    ).catch(() => {})
  }

  const salir = () => {
    deleteDoc(ref).catch(() => {})
  }

  actualizar()
  limpiarPresenciaObsoleta().catch(() => {})

  const heartbeat = setInterval(actualizar, HEARTBEAT_MS)
  const limpieza = setInterval(() => {
    limpiarPresenciaObsoleta().catch(() => {})
  }, 20_000)

  const onVisible = () => {
    if (document.visibilityState === "hidden") {
      salir()
    } else {
      actualizar()
    }
  }

  const onPageHide = () => salir()

  document.addEventListener("visibilitychange", onVisible)
  window.addEventListener("pagehide", onPageHide)

  return () => {
    clearInterval(heartbeat)
    clearInterval(limpieza)
    document.removeEventListener("visibilitychange", onVisible)
    window.removeEventListener("pagehide", onPageHide)
    salir()
  }
}

export function formatHoraChat(date: Date | null): string {
  if (!date) return ""
  return date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })
}
