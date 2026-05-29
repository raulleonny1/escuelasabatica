"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { getChatSessionId } from "@/lib/chat"
import { WebRTCAudioRoom, type SalaAudioEstado } from "@/lib/webrtcAudioRoom"

type SalaAudioContextValue = SalaAudioEstado & {
  entrarSala: () => Promise<void>
  salirSala: () => Promise<void>
  toggleSilencio: () => Promise<void>
}

const estadoInicial: SalaAudioEstado = {
  enSala: false,
  conectando: false,
  silenciado: false,
  participantes: [],
  error: null,
}

const SalaAudioContext = createContext<SalaAudioContextValue | null>(null)

export function SalaAudioProvider({
  claseId,
  nombre,
  children,
}: {
  claseId: string
  nombre: string
  children: ReactNode
}) {
  const [estado, setEstado] = useState<SalaAudioEstado>(estadoInicial)
  const roomRef = useRef<WebRTCAudioRoom | null>(null)
  const peerIdRef = useRef("")

  useEffect(() => {
    peerIdRef.current = getChatSessionId()
  }, [])

  useEffect(() => {
    return () => {
      void roomRef.current?.salir()
      roomRef.current = null
    }
  }, [])

  useEffect(() => {
    if (roomRef.current?.salir) {
      void roomRef.current.salir()
      roomRef.current = null
      setEstado(estadoInicial)
    }
  }, [claseId, nombre])

  const patch = useCallback((partial: Partial<SalaAudioEstado>) => {
    setEstado((prev) => ({ ...prev, ...partial }))
  }, [])

  const entrarSala = useCallback(async () => {
    if (!claseId || !nombre.trim() || roomRef.current) return
    const peerId = peerIdRef.current || getChatSessionId()
    peerIdRef.current = peerId
    const room = new WebRTCAudioRoom(claseId, peerId, nombre, patch)
    roomRef.current = room
    try {
      await room.entrar()
    } catch {
      roomRef.current = null
    }
  }, [claseId, nombre, patch])

  const salirSala = useCallback(async () => {
    await roomRef.current?.salir()
    roomRef.current = null
  }, [])

  const toggleSilencio = useCallback(async () => {
    await roomRef.current?.toggleSilencio()
  }, [])

  return (
    <SalaAudioContext.Provider
      value={{ ...estado, entrarSala, salirSala, toggleSilencio }}
    >
      {children}
    </SalaAudioContext.Provider>
  )
}

export function useSalaAudio() {
  const ctx = useContext(SalaAudioContext)
  if (!ctx) throw new Error("useSalaAudio debe usarse dentro de SalaAudioProvider")
  return ctx
}

export function useSalaAudioOptional() {
  return useContext(SalaAudioContext)
}
