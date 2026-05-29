"use client"

import { etiquetaTipoMaterial, type GuiaClase } from "@/lib/guiaClase"

export default function IndicadorGuiaMaestro({ guia }: { guia: GuiaClase | null }) {
  if (!guia?.guiadoPor) return null

  const material = guia.materialTitulo
    ? ` · ${guia.materialTitulo}`
    : guia.materialUrl
      ? " · material auxiliar"
      : ""

  return (
    <div className="shrink-0 border-b border-primary/15 bg-primary/5 px-3 py-2 lg:px-4">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-primary">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <span
            className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]"
            aria-hidden
          />
          Con el maestro {guia.guiadoPor}
        </span>
        <span className="text-slate-500">·</span>
        <span>
          Semana {guia.semana} · {etiquetaTipoMaterial(guia.tipo)}
          {material}
        </span>
      </p>
    </div>
  )
}
