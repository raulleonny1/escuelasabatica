"use client"

import { useCallback, useEffect, useRef, type RefObject } from "react"
import getStroke from "perfect-freehand"
import { esEntradaPen } from "@/lib/pizarraTinta"
import type { HerramientaLeccion } from "@/lib/leccionAnotaciones"
import {
  borrarTrazosEnPunto,
  grosorDesdePresion,
  guardarTrazosLeccion,
  interpolarPuntos,
  leerTrazosLeccion,
  RADIO_BORRADOR_LECCION,
  type TrazoLeccionLocal,
} from "@/lib/leccionTintaLocal"

const COLOR_LAPIZ = "#b45309"
const GROSOR_BASE = 4.5

function contornoDesdeTrazo(points: [number, number, number][], size: number) {
  return getStroke(
    points.map(([x, y, p]) => [x, y, p]),
    {
      size,
      thinning: 0.62,
      smoothing: 0.62,
      streamline: 0.48,
      simulatePressure: true,
      easing: (t) => t,
      start: { taper: 4, cap: true },
      end: { taper: 4, cap: true },
    }
  )
}

function pintarTrazo(ctx: CanvasRenderingContext2D, trazo: TrazoLeccionLocal) {
  if (trazo.points.length === 1) {
    const [x, y] = trazo.points[0]
    ctx.fillStyle = trazo.color
    ctx.beginPath()
    ctx.arc(x, y, trazo.size * 0.45, 0, Math.PI * 2)
    ctx.fill()
    return
  }

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

function pintarIndicadorBorrador(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
) {
  ctx.save()
  ctx.strokeStyle = "rgba(30, 58, 95, 0.35)"
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(x, y, RADIO_BORRADOR_LECCION, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function repintar(
  ctx: CanvasRenderingContext2D,
  trazos: TrazoLeccionLocal[],
  borrador?: { x: number; y: number } | null
) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  for (const t of trazos) pintarTrazo(ctx, t)
  if (borrador) pintarIndicadorBorrador(ctx, borrador.x, borrador.y)
}

type Props = {
  semana: number
  fecha: string
  modo: Extract<HerramientaLeccion, "subrayar" | "borrador"> | null
  anclaRef: RefObject<HTMLElement | null>
}

export default function LeccionInkCapa({ semana, fecha, modo, anclaRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trazosRef = useRef<TrazoLeccionLocal[]>([])
  const trazoActivo = useRef<[number, number, number][]>([])
  const grosorActivo = useRef(GROSOR_BASE)
  const pintando = useRef(false)
  const pointerId = useRef<number | null>(null)
  const borradorPos = useRef<{ x: number; y: number } | null>(null)
  const modoRef = useRef(modo)
  modoRef.current = modo

  const activo = modo !== null

  const sincronizarTamano = useCallback(() => {
    const ancla = anclaRef.current
    const canvas = canvasRef.current
    if (!ancla || !canvas) return
    const w = ancla.scrollWidth
    const h = ancla.scrollHeight
    if (w <= 0 || h <= 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    repintar(ctx, trazosRef.current, borradorPos.current)
  }, [anclaRef])

  useEffect(() => {
    trazosRef.current = leerTrazosLeccion(semana, fecha)
    borradorPos.current = null
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

  const puedeInteractuar = useCallback((e: PointerEvent) => {
    if (!modoRef.current) return false
    if (e.pointerType === "mouse") return e.buttons === 1
    if (esEntradaPen(e.pointerType)) return true
    return e.pointerType === "touch"
  }, [])

  const aplicarBorrador = useCallback(
    (x: number, y: number) => {
      const { trazos, huboCambio } = borrarTrazosEnPunto(trazosRef.current, x, y)
      if (huboCambio) {
        trazosRef.current = trazos
        persistir()
      }
      borradorPos.current = { x, y }
      const ctx = canvasRef.current?.getContext("2d")
      if (ctx) repintar(ctx, trazosRef.current, borradorPos.current)
    },
    [persistir]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !activo) return

    const onPointerDown = (e: PointerEvent) => {
      if (!puedeInteractuar(e)) return
      const p = puntoDesdeEvento(e)
      if (!p) return
      e.preventDefault()
      canvas.setPointerCapture(e.pointerId)
      pointerId.current = e.pointerId
      pintando.current = true

      if (modoRef.current === "borrador") {
        aplicarBorrador(p[0], p[1])
        return
      }

      grosorActivo.current = grosorDesdePresion(p[2], GROSOR_BASE)
      trazoActivo.current = [p]
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!pintando.current || pointerId.current !== e.pointerId) return
      const p = puntoDesdeEvento(e)
      if (!p) return
      e.preventDefault()

      if (modoRef.current === "borrador") {
        aplicarBorrador(p[0], p[1])
        return
      }

      const pts = trazoActivo.current
      const ultimo = pts[pts.length - 1]
      const nuevos = interpolarPuntos(ultimo, p)
      pts.push(...nuevos)

      const ctx = canvas.getContext("2d")
      if (!ctx) return
      repintar(ctx, trazosRef.current)
      pintarTrazo(ctx, {
        id: "activo",
        points: pts,
        color: COLOR_LAPIZ,
        size: grosorActivo.current,
      })
    }

    const onPointerUp = (e: PointerEvent) => {
      if (pointerId.current !== e.pointerId) return
      pintando.current = false
      pointerId.current = null

      if (modoRef.current === "borrador") {
        borradorPos.current = null
        const ctx = canvas.getContext("2d")
        if (ctx) repintar(ctx, trazosRef.current)
      } else {
        const pts = trazoActivo.current
        trazoActivo.current = []
        if (pts.length >= 1) {
          trazosRef.current = [
            ...trazosRef.current,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              points: pts,
              color: COLOR_LAPIZ,
              size: grosorActivo.current,
            },
          ]
          persistir()
        }
        const ctx = canvas.getContext("2d")
        if (ctx) repintar(ctx, trazosRef.current)
      }

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
  }, [activo, aplicarBorrador, persistir, puedeInteractuar, puntoDesdeEvento])

  return (
    <canvas
      ref={canvasRef}
      className={`leccion-ink-capa${activo ? " leccion-ink-capa-activa" : ""}${
        modo === "borrador" ? " leccion-ink-capa-borrador" : ""
      }`}
      aria-hidden
    />
  )
}
