"use client"

import { useState } from "react"
import ChatPanel from "@/components/ChatPanel"
import SalaVozPanel from "@/components/SalaVozPanel"

type TabComunicacion = "texto" | "voz"

interface ComunicacionPanelProps {
  claseId: string
  nombre: string
  activoChat?: boolean
  visible?: boolean
  onSalaVozChange?: (enSala: boolean) => void
  className?: string
}

export default function ComunicacionPanel({
  claseId,
  nombre,
  activoChat = false,
  visible = true,
  onSalaVozChange,
  className = "",
}: ComunicacionPanelProps) {
  const [tab, setTab] = useState<TabComunicacion>("texto")

  const pestañaVoz = tab === "voz" && visible

  return (
    <section
      className={`flex min-h-0 flex-col rounded-xl border border-border bg-card shadow-sm ${className}`}
    >
      <div className="flex shrink-0 border-b border-border">
        <button
          type="button"
          onClick={() => setTab("texto")}
          className={`flex-1 px-3 py-2.5 text-xs font-semibold transition ${
            tab === "texto"
              ? "border-b-2 border-primary bg-primary/5 text-primary"
              : "text-slate-500 hover:bg-surface"
          }`}
        >
          💬 Chat
        </button>
        <button
          type="button"
          onClick={() => setTab("voz")}
          className={`flex-1 px-3 py-2.5 text-xs font-semibold transition ${
            tab === "voz"
              ? "border-b-2 border-violet-700 bg-violet-50 text-violet-900"
              : "text-slate-500 hover:bg-surface"
          }`}
        >
          🎙️ Voz grupal
        </button>
      </div>

      <div
        className={`min-h-0 flex-1 flex flex-col ${
          tab === "texto" ? "flex" : "hidden"
        }`}
      >
        <ChatPanel
          claseId={claseId}
          nombre={nombre}
          activo={activoChat && tab === "texto" && visible}
          className="min-h-0 flex-1 border-0 shadow-none rounded-none"
        />
      </div>

      <div className={`min-h-0 flex-1 flex flex-col ${tab === "voz" ? "flex" : "hidden"}`}>
        <SalaVozPanel
          claseId={claseId}
          nombre={nombre}
          activo={pestañaVoz}
          onSalaVozChange={onSalaVozChange}
          className="min-h-0 flex-1"
        />
      </div>
    </section>
  )
}
