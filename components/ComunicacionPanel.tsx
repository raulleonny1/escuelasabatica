"use client"

import ChatPanel from "@/components/ChatPanel"

interface ComunicacionPanelProps {
  claseId: string
  nombre: string
  activoChat?: boolean
  visible?: boolean
  className?: string
}

/** Chat grupal de la clase (el audio está en el banner del encabezado). */
export default function ComunicacionPanel({
  claseId,
  nombre,
  activoChat = false,
  visible = true,
  className = "",
}: ComunicacionPanelProps) {
  if (!visible) return null

  return (
    <ChatPanel
      claseId={claseId}
      nombre={nombre}
      activo={activoChat}
      className={`min-h-0 flex-1 rounded-xl border border-border bg-card shadow-sm ${className}`}
    />
  )
}
