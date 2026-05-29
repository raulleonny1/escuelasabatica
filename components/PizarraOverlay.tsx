"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePizarraOptional } from "@/components/PizarraContext"
import { leerSesion } from "@/lib/sesionUsuario"
import {
  desnormalizarPunto,
  guardarTrazoPizarra,
  normalizarPunto,
  ptsAString,
  ptsDesdeString,
  subscribeTrazosPizarra,
  type HerramientaPizarra,
  type TrazoPizarra,
} from "@/lib/pizarraClase"

const COLORES = ["#1e293b", "#dc2626", "#2563eb", "#16a34a"] as const
const GROSORES = [2, 4, 7] as const

function dibujarTrazo(
  ctx: CanvasRenderingContext2D,
  trazo: TrazoPizarra,
  w: number,
  h: number,
  dpr: number
) {
  const pts = ptsDesdeString(trazo.pts)
  if (pts.length < 2) return

  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.lineWidth = trazo.grosor * (w / 1000)

  if (trazo.herramienta === "borrador") {
    ctx.globalCompositeOperation = "destination-out"
    ctx.strokeStyle = "rgba(0,0,0,1)"
  } else {
    ctx.globalCompositeOperation = "source-over"
    ctx.strokeStyle = trazo.color
  }

  ctx.beginPath()
  const first = desnormalizarPunto(pts[0].x, pts[0].y, w, h)
  ctx.moveTo(first.x, first.y)
  for (let i = 1; i < pts.length; i++) {
    const p = desnormalizarPunto(pts[i].x, pts[i].y, w, h)
    ctx.lineTo(p.x, p.y)
  }
  ctx.stroke()
  ctx.restore()
}

