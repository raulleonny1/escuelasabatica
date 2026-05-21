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
  const [enSalaVoz, setEnSalaVoz] = useState(false)

  function handleSalaVoz(en: boolean) {
    setEnSalaVoz(en)
    onSalaVozChange?.(en)
  }

  const pestañaVozVisible = visible && tab === "voz"
  const montarVoz = tab === "voz" || enSalaVoz

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
          {enSalaVoz && tab !== "voz" && (
            <span
              className="ml-1 inline-block h-1.5 w-1.5 align-middle rounded-full bg-emerald-500"
              title="Conectado a la voz"
              aria-hidden
            />
          )}
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

      {montarVoz && (
        <div
          className={
            pestañaVozVisible
              ? "flex min-h-0 flex-1 flex-col"
              : "pointer-events-none fixed left-0 top-0 z-0 h-px w-px overflow-hidden opacity-0"
          }
          aria-hidden={!pestañaVozVisible}
        >
          <SalaVozPanel
            claseId={claseId}
            nombre={nombre}
            visible={pestañaVozVisible}
            onSalaVozChange={handleSalaVoz}
            className="min-h-0 flex-1"
          />
        </div>
      )}
    </section>
  )
}
