"use client"

import { useEffect, useState } from "react"
import { leerNombreChat, subscribePresenciaChat, type ChatUsuarioEnLinea } from "@/lib/chat"

type Placement = "mobile" | "desktop"

export default function ChatEnLineaIndicador({ placement }: { placement: Placement }) {
  const [enLinea, setEnLinea] = useState<ChatUsuarioEnLinea[]>([])
  const [nombre, setNombre] = useState("")

  useEffect(() => {
    const actualizarNombre = () => setNombre(leerNombreChat())
    actualizarNombre()
    window.addEventListener("chat-nombre-guardado", actualizarNombre)
    const unsub = subscribePresenciaChat(setEnLinea, () => {})
    return () => {
      window.removeEventListener("chat-nombre-guardado", actualizarNombre)
      unsub()
    }
  }, [])

  if (!nombre) return null

  const nombres = enLinea.map((u) => u.nombre)
  const cantidad = nombres.length

  const contenido = (
    <>
      <p
        className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-blue-100/90 ${
          placement === "desktop" ? "justify-center" : ""
        }`}
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
          aria-hidden
        />
        {cantidad === 0 ? "Nadie en el chat" : `${cantidad} en el chat`}
      </p>
      {cantidad > 0 && (
        <p
          className={`mt-0.5 truncate text-xs text-white/95 ${
            placement === "desktop" ? "text-center" : ""
          }`}
          title={nombres.join(", ")}
        >
          {nombres.join(" · ")}
        </p>
      )}
    </>
  )

  if (placement === "mobile") {
    return <div className="mt-1 min-w-0 md:hidden">{contenido}</div>
  }

  return (
    <div className="hidden min-w-0 flex-1 px-2 md:block lg:px-4">
      <div className="mx-auto max-w-md rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
        {contenido}
      </div>
    </div>
  )
}