export default function PizarraOverlay({ claseId }: { claseId: string }) {
  const pizarra = usePizarraOptional()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const trazosRef = useRef<TrazoPizarra[]>([])
  const trazoActivo = useRef<{ x: number; y: number }[]>([])
  const pintando = useRef(false)
  const pointerIdActivo = useRef<number | null>(null)
  const ultimoLimpiar = useRef(0)

  const [color, setColor] = useState<string>(COLORES[0])
  const [grosor, setGrosor] = useState<number>(GROSORES[1])
  const [herramienta, setHerramienta] = useState<HerramientaPizarra>("lapiz")

  const esMaestro = pizarra?.esMaestro ?? false
  const abierta = pizarra?.abierta ?? false

  const redibujar = useCallback(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const rect = wrap.getBoundingClientRect()
    const w = rect.width
    const h = rect.height
    if (w <= 0 || h <= 0) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = "#faf8f3"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    for (const trazo of trazosRef.current) {
      dibujarTrazo(ctx, trazo, w, h, dpr)
    }

    if (trazoActivo.current.length >= 2) {
      dibujarTrazo(
        ctx,
        {
          id: "activo",
          pts: ptsAString(trazoActivo.current),
          color,
          grosor,
          herramienta,
          orden: 0,
        },
        w,
        h,
        dpr
      )
    }
  }, [color, grosor, herramienta])

  useEffect(() => {
    if (!abierta) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [abierta])

  useEffect(() => {
    if (!claseId || !abierta) return
    return subscribeTrazosPizarra(claseId, (trazos) => {
      trazosRef.current = trazos
      redibujar()
    })
  }, [claseId, abierta, redibujar])

  useEffect(() => {
    if (pizarra?.estado?.limpiarEn && pizarra.estado.limpiarEn > ultimoLimpiar.current) {
      ultimoLimpiar.current = pizarra.estado.limpiarEn
      trazosRef.current = []
      trazoActivo.current = []
      redibujar()
    }
  }, [pizarra?.estado?.limpiarEn, redibujar])

  useEffect(() => {
    if (!abierta) return
    const wrap = wrapRef.current
    if (!wrap) return

    const ro = new ResizeObserver(() => redibujar())
    ro.observe(wrap)
    redibujar()
    return () => ro.disconnect()
  }, [abierta, redibujar])

  function coordsDesdeEvento(clientX: number, clientY: number) {
    const wrap = wrapRef.current
    if (!wrap) return null
    const rect = wrap.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    return normalizarPunto(x, y, rect.width, rect.height)
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!esMaestro) return
    if (pintando.current && pointerIdActivo.current !== e.pointerId) return

    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    pointerIdActivo.current = e.pointerId
    pintando.current = true

    const p = coordsDesdeEvento(e.clientX, e.clientY)
    if (!p) return
    trazoActivo.current = [p]
    redibujar()
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!esMaestro || !pintando.current || pointerIdActivo.current !== e.pointerId) return
    e.preventDefault()

    const p = coordsDesdeEvento(e.clientX, e.clientY)
    if (!p) return
    trazoActivo.current.push(p)
    redibujar()
  }

  async function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!esMaestro || pointerIdActivo.current !== e.pointerId) return
    e.preventDefault()

    pintando.current = false
    pointerIdActivo.current = null

    const pts = trazoActivo.current
    trazoActivo.current = []

    if (pts.length >= 2 && claseId) {
      const trazo = {
        pts: ptsAString(pts),
        color: herramienta === "borrador" ? "#000000" : color,
        grosor: herramienta === "borrador" ? grosor * 2.5 : grosor,
        herramienta,
      }
      trazosRef.current = [
        ...trazosRef.current,
        { id: `local-${Date.now()}`, orden: Date.now(), ...trazo },
      ]
      redibujar()
      await guardarTrazoPizarra(claseId, trazo)
    } else {
      redibujar()
    }
  }

  if (!pizarra || !abierta) return null

  const sesion = leerSesion()
  const etiquetaMaestro = pizarra.estado?.abiertaPor || "Maestro"

  return (
    <div
      className="fixed inset-0 z-[65] flex flex-col bg-slate-900/55 backdrop-blur-[2px]"
      role="dialog"
      aria-label="Pizarra de la clase"
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-primary px-3 py-2 text-white sm:px-4">
        <p className="mr-auto text-sm font-semibold">
          📝 Pizarra {esMaestro ? "" : `· ${etiquetaMaestro}`}
        </p>

        {esMaestro && (
          <>
            <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1">
              {COLORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setHerramienta("lapiz")
                    setColor(c)
                  }}
                  className={`h-7 w-7 rounded-md border-2 ${
                    herramienta === "lapiz" && color === c
                      ? "border-accent scale-110"
                      : "border-white/30"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1">
              {GROSORES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrosor(g)}
                  className={`flex h-8 w-8 items-center justify-center rounded-md ${
                    grosor === g ? "bg-accent text-primary-dark" : "text-white/90"
                  }`}
                  aria-label={`Grosor ${g}`}
                >
                  <span
                    className="rounded-full bg-current"
                    style={{ width: g + 4, height: g + 4 }}
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setHerramienta("borrador")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                herramienta === "borrador" ? "bg-accent text-primary-dark" : "bg-white/10"
              }`}
            >
              Borrador
            </button>

            <button
              type="button"
              onClick={() => void pizarra.limpiarTablero()}
              className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold"
            >
              Limpiar
            </button>
          </>
        )}

        {esMaestro ? (
          <button
            type="button"
            onClick={() => void pizarra.cerrarPizarra()}
            className="rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-semibold"
          >
            Cerrar para todos
          </button>
        ) : (
          <span className="text-[11px] text-blue-100/90">Solo lectura</span>
        )}
      </div>

      <div ref={wrapRef} className="relative min-h-0 flex-1 touch-none bg-[#faf8f3]">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none"
          style={{ touchAction: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>

      {!esMaestro && sesion?.rol === "alumno" && (
        <p className="shrink-0 bg-primary/95 px-3 py-2 text-center text-[11px] text-blue-100">
          El maestro está usando la pizarra. Lo que escriba aparecerá aquí en tiempo real.
        </p>
      )}
    </div>
  )
}
