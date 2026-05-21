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
import { normalizarCodigoClase } from "./clase"
import { getPresenceDocId } from "./chat"

const MAX_EDAD_MS = 90_000
const HEARTBEAT_MS = 12_000

export type UsuarioEnVoz = {
  presenceId: string
  nombre: string
}

function voiceCol(claseId: string) {
  return collection(db, "clases", normalizarCodigoClase(claseId), "voicePresence")
}

function voiceDoc(claseId: string, presenceId: string) {
  return doc(db, "clases", normalizarCodigoClase(claseId), "voicePresence", presenceId)
}

export function subscribeUsuariosEnVoz(
  claseId: string,
  onData: (usuarios: UsuarioEnVoz[]) => void
): Unsubscribe {
  if (!claseId) {
    onData([])
    return () => {}
  }

  return onSnapshot(voiceCol(claseId), (snap) => {
    const ahora = Date.now()
    const vistos = new Set<string>()
    const lista: UsuarioEnVoz[] = []

    snap.forEach((d) => {
      const data = d.data()
      const nombre = (data.nombre as string)?.trim()
      const ts = data.lastSeen as { toMillis?: () => number } | undefined
      const ms = ts?.toMillis?.() ?? 0
      if (!nombre || !ms || ahora - ms >= MAX_EDAD_MS) return
      const clave = nombre.toLowerCase()
      if (vistos.has(clave)) return
      vistos.add(clave)
      lista.push({ presenceId: d.id, nombre })
    })

    lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    onData(lista)
  })
}

export async function pulsoPresenciaVoz(claseId: string, nombre: string) {
  const presenceId = getPresenceDocId(nombre)
  await setDoc(
    voiceDoc(claseId, presenceId),
    {
      nombre: nombre.trim().slice(0, 32),
      lastSeen: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function salirPresenciaVoz(claseId: string, nombre: string) {
  const presenceId = getPresenceDocId(nombre)
  try {
    await deleteDoc(voiceDoc(claseId, presenceId))
  } catch {
    // ignorar si ya no existe
  }
}

export function iniciarHeartbeatVoz(
  claseId: string,
  nombre: string
): () => void {
  if (!claseId || !nombre.trim()) return () => {}

  let activo = true

  const tick = () => {
    if (!activo) return
    pulsoPresenciaVoz(claseId, nombre).catch(() => {})
  }

  tick()
  const id = window.setInterval(tick, HEARTBEAT_MS)

  return () => {
    activo = false
    window.clearInterval(id)
    void salirPresenciaVoz(claseId, nombre)
  }
}
