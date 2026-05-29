"use client"

import { useEffect, useState } from "react"
import { leerSesion } from "@/lib/sesionUsuario"
import { subscribePresenciaChat, type ChatUsuarioEnLinea } from "@/lib/chat"

type Placement = "mobile" | "desktop"

export default function ChatEnLineaIndicador({ placement }: { placement: Placement }) {
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

  const contenido = (
    <>
      <p
        className="flex items-center gap-1.5 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-blue-100/90 sm:text-[11px]"
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
          aria-hidden
        />
        {cantidad === 0 ? "Sin conexión" : cantidad === 1 ? "Tú en línea" : `${cantidad} en línea`}
      </p>
      {nombres.length > 0 && (
        <p
          className="mt-0.5 max-w-[14rem] truncate text-[10px] text-white/95 sm:max-w-xs sm:text-xs"
          title={nombres.join(", ")}
        >
          {nombres.join(" · ")}
        </p>
      )}
    </>
  )

  if (placement === "mobile") {
    return <div className="min-w-0 md:hidden">{contenido}</div>
  }

  return (
    <div className="hidden shrink-0 self-center md:block">
      <div className="w-fit rounded-full border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-sm">
        {contenido}
      </div>
    </div>
  )
}
