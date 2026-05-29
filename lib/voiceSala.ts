import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "./firebase"
import { normalizarCodigoClase } from "./clase"

const PRESENCIA_MS = 45_000
const HEARTBEAT_MS = 8_000

export type VoiceParticipante = {
  peerId: string
  nombre: string
  muted: boolean
  speaking: boolean
  enSala: boolean
}

export type VoiceSignal = {
  id: string
  from: string
  to: string
  type: "offer" | "answer" | "candidate"
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
}

function claseIdNorm(claseId: string) {
  return normalizarCodigoClase(claseId)
}

function presenceCol(claseId: string) {
  return collection(db, "clases", claseIdNorm(claseId), "voicePresence")
}

function signalsCol(claseId: string) {
  return collection(db, "clases", claseIdNorm(claseId), "voiceSignals")
}

function presenceRef(claseId: string, peerId: string) {
  return doc(db, "clases", claseIdNorm(claseId), "voicePresence", peerId)
}

function mapParticipante(id: string, data: Record<string, unknown>): VoiceParticipante | null {
  const ts = data.lastSeen as Timestamp | undefined
  const ms = ts?.toMillis?.() ?? 0
  if (!ms || Date.now() - ms >= PRESENCIA_MS) return null
  if (data.enSala !== true) return null
  return {
    peerId: id,
    nombre: (data.nombre as string) ?? "Anónimo",
    muted: data.muted === true,
    speaking: data.speaking === true && data.muted !== true,
    enSala: true,
  }
}

export async function registrarEnSala(
  claseId: string,
  peerId: string,
  nombre: string,
  muted: boolean
) {
  await setDoc(
    presenceRef(claseId, peerId),
    {
      nombre: nombre.trim().slice(0, 32),
      enSala: true,
      muted,
      speaking: false,
      lastSeen: serverTimestamp(),
      joinedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function actualizarEstadoVoz(
  claseId: string,
  peerId: string,
  estado: { muted?: boolean; speaking?: boolean }
) {
  await setDoc(
    presenceRef(claseId, peerId),
    { ...estado, lastSeen: serverTimestamp() },
    { merge: true }
  ).catch(() => {})
}

export async function pulsoPresenciaVoz(claseId: string, peerId: string) {
  await setDoc(
    presenceRef(claseId, peerId),
    { lastSeen: serverTimestamp(), enSala: true },
    { merge: true }
  ).catch(() => {})
}

export async function salirDeSala(claseId: string, peerId: string) {
  await deleteDoc(presenceRef(claseId, peerId)).catch(() => {})
}

export function iniciarHeartbeatVoz(claseId: string, peerId: string): () => void {
  const tick = setInterval(() => pulsoPresenciaVoz(claseId, peerId), HEARTBEAT_MS)
  return () => clearInterval(tick)
}

export function subscribeParticipantesVoz(
  claseId: string,
  onData: (participantes: VoiceParticipante[]) => void
): Unsubscribe {
  if (!claseId) {
    onData([])
    return () => {}
  }

  let cache: VoiceParticipante[] = []
  const emitir = () => onData([...cache])

  const unsub = onSnapshot(presenceCol(claseId), (snap) => {
    cache = snap.docs
      .map((d) => mapParticipante(d.id, d.data()))
      .filter((p): p is VoiceParticipante => p !== null)
    cache.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    emitir()
  })

  const tick = setInterval(emitir, 2_000)
  return () => {
    clearInterval(tick)
    unsub()
  }
}

export async function enviarSenal(
  claseId: string,
  signal: Omit<VoiceSignal, "id">
) {
  const payload: Record<string, unknown> = {
    from: signal.from,
    to: signal.to,
    type: signal.type,
    createdAt: serverTimestamp(),
  }
  if (signal.sdp) {
    payload.sdp = { type: signal.sdp.type, sdp: signal.sdp.sdp }
  }
  if (signal.candidate) {
    payload.candidate = {
      candidate: signal.candidate.candidate,
      sdpMid: signal.candidate.sdpMid ?? null,
      sdpMLineIndex: signal.candidate.sdpMLineIndex ?? null,
    }
  }
  await addDoc(signalsCol(claseId), payload)
}

export function subscribeSenalesVoz(
  claseId: string,
  peerId: string,
  onSignal: (signal: VoiceSignal) => void
): Unsubscribe {
  if (!claseId || !peerId) return () => {}

  const q = query(signalsCol(claseId), where("to", "==", peerId))
  const procesados = new Set<string>()

  return onSnapshot(q, (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type !== "added") return
      const id = change.doc.id
      if (procesados.has(id)) return
      procesados.add(id)
      const data = change.doc.data()
      const rawSdp = data.sdp as Record<string, string> | undefined
      const rawCand = data.candidate as Record<string, unknown> | undefined
      onSignal({
        id,
        from: (data.from as string) ?? "",
        to: (data.to as string) ?? "",
        type: data.type as VoiceSignal["type"],
        sdp: rawSdp?.sdp
          ? { type: rawSdp.type as RTCSdpType, sdp: rawSdp.sdp }
          : undefined,
        candidate: rawCand?.candidate
          ? {
              candidate: rawCand.candidate as string,
              sdpMid: (rawCand.sdpMid as string | null) ?? undefined,
              sdpMLineIndex: (rawCand.sdpMLineIndex as number | null) ?? undefined,
            }
          : undefined,
      })
      deleteDoc(change.doc.ref).catch(() => {})
    })
  })
}
