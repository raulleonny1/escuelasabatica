"use client"

import { usePizarraOptional } from "@/components/PizarraContext"

export default function PizarraBannerButton() {
  const pizarra = usePizarraOptional()
  if (!pizarra?.esMaestro) return null

  const { abierta, togglePizarra } = pizarra

  return (
    <button
      type="button"
      onClick={() => void togglePizarra()}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold backdrop-blur-sm active:opacity-90 sm:text-xs ${
        abierta
          ? "border-accent bg-accent text-primary-dark shadow-sm"
          : "border-white/25 bg-white/10 text-white hover:bg-white/20"
      }`}
      aria-pressed={abierta}
    >
      <span aria-hidden>📝</span>
      {abierta ? "Cerrar pizarra" : "Pizarra"}
    </button>
  )
}
