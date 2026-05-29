"use client"

import { useSalaAudioOptional } from "@/components/SalaAudioContext"
import SalaAudioPanel from "@/components/SalaAudioPanel"

/** Barra compacta de audio cuando el usuario está en otra pestaña (móvil). */
export default function SalaAudioBarraFlotante() {
  const sala = useSalaAudioOptional()
  if (!sala?.enSala) return null

  return (
    <div
      className="fixed left-2 right-2 z-30 mx-auto max-w-lg lg:hidden"
      style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
    >
      <SalaAudioPanel compacto />
    </div>
  )
}
