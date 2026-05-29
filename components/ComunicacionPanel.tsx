"use client"

import ChatPanel from "@/components/ChatPanel"
import SalaAudioPanel from "@/components/SalaAudioPanel"

interface ComunicacionPanelProps {
  claseId: string
  nombre: string
  activoChat?: boolean
  visible?: boolean
  className?: string
}

/** Chat grupal + sala de audio integrada (WebRTC, sin Jitsi ni ventanas externas). */
export default function ComunicacionPanel({
  claseId,
  nombre,
  activoChat = false,
  visible = true,
  className = "",
}: ComunicacionPanelProps) {
  if (!visible) return null

  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-3 ${className}`}>
      <SalaAudioPanel />
      <ChatPanel
        claseId={claseId}
        nombre={nombre}
        activo={activoChat}
        className="min-h-0 flex-1 rounded-xl border border-border bg-card shadow-sm"
      />
    </div>
  )
}
