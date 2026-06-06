"use client"

import { useCallback, useEffect, useRef, type RefObject } from "react"
import getStroke from "perfect-freehand"
import { esEntradaPen } from "@/lib/pizarraTinta"
import {
  guardarTrazosLeccion,
  leerTrazosLeccion,
  type TrazoLeccionLocal,
} from "@/lib/leccionTintaLocal"

const COLOR_LAPIZ = "#b45309"
const GROSOR = 3

function contornoDesdeTrazo(points: [number, number, number][], size: number) {
  return getStroke(
    points.map(([x, y, p]) => [x, y, p]),
    {
      size,
      thinning: 0.55,
      smoothing: 0.55,
      streamline: 0.4,
      simulatePressure: true,
    }
  )
}

function pintarTrazo(
  ctx: CanvasRenderingContext2D,
  trazo: TrazoLeccionLocal
) {
  const outline = contornoDesdeTrazo(trazo.points, trazo.size)
  if (outline.length < 4) return
  ctx.fillStyle = trazo.color
  ctx.beginPath()
  ctx.moveTo(outline[0][0], outline[0][1])
  for (let i = 1; i < outline.length; i++) {
    ctx.lineTo(outline[i][0], outline[i][1])
  }
  ctx.closePath()
  ctx.fill()
}

function repintar(ctx: CanvasRenderingContext2D, trazos: TrazoLeccionLocal[]) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  for (const t of trazos) pintarTrazo(ctx, t)
}

type Props = {
  semana: number
  fecha: string
  activo: boolean
  anclaRef: RefObject<HTMLElement | null>
}

export default function LeccionInkCapa({ semana, fecha, activo, anclaRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trazosRef = useRef<TrazoLeccionLocal[]>([])
  const trazoActivo = useRef<[number, number, number][]>([])
  const pintando = useRef(false)
  const pointerId = useRef<number | null>(null)

  const sincronizarTamano = useCallback(() => {
    const ancla = anclaRef.current
    const canvas = canvasRef.current
    if (!ancla || !canvas) return
    const w = ancla.scrollWidth
    const h = ancla.scrollHeight
    if (w <= 0 || h <= 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    repintar(ctx, trazosRef.current)
  }, [anclaRef])

  useEffect(() => {
    trazosRef.current = leerTrazosLeccion(semana, fecha)
    sincronizarTamano()
  }, [semana, fecha, sincronizarTamano])

  useEffect(() => {
    const ancla = anclaRef.current
    if (!ancla) return
    const obs = new ResizeObserver(() => sincronizarTamano())
    obs.observe(ancla)
    return () => obs.disconnect()
  }, [anclaRef, sincronizarTamano])

  const persistir = useCallback(() => {
    guardarTrazosLeccion(semana, fecha, trazosRef.current)
  }, [semana, fecha])

  const puntoDesdeEvento = useCallback(
    (e: PointerEvent): [number, number, number] | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null
      const pressure = e.pressure > 0 && e.pressure <= 1 ? e.pressure : 0.5
      return [x, y, pressure]
    },
    []
  )

  const puedeDibujar = useCallback((e: PointerEvent) => {
    if (!activo) return false
    if (e.pointerType === "mouse") return e.buttons === 1
    if (esEntradaPen(e.pointerType)) return true
    return e.pointerType === "touch"
  }, [activo])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !activo) return

    const onPointerDown = (e: PointerEvent) => {
      if (!puedeDibujar(e)) return
      const p = puntoDesdeEvento(e)
      if (!p) return
      e.preventDefault()
      canvas.setPointerCapture(e.pointerId)
      pointerId.current = e.pointerId
      pintando.current = true
      trazoActivo.current = [p]
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!pintando.current || pointerId.current !== e.pointerId) return
      const p = puntoDesdeEvento(e)
      if (!p) return
      e.preventDefault()
      const pts = trazoActivo.current
      const ultimo = pts[pts.length - 1]
      if (Math.hypot(p[0] - ultimo[0], p[1] - ultimo[1]) < 1.5) return
      pts.push(p)
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      repintar(ctx, trazosRef.current)
      pintarTrazo(ctx, {
        id: "activo",
        points: pts,
        color: COLOR_LAPIZ,
        size: GROSOR,
      })
    }

    const onPointerUp = (e: PointerEvent) => {
      if (pointerId.current !== e.pointerId) return
      pintando.current = false
      pointerId.current = null
      const pts = trazoActivo.current
      trazoActivo.current = []
      if (pts.length >= 2) {
        trazosRef.current = [
          ...trazosRef.current,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            points: pts,
            color: COLOR_LAPIZ,
            size: GROSOR,
          },
        ]
        persistir()
      }
      const ctx = canvas.getContext("2d")
      if (ctx) repintar(ctx, trazosRef.current)
      try {
        canvas.releasePointerCapture(e.pointerId)
      } catch {
        /* ya liberado */
      }
    }

    canvas.addEventListener("pointerdown", onPointerDown)
    canvas.addEventListener("pointermove", onPointerMove)
    canvas.addEventListener("pointerup", onPointerUp)
    canvas.addEventListener("pointercancel", onPointerUp)

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown)
      canvas.removeEventListener("pointermove", onPointerMove)
      canvas.removeEventListener("pointerup", onPointerUp)
      canvas.removeEventListener("pointercancel", onPointerUp)
    }
  }, [activo, persistir, puedeDibujar, puntoDesdeEvento])

  return (
    <canvas
      ref={canvasRef}
      className={`leccion-ink-capa${activo ? " leccion-ink-capa-activa" : ""}`}
      aria-hidden
    />
  )
}
