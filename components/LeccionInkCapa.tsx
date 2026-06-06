"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { MotorPizarraWebGL } from "@/lib/pizarraWebGL"
import { esEntradaPen, predecirPuntosInk } from "@/lib/pizarraTinta"
import type { HerramientaLeccion } from "@/lib/leccionAnotaciones"
import {
  agregarPuntosInk,
  esEntradaDibujo,
  puntosCoalescidos,
  puntosPredichos,
  type PuntoInk,
} from "@/lib/leccionInkInput"
import { mallaDesdeTrazoLeccion, mallaDesdeTrazoGuardado } from "@/lib/leccionInkMalla"
import {
  borrarTrazosEnPunto,
  grosorDesdePresion,
  guardarTrazosLeccion,
  leerTrazosLeccion,
  type TrazoLeccionLocal,
} from "@/lib/leccionTintaLocal"

const COLOR_LAPIZ = "#92400e"
const GROSOR_BASE = 4.5
const ID_ACTIVO = "__activo__"
const ID_PRED = "__prediccion__"

type Props = {
  semana: number
  fecha: string
  modo: Extract<HerramientaLeccion, "subrayar" | "borrador"> | null
  anclaRef: RefObject<HTMLElement | null>
}

export default function LeccionInkCapa({ semana, fecha, modo, anclaRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const motorRef = useRef<MotorPizarraWebGL | null>(null)
  const trazosRef = useRef<TrazoLeccionLocal[]>([])
  const trazoActivo = useRef<PuntoInk[]>([])
  const prediccionActiva = useRef<PuntoInk[]>([])
  const grosorActivo = useRef(GROSOR_BASE)
  const pintando = useRef(false)
  const penPrioritario = useRef(false)
  const pointerId = useRef<number | null>(null)
  const rafRender = useRef(0)
  const mallasCache = useRef(new Map<string, string>())
  const dims = useRef({ w: 0, h: 0, dpr: 1 })
  const modoRef = useRef(modo)
  modoRef.current = modo

  const [webglOk, setWebglOk] = useState(true)
  const puedeDibujar = modo !== null

  const sincronizarDims = useCallback(() => {
    const ancla = anclaRef.current
    const canvas = canvasRef.current
    if (!ancla || !canvas) return false

    const w = Math.max(ancla.scrollWidth, ancla.clientWidth)
    const h = Math.max(ancla.scrollHeight, ancla.clientHeight)
    if (w <= 0 || h <= 0) return false

    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    dims.current = { w, h, dpr }
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    motorRef.current?.resize(w, h, dpr)
    return true
  }, [anclaRef])

  const actualizarCapa = useCallback(
    (
      id: string,
      points: PuntoInk[],
      color: string,
      size: number,
      alpha = 1,
      forzar = false
    ) => {
      const motor = motorRef.current
      if (!motor) return
      const { dpr } = dims.current
      if (points.length === 0) {
        motor.eliminarCapa(id)
        mallasCache.current.delete(id)
        return
      }
      const sig = `${id}:${points.length}:${points.at(-1)?.join(",")}:${size}:${alpha}`
      if (!forzar && mallasCache.current.get(id) === sig) return
      const malla = mallaDesdeTrazoLeccion(points, color, size, dpr, alpha)
      motor.actualizarCapa(id, malla)
      mallasCache.current.set(id, sig)
    },
    []
  )

  const renderFrame = useCallback(() => {
    const motor = motorRef.current
    if (!motor || dims.current.w <= 0) return

    const ids = trazosRef.current.map((t) => t.id)
    const { dpr } = dims.current

    for (const trazo of trazosRef.current) {
      const sig = `${trazo.id}:saved`
      if (mallasCache.current.get(trazo.id) !== sig) {
        const malla = mallaDesdeTrazoGuardado(trazo, dpr)
        motor.actualizarCapa(trazo.id, malla)
        mallasCache.current.set(trazo.id, sig)
      }
    }

    const overlays: string[] = []
    const pts = trazoActivo.current

    if (pts.length > 0 && modoRef.current === "subrayar") {
      actualizarCapa(ID_ACTIVO, pts, COLOR_LAPIZ, grosorActivo.current, 1, true)
      overlays.push(ID_ACTIVO)

      const pred = prediccionActiva.current
      if (pred.length > 0) {
        actualizarCapa(
          ID_PRED,
          [...pts.slice(-2), ...pred],
          COLOR_LAPIZ,
          grosorActivo.current,
          0.38,
          true
        )
        overlays.push(ID_PRED)
      } else {
        motor.eliminarCapa(ID_PRED)
      }
    } else {
      motor.eliminarCapa(ID_ACTIVO)
      motor.eliminarCapa(ID_PRED)
    }

    motor.podarCapas(new Set([...ids, ID_ACTIVO, ID_PRED]))
    motor.render(ids, overlays)
  }, [actualizarCapa])

  const programarRender = useCallback(() => {
    cancelAnimationFrame(rafRender.current)
    rafRender.current = requestAnimationFrame(() => {
      if (!sincronizarDims()) return
      renderFrame()
    })
  }, [renderFrame, sincronizarDims])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      motorRef.current = new MotorPizarraWebGL(canvas, { fondoTransparente: true })
      setWebglOk(true)
    } catch (e) {
      console.warn("[leccion-ink] WebGL no disponible", e)
      motorRef.current = null
      setWebglOk(false)
    }
    programarRender()
    return () => {
      motorRef.current?.dispose()
      motorRef.current = null
      mallasCache.current.clear()
    }
  }, [programarRender])

  useEffect(() => {
    trazosRef.current = leerTrazosLeccion(semana, fecha)
    mallasCache.current.clear()
    programarRender()
  }, [semana, fecha, programarRender])

  useEffect(() => {
    const ancla = anclaRef.current
    if (!ancla) return
    const obs = new ResizeObserver(() => {
      if (!pintando.current) {
        mallasCache.current.clear()
        programarRender()
      }
    })
    obs.observe(ancla)
    return () => obs.disconnect()
  }, [anclaRef, programarRender])

  const persistir = useCallback(() => {
    guardarTrazosLeccion(semana, fecha, trazosRef.current)
  }, [semana, fecha])

  const rectAncla = useCallback(() => {
    return anclaRef.current?.getBoundingClientRect() ?? null
  }, [anclaRef])

  const rechazarEntrada = useCallback((e: PointerEvent) => {
    if (penPrioritario.current && e.pointerType !== "pen") return true
    return false
  }, [])

  const aplicarBorrador = useCallback(
    (x: number, y: number) => {
      const { trazos, huboCambio } = borrarTrazosEnPunto(trazosRef.current, x, y)
      if (huboCambio) {
        trazosRef.current = trazos
        persistir()
        mallasCache.current.clear()
        programarRender()
      }
    },
    [persistir, programarRender]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !puedeDibujar || !webglOk) return

    const onPointerDown = (e: PointerEvent) => {
      if (!modoRef.current || !esEntradaDibujo(e)) return
      if (rechazarEntrada(e)) {
        e.preventDefault()
        return
      }

      const rect = rectAncla()
      if (!rect) return

      e.preventDefault()
      canvas.setPointerCapture(e.pointerId)
      pointerId.current = e.pointerId
      pintando.current = true
      if (esEntradaPen(e.pointerType)) penPrioritario.current = true

      const puntos = puntosCoalescidos(e, rect)
      const p = puntos[puntos.length - 1]
      if (!p) return

      if (modoRef.current === "borrador") {
        aplicarBorrador(p[0], p[1])
        return
      }

      grosorActivo.current = grosorDesdePresion(p[2], GROSOR_BASE)
      trazoActivo.current = [p]
      prediccionActiva.current = []
      programarRender()
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!pintando.current || pointerId.current !== e.pointerId) return
      if (rechazarEntrada(e)) return

      const rect = rectAncla()
      if (!rect) return
      e.preventDefault()

      const coalescidos = puntosCoalescidos(e, rect)
      const ultimo = coalescidos[coalescidos.length - 1]
      if (!ultimo) return

      if (modoRef.current === "borrador") {
        for (const c of coalescidos) aplicarBorrador(c[0], c[1])
        return
      }

      trazoActivo.current = agregarPuntosInk(trazoActivo.current, coalescidos, 0.5)

      const predNativa = puntosPredichos(e, rect)
      if (predNativa.length > 0) {
        prediccionActiva.current = predNativa
      } else if (trazoActivo.current.length >= 2) {
        const ultimos = trazoActivo.current.slice(-3)
        prediccionActiva.current = predecirPuntosInk(
          ultimos.map(([x, y, pr]) => ({
            x,
            y,
            pressure: pr,
            time: 0,
            tiltX: 0,
            tiltY: 0,
          })),
          2
        ).map((p) => [p.x, p.y, p.pressure] as PuntoInk)
      }

      programarRender()
    }

    const onPointerUp = (e: PointerEvent) => {
      if (pointerId.current !== e.pointerId) return

      cancelAnimationFrame(rafRender.current)
      pintando.current = false
      pointerId.current = null
      prediccionActiva.current = []

      if (esEntradaPen(e.pointerType)) penPrioritario.current = false

      if (modoRef.current === "subrayar") {
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
          mallasCache.current.delete(trazosRef.current.at(-1)!.id)
        }
      } else {
        trazoActivo.current = []
      }

      programarRender()

      try {
        canvas.releasePointerCapture(e.pointerId)
      } catch {
        /* ya liberado */
      }
    }

    canvas.addEventListener("pointerdown", onPointerDown, { passive: false })
    canvas.addEventListener("pointermove", onPointerMove, { passive: false })
    canvas.addEventListener("pointerup", onPointerUp, { passive: false })
    canvas.addEventListener("pointercancel", onPointerUp, { passive: false })

    return () => {
      cancelAnimationFrame(rafRender.current)
      canvas.removeEventListener("pointerdown", onPointerDown)
      canvas.removeEventListener("pointermove", onPointerMove)
      canvas.removeEventListener("pointerup", onPointerUp)
      canvas.removeEventListener("pointercancel", onPointerUp)
    }
  }, [
    puedeDibujar,
    webglOk,
    aplicarBorrador,
    persistir,
    programarRender,
    rectAncla,
    rechazarEntrada,
  ])

  return (
    <div
      className={`leccion-ink-capas${puedeDibujar ? " leccion-ink-capa-activa" : ""}${
        modo === "borrador" ? " leccion-ink-capa-borrador" : ""
      }${webglOk ? " leccion-ink-webgl" : ""}`}
      aria-hidden
    >
      <canvas ref={canvasRef} className="leccion-ink-gl" />
      {!webglOk && (
        <p className="leccion-ink-fallback" role="status">
          Motor gráfico limitado en este dispositivo.
        </p>
      )}
    </div>
  )
}
