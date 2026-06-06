"use client"

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import { MotorPizarraWebGL } from "@/lib/pizarraWebGL"
import {
  agregarPuntoTinta,
  aplicarBorradoVectorial,
  esEntradaValidaPizarra,
  mallaDesdeTrazo,
  muestrearPuntero,
  predecirPuntosTinta,
  resolverTrazoTinta,
  trazoFirestoreATinta,
  trazoTintaAFirestore,
  type PuntoTinta,
  type TrazoTinta,
} from "@/lib/pizarraTinta"
import {
  eliminarTrazosPizarra,
  guardarTrazoPizarra,
  subscribeTrazosPizarra,
  type HerramientaPizarra,
  type TrazoPizarra,
} from "@/lib/pizarraClase"

const ID_ACTIVO = "__activo__"
const ID_PREDICCION = "__prediccion__"

export type PizarraInkCanvasRef = {
  forzarRender: () => void
}

type Props = {
  claseId: string
  paginaActual: number
  esMaestro: boolean
  abierta: boolean
  visible: boolean
  herramienta: HerramientaPizarra
  color: string
  grosor: number
  grosorBorrador: number
  limpiarEn?: number
  onTrazosChange?: (count: number) => void
}

const PizarraInkCanvas = forwardRef<PizarraInkCanvasRef, Props>(function PizarraInkCanvas(
  {
    claseId,
    paginaActual,
    esMaestro,
    abierta,
    visible,
    herramienta,
    color,
    grosor,
    grosorBorrador,
    limpiarEn,
    onTrazosChange,
  },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const motorRef = useRef<MotorPizarraWebGL | null>(null)
  const trazosRef = useRef<TrazoTinta[]>([])
  const trazoActivo = useRef<PuntoTinta[]>([])
  const pintando = useRef(false)
  const pointerIdActivo = useRef<number | null>(null)
  const t0Trazo = useRef(0)
  const [lapizDetectado, setLapizDetectado] = useState(false)
  const rafRender = useRef(0)
  const ultimoLimpiar = useRef(0)
  const dims = useRef({ w: 0, h: 0, dpr: 1 })

  const sincronizarDims = useCallback(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return false
    const rect = wrap.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return false
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    dims.current = { w: rect.width, h: rect.height, dpr }
    motorRef.current?.resize(rect.width, rect.height, dpr)
    return true
  }, [])

  const reconstruirCapas = useCallback(() => {
    const motor = motorRef.current
    const { w, h } = dims.current
    if (!motor || w <= 0) return

    for (const trazo of trazosRef.current) {
      motor.actualizarCapa(trazo.id, mallaDesdeTrazo(trazo, w, h))
    }

    let tienePrediccion = false

    if (trazoActivo.current.length > 0) {
      const preview = resolverTrazoTinta(
        trazoActivo.current,
        herramienta,
        color,
        grosor,
        grosorBorrador,
        paginaActual
      )
      if (preview) {
        const malla = mallaDesdeTrazo({ id: ID_ACTIVO, orden: 0, ...preview }, w, h)
        if (malla) motor.actualizarCapa(ID_ACTIVO, malla)

        const pred = predecirPuntosTinta(trazoActivo.current)
        if (pred.length > 0 && herramienta !== "borrador") {
          const predPreview = resolverTrazoTinta(
            [...trazoActivo.current, ...pred],
            "lapiz",
            color,
            grosor,
            grosorBorrador,
            paginaActual
          )
          if (predPreview) {
            const m = mallaDesdeTrazo({ id: ID_PREDICCION, orden: 0, ...predPreview }, w, h)
            if (m) {
              m.color = [m.color[0], m.color[1], m.color[2], 0.45]
              motor.actualizarCapa(ID_PREDICCION, m)
              tienePrediccion = true
            }
          }
        } else {
          motor.eliminarCapa(ID_PREDICCION)
        }
      }
    } else {
      motor.eliminarCapa(ID_ACTIVO)
      motor.eliminarCapa(ID_PREDICCION)
    }

    const ids = trazosRef.current.map((t) => t.id)
    motor.podarCapas(new Set([...ids, ID_ACTIVO, ID_PREDICCION]))
    const overlays: string[] = []
    if (trazoActivo.current.length > 0) overlays.push(ID_ACTIVO)
    if (tienePrediccion) overlays.push(ID_PREDICCION)
    motor.render(ids, overlays)
  }, [color, grosor, grosorBorrador, herramienta, paginaActual])

  const programarRender = useCallback(() => {
    cancelAnimationFrame(rafRender.current)
    rafRender.current = requestAnimationFrame(() => {
      if (!sincronizarDims()) return
      reconstruirCapas()
    })
  }, [reconstruirCapas, sincronizarDims])

  useImperativeHandle(ref, () => ({ forzarRender: programarRender }), [programarRender])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !visible || !abierta) return
    try {
      motorRef.current = new MotorPizarraWebGL(canvas)
    } catch (e) {
      console.error("WebGL2 no disponible para pizarra", e)
    }
    programarRender()
    return () => {
      motorRef.current?.dispose()
      motorRef.current = null
    }
  }, [abierta, visible, programarRender])

  useEffect(() => {
    if (!claseId || !abierta || !visible) return
    trazosRef.current = []
    trazoActivo.current = []
    return subscribeTrazosPizarra(claseId, paginaActual, (trazos: TrazoPizarra[]) => {
      if (pintando.current) return
      trazosRef.current = trazos
        .filter((t) => t.herramienta !== "borrador")
        .map(trazoFirestoreATinta)
      onTrazosChange?.(trazosRef.current.length)
      programarRender()
    })
  }, [claseId, abierta, visible, paginaActual, programarRender, onTrazosChange])

  useEffect(() => {
    if (limpiarEn && limpiarEn > ultimoLimpiar.current) {
      ultimoLimpiar.current = limpiarEn
      trazosRef.current = []
      trazoActivo.current = []
      motorRef.current?.limpiarCapas()
      programarRender()
    }
  }, [limpiarEn, programarRender])

  useEffect(() => {
    if (!abierta || !visible) return
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(() => {
      if (!pintando.current) programarRender()
    })
    ro.observe(wrap)
    programarRender()
    return () => ro.disconnect()
  }, [abierta, visible, programarRender])

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!esMaestro) return
    if (!esEntradaValidaPizarra(e.pointerType)) return
    if (e.pointerType === "mouse" && e.buttons !== 1) return
    if (pintando.current && pointerIdActivo.current !== e.pointerId) return

    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    pointerIdActivo.current = e.pointerId
    pintando.current = true
    setLapizDetectado(e.pointerType === "pen")
    t0Trazo.current = performance.now()

    const rect = wrapRef.current!.getBoundingClientRect()
    trazoActivo.current = [muestrearPuntero(e.nativeEvent, rect, t0Trazo.current)]
    programarRender()
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!esMaestro || !pintando.current || pointerIdActivo.current !== e.pointerId) return
    if (!esEntradaValidaPizarra(e.pointerType)) return
    e.preventDefault()

    const rect = wrapRef.current!.getBoundingClientRect()
    const eventos = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]
    let cambio = false
    for (const ev of eventos) {
      const p = muestrearPuntero(ev, rect, t0Trazo.current)
      const next = agregarPuntoTinta(trazoActivo.current, p, e.pointerType === "pen" ? 0.4 : 0.8)
      if (next.length !== trazoActivo.current.length) {
        trazoActivo.current = next
        cambio = true
      }
    }
    if (cambio) programarRender()
  }

  async function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!esMaestro || pointerIdActivo.current !== e.pointerId) return
    e.preventDefault()

    cancelAnimationFrame(rafRender.current)
    pintando.current = false
    pointerIdActivo.current = null

    const pts = [...trazoActivo.current]
    trazoActivo.current = []

    if (pts.length >= 1 && claseId) {
      if (herramienta === "borrador") {
        const antes = trazosRef.current
        const despues = aplicarBorradoVectorial(antes, pts, grosorBorrador)
        const eliminados = antes.filter((t) => !despues.some((d) => d.id === t.id))
        trazosRef.current = despues
        for (const t of eliminados) motorRef.current?.eliminarCapa(t.id)
        if (eliminados.length) await eliminarTrazosPizarra(claseId, eliminados.map((t) => t.id))
      } else {
        const res = resolverTrazoTinta(pts, herramienta, color, grosor, grosorBorrador, paginaActual)
        if (res) {
          await guardarTrazoPizarra(claseId, trazoTintaAFirestore(res))
        }
      }
    }

    motorRef.current?.eliminarCapa(ID_ACTIVO)
    motorRef.current?.eliminarCapa(ID_PREDICCION)
    programarRender()
  }

  return (
    <div ref={wrapRef} className="pizarra-lienzo relative min-h-0 flex-1 bg-[#faf8f3]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={onPointerUp}
      />
      {esMaestro && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-800/70 px-3 py-1 text-[10px] text-white">
          {lapizDetectado ? "Apple Pencil · presión activa" : "Usa lápiz/stylus (dedo ignorado)"}
        </div>
      )}
    </div>
  )
})

export default PizarraInkCanvas
