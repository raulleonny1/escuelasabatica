"use client"

import { useCallback, useEffect, useState, type RefObject } from "react"
import { leerTrazosLeccion, type TrazoLeccionLocal } from "@/lib/leccionTintaLocal"

type Props = {
  semana: number
  fecha: string
  anclaRef: RefObject<HTMLElement | null>
  revision?: number
}

function trazoSvgProps(trazo: TrazoLeccionLocal, key: string) {
  const { points, color, size } = trazo
  if (points.length === 0) return null

  if (points.length === 1) {
    const [x, y] = points[0]
    const r = size * 0.42
    return (
      <circle
        key={key}
        cx={x}
        cy={y}
        r={r}
        fill={color}
        stroke="none"
      />
    )
  }

  const coords = points.map(([x, y]) => `${x},${y}`).join(" ")
  return (
    <polyline
      key={key}
      points={coords}
      fill="none"
      stroke={color}
      strokeWidth={size}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

/** Muestra rayas guardadas sin canvas (evita fondo negro en PC/móvil). */
export default function LeccionInkSvgOverlay({
  semana,
  fecha,
  anclaRef,
  revision = 0,
}: Props) {
  const [trazos, setTrazos] = useState<TrazoLeccionLocal[]>([])
  const [dims, setDims] = useState({ w: 0, h: 0 })

  const sincronizar = useCallback(() => {
    setTrazos(leerTrazosLeccion(semana, fecha))
    const ancla = anclaRef.current
    if (ancla) {
      setDims({
        w: Math.max(ancla.scrollWidth, ancla.clientWidth),
        h: Math.max(ancla.scrollHeight, ancla.clientHeight),
      })
    }
  }, [semana, fecha, anclaRef])

  useEffect(() => {
    sincronizar()
  }, [sincronizar, revision])

  useEffect(() => {
    const ancla = anclaRef.current
    if (!ancla) return
    const obs = new ResizeObserver(() => sincronizar())
    obs.observe(ancla)
    return () => obs.disconnect()
  }, [anclaRef, sincronizar])

  if (trazos.length === 0 || dims.w <= 0 || dims.h <= 0) return null

  return (
    <div className="leccion-ink-svg" aria-hidden>
      <svg
        width={dims.w}
        height={dims.h}
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        preserveAspectRatio="xMinYMin meet"
      >
        {trazos.map((t) => trazoSvgProps(t, t.id))}
      </svg>
    </div>
  )
}
