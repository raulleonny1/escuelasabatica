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
  agregarPuntoInk,
  borrarSegmentosInk,
  esEntradaPen,
  mallaDesdeStroke,
  muestrearPunteroPen,
  PilaUndoRedo,
  predecirPuntosInk,
  registrarLatenciaTinta,
  resolverStrokeInk,
  strokeFirestoreAInk,
  strokeInkAFirestore,
  type AccionPizarra,
  type InkPoint,
  type InkStroke,
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
  undo: () => void
  redo: () => void
  puedeUndo: () => boolean
  puedeRedo: () => boolean
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
  onUndoRedoChange?: (puedeUndo: boolean, puedeRedo: boolean) => void
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
    onUndoRedoChange,
  },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const motorRef = useRef<MotorPizarraWebGL | null>(null)
  const trazosRef = useRef<InkStroke[]>([])
  const trazoActivo = useRef<InkPoint[]>([])
  const pintando = useRef(false)
  const penActivo = useRef(false)
  const pointerIdActivo = useRef<number | null>(null)
  const t0Trazo = useRef(0)
  const rafRender = useRef(0)
  const ultimoLimpiar = useRef(0)
  const dims = useRef({ w: 0, h: 0, dpr: 1 })
  const mallasCache = useRef(new Map<string, string>())
  const pilaUndo = useRef(new PilaUndoRedo())
  const [webglOk, setWebglOk] = useState(true)
  const [estadoPen, setEstadoPen] = useState<"esperando" | "activo">("esperando")

  const sincronizarDims = useCallback(() => {
    const wrap = wrapRef.current
    if (!wrap) return false
    const rect = wrap.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return false
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    dims.current = { w: rect.width, h: rect.height, dpr }
    motorRef.current?.resize(rect.width, rect.height, dpr)
    return true
  }, [])

  const actualizarCapaStroke = useCallback(
    (
      id: string,
      stroke: Parameters<typeof mallaDesdeStroke>[0] | null,
      opts?: { enVivo?: boolean }
    ) => {
      const motor = motorRef.current
      if (!motor) return
      const { w, h, dpr } = dims.current
      if (!stroke || w <= 0) {
        motor.eliminarCapa(id)
        mallasCache.current.delete(id)
        return
      }
      const sig = JSON.stringify(stroke.points.slice(-3)) + stroke.baseWidth + (opts?.enVivo ? "v" : "")
      if (mallasCache.current.get(id) === sig && id !== ID_ACTIVO) return
      const malla = mallaDesdeStroke(stroke, w, h, dpr, opts)
      motor.actualizarCapa(id, malla)
      mallasCache.current.set(id, sig)
    },
    []
  )

  const renderFrame = useCallback(() => {
    const motor = motorRef.current
    if (!motor || dims.current.w <= 0) return

    const ids = trazosRef.current.map((t) => t.id)

    for (const trazo of trazosRef.current) {
      actualizarCapaStroke(trazo.id, trazo)
    }

    const overlays: string[] = []
    if (trazoActivo.current.length > 0) {
      const ptsDibujo =
        herramienta !== "borrador" && trazoActivo.current.length >= 2
          ? [...trazoActivo.current, ...predecirPuntosInk(trazoActivo.current)]
          : trazoActivo.current

      const preview = resolverStrokeInk(
        ptsDibujo,
        herramienta,
        color,
        grosor,
        grosorBorrador,
        paginaActual,
        { enVivo: true }
      )
      if (preview) {
        actualizarCapaStroke(ID_ACTIVO, preview, { enVivo: true })
        overlays.push(ID_ACTIVO)
      }
    } else {
      motor.eliminarCapa(ID_ACTIVO)
    }

    motor.eliminarCapa(ID_PREDICCION)
    motor.podarCapas(new Set([...ids, ID_ACTIVO]))
    motor.render(ids, overlays)
  }, [
    actualizarCapaStroke,
    color,
    grosor,
    grosorBorrador,
    herramienta,
    paginaActual,
  ])

  const programarRender = useCallback(
    (inicio?: number) => {
      cancelAnimationFrame(rafRender.current)
      rafRender.current = requestAnimationFrame(() => {
        if (!sincronizarDims()) return
        renderFrame()
        if (inicio != null) registrarLatenciaTinta(inicio, "pointermove→render")
      })
    },
    [renderFrame, sincronizarDims]
  )

  const notificarUndoRedo = useCallback(() => {
    onUndoRedoChange?.(pilaUndo.current.puedeUndo(), pilaUndo.current.puedeRedo())
  }, [onUndoRedoChange])

  const aplicarAccionInversa = useCallback(
    async (accion: AccionPizarra, esUndo: boolean) => {
      if (accion.tipo === "addStroke") {
        if (esUndo) {
          trazosRef.current = trazosRef.current.filter((t) => t.id !== accion.stroke.id)
          await eliminarTrazosPizarra(claseId, [accion.stroke.id])
        } else {
          trazosRef.current = [...trazosRef.current, accion.stroke]
          await guardarTrazoPizarra(claseId, strokeInkAFirestore(accion.stroke))
        }
      } else if (accion.tipo === "removeStroke") {
        if (esUndo) {
          trazosRef.current = [...trazosRef.current, accion.stroke]
          await guardarTrazoPizarra(claseId, strokeInkAFirestore(accion.stroke))
        } else {
          trazosRef.current = trazosRef.current.filter((t) => t.id !== accion.stroke.id)
          await eliminarTrazosPizarra(claseId, [accion.stroke.id])
        }
      } else if (accion.tipo === "splitStroke") {
        if (esUndo) {
          trazosRef.current = trazosRef.current
            .filter((t) => !accion.strokes.some((s) => s.id === t.id))
            .concat([accion.original])
          await eliminarTrazosPizarra(claseId, accion.strokes.map((s) => s.id))
          await guardarTrazoPizarra(claseId, strokeInkAFirestore(accion.original))
        } else {
          trazosRef.current = trazosRef.current
            .filter((t) => t.id !== accion.original.id)
            .concat(accion.strokes)
          await eliminarTrazosPizarra(claseId, [accion.original.id])
          for (const s of accion.strokes) {
            await guardarTrazoPizarra(claseId, strokeInkAFirestore(s))
          }
        }
      }
      mallasCache.current.clear()
      programarRender()
      onTrazosChange?.(trazosRef.current.length)
    },
    [claseId, onTrazosChange, programarRender]
  )

  useImperativeHandle(
    ref,
    () => ({
      forzarRender: () => programarRender(),
      undo: () => {
        const a = pilaUndo.current.undo()
        if (a) void aplicarAccionInversa(a, true)
        notificarUndoRedo()
      },
      redo: () => {
        const a = pilaUndo.current.redo()
        if (a) void aplicarAccionInversa(a, false)
        notificarUndoRedo()
      },
      puedeUndo: () => pilaUndo.current.puedeUndo(),
      puedeRedo: () => pilaUndo.current.puedeRedo(),
    }),
    [aplicarAccionInversa, notificarUndoRedo, programarRender]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !visible || !abierta) return
    try {
      motorRef.current = new MotorPizarraWebGL(canvas)
      setWebglOk(true)
    } catch (e) {
      console.error("WebGL no disponible", e)
      motorRef.current = null
      setWebglOk(false)
    }
    programarRender()
    return () => {
      motorRef.current?.dispose()
      motorRef.current = null
      mallasCache.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierta, visible])

  useEffect(() => {
    if (!claseId || !abierta || !visible) return
    trazosRef.current = []
    trazoActivo.current = []
    pilaUndo.current.limpiar()
    mallasCache.current.clear()
    return subscribeTrazosPizarra(claseId, paginaActual, (trazos: TrazoPizarra[]) => {
      if (pintando.current) return
      trazosRef.current = trazos
        .filter((t) => t.herramienta !== "borrador")
        .map(strokeFirestoreAInk)
      onTrazosChange?.(trazosRef.current.length)
      mallasCache.current.clear()
      programarRender()
    })
  }, [claseId, abierta, visible, paginaActual, programarRender, onTrazosChange])

  useEffect(() => {
    if (limpiarEn && limpiarEn > ultimoLimpiar.current) {
      ultimoLimpiar.current = limpiarEn
      trazosRef.current = []
      trazoActivo.current = []
      pilaUndo.current.limpiar()
      motorRef.current?.limpiarCapas()
      mallasCache.current.clear()
      programarRender()
      notificarUndoRedo()
    }
  }, [limpiarEn, notificarUndoRedo, programarRender])

  useEffect(() => {
    if (!abierta || !visible) return
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(() => {
      mallasCache.current.clear()
      if (!pintando.current) programarRender()
    })
    ro.observe(wrap)
    programarRender()
    return () => ro.disconnect()
  }, [abierta, visible, programarRender])

  function rechazarNoPen(e: React.PointerEvent) {
    if (!esEntradaPen(e.pointerType)) {
      e.preventDefault()
      return true
    }
    if (penActivo.current && e.pointerType !== "pen") {
      e.preventDefault()
      return true
    }
    return false
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!esMaestro) return
    if (rechazarNoPen(e)) return
    if (pintando.current && pointerIdActivo.current !== e.pointerId) return

    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    pointerIdActivo.current = e.pointerId
    pintando.current = true
    penActivo.current = true
    setEstadoPen("activo")
    t0Trazo.current = performance.now()

    const rect = wrapRef.current!.getBoundingClientRect()
    trazoActivo.current = [muestrearPunteroPen(e.nativeEvent, rect, t0Trazo.current)]
    programarRender(performance.now())
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!esMaestro || !pintando.current || pointerIdActivo.current !== e.pointerId) return
    if (rechazarNoPen(e)) return
    e.preventDefault()

    const t0 = performance.now()
    const rect = wrapRef.current!.getBoundingClientRect()
    const eventos = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]
    let cambio = false
    for (const ev of eventos) {
      const p = muestrearPunteroPen(ev, rect, t0Trazo.current)
      const next = agregarPuntoInk(trazoActivo.current, p, 1.0)
      if (next.length !== trazoActivo.current.length) {
        trazoActivo.current = next
        cambio = true
      }
    }
    if (cambio) programarRender(t0)
  }

  async function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!esMaestro || pointerIdActivo.current !== e.pointerId) return
    if (!esEntradaPen(e.pointerType)) return
    e.preventDefault()

    cancelAnimationFrame(rafRender.current)
    pintando.current = false
    penActivo.current = false
    pointerIdActivo.current = null
    setEstadoPen("esperando")

    const pts = [...trazoActivo.current]
    trazoActivo.current = []

    if (pts.length >= 1 && claseId) {
      if (herramienta === "borrador") {
        const antes = trazosRef.current
        const { trazos, eliminados, agregados, acciones } = borrarSegmentosInk(
          antes,
          pts,
          grosorBorrador
        )
        trazosRef.current = trazos
        for (const id of eliminados) {
          motorRef.current?.eliminarCapa(id)
          mallasCache.current.delete(id)
        }
        if (eliminados.length) await eliminarTrazosPizarra(claseId, eliminados)
        for (const s of agregados) {
          await guardarTrazoPizarra(claseId, strokeInkAFirestore(s))
        }
        for (const a of acciones) pilaUndo.current.push(a)
      } else {
        const res = resolverStrokeInk(pts, herramienta, color, grosor, grosorBorrador, paginaActual)
        if (res) {
          const stroke: InkStroke = {
            id: `t-local-${Date.now()}`,
            orden: Date.now(),
            ...res,
          }
          trazosRef.current = [...trazosRef.current, stroke]
          mallasCache.current.clear()
          await guardarTrazoPizarra(claseId, strokeInkAFirestore(res))
          pilaUndo.current.push({ tipo: "addStroke", stroke })
        }
      }
      notificarUndoRedo()
    }

    motorRef.current?.eliminarCapa(ID_ACTIVO)
    programarRender()
  }

  return (
    <div ref={wrapRef} className="pizarra-lienzo relative min-h-0 flex-1 bg-[#faf8f3]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full touch-none"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={onPointerUp}
      />
      {!webglOk && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-red-50/90 p-4 text-center text-sm text-red-800">
          WebGL no disponible en este dispositivo. La pizarra requiere aceleración GPU.
        </div>
      )}
      {esMaestro && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 max-w-[90%] -translate-x-1/2 rounded-full bg-slate-800/75 px-3 py-1 text-center text-[10px] text-white">
          {estadoPen === "activo"
            ? "Apple Pencil · tinta vectorial GPU"
            : "Solo Apple Pencil — dedo y mouse ignorados"}
        </div>
      )}
    </div>
  )
})

export default PizarraInkCanvas
