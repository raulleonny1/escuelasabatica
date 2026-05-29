"use client"

import { useEffect, useState } from "react"
import { leerSesion } from "@/lib/sesionUsuario"
import { subscribePresenciaChat, type ChatUsuarioEnLinea } from "@/lib/chat"

export default function ChatEnLineaIndicador({ compacto = false }: { compacto?: boolean }) {
  const [enLinea, setEnLinea] = useState<ChatUsuarioEnLinea[]>([])
  const [claseId, setClaseId] = useState("")
  const [nombre, setNombre] = useState("")

  useEffect(() => {
    const sync = () => {
      const s = leerSesion()
      setClaseId(s?.claseId ?? "")
      setNombre(s?.nombre ?? "")
    }
    sync()
    window.addEventListener("sesion-actualizada", sync)
    window.addEventListener("clase-guardada", sync)
    return () => {
      window.removeEventListener("sesion-actualizada", sync)
      window.removeEventListener("clase-guardada", sync)
    }
  }, [])

  useEffect(() => {
    if (!claseId) {
      setEnLinea([])
      return
    }
    return subscribePresenciaChat(claseId, setEnLinea, () => {})
  }, [claseId])

  if (!nombre || !claseId) return null

  const miNombre = nombre.trim().toLowerCase()
  const otros = enLinea.filter((u) => u.nombre.trim().toLowerCase() !== miNombre)
  const nombres = otros.map((u) => u.nombre)
  const cantidad = enLinea.length

  const etiqueta =
    cantidad === 0 ? "Sin conexión" : cantidad === 1 ? "Tú en línea" : `${cantidad} en línea`

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm ${
        compacto ? "max-w-[5.5rem] px-1.5 py-1" : "max-w-[11rem] px-2.5 py-1.5 sm:max-w-none"
      }`}
      title={nombres.length > 0 ? nombres.join(", ") : undefined}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
        aria-hidden
      />
      <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-blue-100">
        {compacto ? (cantidad <= 1 ? "En línea" : `${cantidad}`) : etiqueta}
      </span>
      {!compacto && nombres.length > 0 && (
        <span className="hidden max-w-[8rem] truncate text-[10px] text-white/90 lg:inline">
          · {nombres.join(", ")}
        </span>
      )}
    </div>
  )
}
