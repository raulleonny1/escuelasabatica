"use client"

import { useCallback, useEffect, useState } from "react"
import {
  applyTextSizeLevel,
  clampTextSizeLevel,
  readTextSizeLevel,
  TEXT_SIZE_LABELS,
  type TextSizeLevel,
} from "@/lib/textSize"

/** Tamaños visuales de la «A» en cada nivel (solo icono, sin porcentajes) */
const A_CLASS: Record<TextSizeLevel, string> = {
  0: "text-[10px] leading-none",
  1: "text-[11px] leading-none",
  2: "text-[13px] leading-none",
  3: "text-[15px] leading-none",
}

interface TextSizeControlProps {
  /** Cabecera oscura: estilos claros */
  variant?: "header" | "light"
}

export default function TextSizeControl({ variant = "header" }: TextSizeControlProps) {
  const [nivel, setNivel] = useState<TextSizeLevel>(0)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    const n = readTextSizeLevel()
    applyTextSizeLevel(n)
    setNivel(n)
    setListo(true)
    const sync = () => setNivel(readTextSizeLevel())
    window.addEventListener("text-size-changed", sync)
    return () => window.removeEventListener("text-size-changed", sync)
  }, [])

  const elegir = useCallback((level: TextSizeLevel) => {
    applyTextSizeLevel(level)
    setNivel(level)
  }, [])

  const subir = () => elegir(clampTextSizeLevel(nivel + 1))
  const bajar = () => elegir(clampTextSizeLevel(nivel - 1))

  const enHeader = variant === "header"
  const shell = enHeader
    ? "border-white/25 bg-white/10"
    : "border-border bg-card"
  const btnGhost = enHeader
    ? "text-white/90 hover:bg-white/15 disabled:text-white/35"
    : "text-slate-600 hover:bg-slate-100 disabled:text-slate-300"
  const btnOn = enHeader ? "bg-white text-primary shadow-sm" : "bg-primary text-white shadow-sm"
  const btnOff = enHeader
    ? "text-white/75 hover:bg-white/12"
    : "text-slate-500 hover:bg-slate-50"

  if (!listo) {
    return (
      <div
        className={`h-8 w-[7.25rem] shrink-0 rounded-full border ${shell}`}
        aria-hidden
      />
    )
  }

  return (
    <div
      className={`flex shrink-0 items-center gap-0.5 rounded-full border p-0.5 ${shell}`}
      role="group"
      aria-label="Tamaño del texto"
    >
      <button
        type="button"
        onClick={bajar}
        disabled={nivel === 0}
        className={`flex h-7 w-7 items-center justify-center rounded-full text-base font-medium transition disabled:cursor-not-allowed ${btnGhost}`}
        aria-label="Reducir tamaño del texto"
      >
        <span aria-hidden className="leading-none">
          −
        </span>
      </button>

      <div className="flex items-center gap-px px-0.5">
        {([0, 1, 2, 3] as const).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => elegir(level)}
            aria-label={TEXT_SIZE_LABELS[level]}
            aria-pressed={nivel === level}
            className={`flex h-7 w-7 items-center justify-center rounded-full font-semibold transition ${
              nivel === level ? btnOn : btnOff
            }`}
          >
            <span className={A_CLASS[level]} aria-hidden>
              A
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={subir}
        disabled={nivel === 3}
        className={`flex h-7 w-7 items-center justify-center rounded-full text-base font-medium transition disabled:cursor-not-allowed ${btnGhost}`}
        aria-label="Aumentar tamaño del texto"
      >
        <span aria-hidden className="leading-none">
          +
        </span>
      </button>
    </div>
  )
}
