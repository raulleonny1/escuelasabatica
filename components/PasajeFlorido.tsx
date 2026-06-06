"use client"

import { useEffect, useState } from "react"
import {
  referenciaEtiqueta,
  resolverPasaje,
  type PasajeResuelto,
  type ReferenciaBiblica,
} from "@/lib/pasajeBiblico"

type Props = {
  pasaje: ReferenciaBiblica | null
  onCerrar: () => void
}

export default function PasajeFlorido({ pasaje, onCerrar }: Props) {
  const [datos, setDatos] = useState<PasajeResuelto | null>(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (!pasaje) {
      setDatos(null)
      return
    }
    let cancelado = false
    setCargando(true)
    void resolverPasaje(pasaje).then((res) => {
      if (!cancelado) {
        setDatos(res)
        setCargando(false)
      }
    })
    return () => {
      cancelado = true
    }
  }, [pasaje])

  if (!pasaje) return null

  const etiqueta = referenciaEtiqueta(pasaje)

  return (
    <div
      className="pasaje-florido-overlay fixed inset-x-0 bottom-0 z-[70] flex justify-center p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:p-6"
      role="dialog"
      aria-label={`Pasaje bíblico ${etiqueta}`}
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onCerrar} aria-hidden />
      <article className="pasaje-florido relative w-full max-w-lg">
        <button
          type="button"
          onClick={onCerrar}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm active:bg-white/30"
          aria-label="Cerrar pasaje"
        >
          ×
        </button>

        <div className="pasaje-florido-ornamento" aria-hidden>
          <span className="pasaje-florido-ornamento-izq">❦</span>
          <span className="pasaje-florido-cruz">✝</span>
          <span className="pasaje-florido-ornamento-der">❦</span>
        </div>

        <header className="pasaje-florido-cabecera">
          <p className="pasaje-florido-etiqueta">Santa Biblia · RVR 1909</p>
          <h3 className="pasaje-florido-ref">{etiqueta}</h3>
        </header>

        <div className="pasaje-florido-cuerpo custom-scroll max-h-[min(50vh,360px)] overflow-y-auto">
          {cargando && (
            <p className="py-6 text-center text-sm text-primary/70">Abriendo pasaje…</p>
          )}
          {!cargando && datos?.error && (
            <p className="py-4 text-center text-sm text-red-700">{datos.error}</p>
          )}
          {!cargando &&
            datos?.versiculos.map((v) => (
              <p key={v.numero} className="pasaje-florido-versiculo">
                <sup className="pasaje-florido-num">{v.numero}</sup>
                {v.texto}
              </p>
            ))}
        </div>
      </article>
    </div>
  )
}
