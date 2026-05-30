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
  resolverTrazoConGesto,
  subscribeTrazosPizarra,
  type HerramientaPizarra,
  type TipoTrazo,
  type TrazoPizarra,
} from "@/lib/pizarraClase"

const COLORES = ["#1e293b", "#dc2626", "#2563eb", "#16a34a"] as const
const GROSORES = [2, 4, 7] as const
const GROSORES_BORRADOR = [8, 16, 28, 44] as const
const ETIQUETAS_BORRADOR = ["S", "M", "L", "XL"] as const

function escalaGrosor(grosor: number, w: number) {
  return grosor * (w / 1000)
}

function dibujarPunto(
  ctx: CanvasRenderingContext2D,
  trazo: Pick<TrazoPizarra, "pts" | "color" | "grosor" | "herramienta">,
  w: number,
  h: number,
  dpr: number
) {
  const pts = ptsDesdeString(trazo.pts)
  if (pts.length < 1) return

  const p = desnormalizarPunto(pts[0].x, pts[0].y, w, h)
  const base = escalaGrosor(trazo.grosor, w)
  const radio =
    trazo.herramienta === "borrador"
      ? Math.max(base * 0.55, 4)
      : Math.max(base * 0.9, 2)

  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.beginPath()
  ctx.arc(p.x, p.y, radio, 0, Math.PI * 2)

  if (trazo.herramienta === "borrador") {
    ctx.globalCompositeOperation = "destination-out"
    ctx.fillStyle = "rgba(0,0,0,1)"
  } else {
    ctx.globalCompositeOperation = "source-over"
    ctx.fillStyle = trazo.color
  }
  ctx.fill()
  ctx.restore()
}

function dibujarTrazoLibre(
  ctx: CanvasRenderingContext2D,
  trazo: Pick<TrazoPizarra, "pts" | "color" | "grosor" | "herramienta">,
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
  ctx.lineWidth = escalaGrosor(trazo.grosor, w)

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

function dibujarSubrayado(
  ctx: CanvasRenderingContext2D,
  trazo: Pick<TrazoPizarra, "pts" | "color" | "grosor">,
  w: number,
  h: number,
  dpr: number
) {
  const pts = ptsDesdeString(trazo.pts)
  if (pts.length < 2) return

  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.globalCompositeOperation = "source-over"
  ctx.strokeStyle = trazo.color
  ctx.lineCap = "round"
  ctx.lineWidth = escalaGrosor(trazo.grosor, w) * 1.8

  const a = desnormalizarPunto(pts[0].x, pts[0].y, w, h)
  const b = desnormalizarPunto(pts[1].x, pts[1].y, w, h)
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.stroke()
  ctx.restore()
}

function dibujarCirculo(
  ctx: CanvasRenderingContext2D,
  trazo: Pick<TrazoPizarra, "pts" | "color" | "grosor">,
  w: number,
  h: number,
  dpr: number
) {
  const pts = ptsDesdeString(trazo.pts)
  if (pts.length < 2) return

  const a = desnormalizarPunto(pts[0].x, pts[0].y, w, h)
  const b = desnormalizarPunto(pts[1].x, pts[1].y, w, h)
  const cx = (a.x + b.x) / 2
  const cy = (a.y + b.y) / 2
  const rx = Math.abs(b.x - a.x) / 2
  const ry = Math.abs(b.y - a.y) / 2
  if (rx < 2 || ry < 2) return

  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.globalCompositeOperation = "source-over"
  ctx.strokeStyle = trazo.color
  ctx.lineWidth = escalaGrosor(trazo.grosor, w)
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function dibujarRectangulo(
  ctx: CanvasRenderingContext2D,
  trazo: Pick<TrazoPizarra, "pts" | "color" | "grosor">,
  w: number,
  h: number,
  dpr: number
) {
  const pts = ptsDesdeString(trazo.pts)
  if (pts.length < 2) return

  const a = desnormalizarPunto(pts[0].x, pts[0].y, w, h)
  const b = desnormalizarPunto(pts[1].x, pts[1].y, w, h)
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  const rw = Math.abs(b.x - a.x)
  const rh = Math.abs(b.y - a.y)
  if (rw < 2 || rh < 2) return

  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.globalCompositeOperation = "source-over"
  ctx.strokeStyle = trazo.color
  ctx.lineWidth = escalaGrosor(trazo.grosor, w)
  ctx.strokeRect(x, y, rw, rh)
  ctx.restore()
}

function dibujarTrazo(
  ctx: CanvasRenderingContext2D,
  trazo: TrazoPizarra,
  w: number,
  h: number,
  dpr: number
) {
  if (trazo.tipo === "punto") {
    dibujarPunto(ctx, trazo, w, h, dpr)
    return
  }
  if (trazo.herramienta === "borrador" || trazo.tipo === "trazo") {
    dibujarTrazoLibre(ctx, trazo, w, h, dpr)
    return
  }
  if (trazo.tipo === "subrayado") {
    dibujarSubrayado(ctx, trazo, w, h, dpr)
    return
  }
  if (trazo.tipo === "rectangulo") {
    dibujarRectangulo(ctx, trazo, w, h, dpr)
    return
  }
  if (trazo.tipo === "circulo") {
    dibujarCirculo(ctx, trazo, w, h, dpr)
  }
}

function trazoPreviewDesdeGestos(
  pts: { x: number; y: number }[],
  herramienta: HerramientaPizarra,
  color: string,
  grosor: number
): Pick<TrazoPizarra, "pts" | "color" | "grosor" | "herramienta" | "tipo"> | null {
  if (pts.length < 1) return null
  const res = resolverTrazoConGesto(pts, herramienta)
  return {
    pts: res.pts,
    color,
    grosor,
    herramienta: herramienta === "borrador" ? "borrador" : "lapiz",
    tipo: res.tipo,
  }
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
  const paginaRef = useRef(0)

  const [color, setColor] = useState<string>(COLORES[0])
  const [grosor, setGrosor] = useState<number>(GROSORES[1])
  const [grosorBorrador, setGrosorBorrador] = useState<number>(GROSORES_BORRADOR[1])
  const [herramienta, setHerramienta] = useState<HerramientaPizarra>("lapiz")

  const grosorActivo = herramienta === "borrador" ? grosorBorrador : grosor

  const esMaestro = pizarra?.esMaestro ?? false
  const abierta = pizarra?.abierta ?? false
  const paginaActual = pizarra?.paginaActual ?? 0
  const totalPaginas = pizarra?.totalPaginas ?? 1

  paginaRef.current = paginaActual

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

    if (trazoActivo.current.length >= 1) {
      const preview = trazoPreviewDesdeGestos(
        trazoActivo.current,
        herramienta,
        color,
        grosorActivo
      )
      if (preview) {
        dibujarTrazo(
          ctx,
          {
            id: "activo",
            orden: 0,
            pagina: paginaRef.current,
            ...preview,
          },
          w,
          h,
          dpr
        )
      }
    }
  }, [color, grosor, grosorBorrador, herramienta])

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
    trazosRef.current = []
    trazoActivo.current = []
    return subscribeTrazosPizarra(claseId, paginaActual, (trazos) => {
      trazosRef.current = trazos
      redibujar()
    })
  }, [claseId, abierta, paginaActual, redibujar])

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

    if (pts.length >= 1 && claseId) {
      const herramientaGuardar = herramienta
      const res = resolverTrazoConGesto(pts, herramientaGuardar)
      if (res.tipo !== "punto" && pts.length < 2) {
        redibujar()
        return
      }
      const trazo = {
        pts: res.pts,
        color: herramientaGuardar === "borrador" ? "#000000" : color,
        grosor: herramientaGuardar === "borrador" ? grosorBorrador : grosor,
        herramienta: herramientaGuardar === "borrador" ? ("borrador" as const) : ("lapiz" as const),
        tipo: res.tipo,
        pagina: paginaActual,
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

        <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1">
          <button
            type="button"
            onClick={() => void pizarra.paginaAnterior()}
            disabled={!esMaestro || paginaActual <= 0}
            className="rounded-md px-2 py-1 text-xs font-semibold disabled:opacity-40"
            aria-label="Página anterior"
          >
            ←
          </button>
          <span className="min-w-[4.5rem] text-center text-[11px] font-medium tabular-nums">
            {paginaActual + 1} / {totalPaginas}
          </span>
          <button
            type="button"
            onClick={() => void pizarra.paginaSiguiente()}
            disabled={!esMaestro || paginaActual >= totalPaginas - 1}
            className="rounded-md px-2 py-1 text-xs font-semibold disabled:opacity-40"
            aria-label="Página siguiente"
          >
            →
          </button>
          {esMaestro && (
            <button
              type="button"
              onClick={() => void pizarra.crearPagina()}
              className="rounded-md bg-accent px-2 py-1 text-[11px] font-semibold text-primary-dark"
              title="Nueva pantalla"
            >
              + Nueva
            </button>
          )}
        </div>

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
                    herramienta !== "borrador" &&
                    herramienta !== "subrayar" &&
                    herramienta !== "encerrar" &&
                    color === c
                      ? "border-accent scale-110"
                      : "border-white/30"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1">
              {herramienta === "borrador" ? (
                <>
                  <span className="hidden px-1 text-[10px] font-medium text-white/75 sm:inline">
                    Borrador
                  </span>
                  {GROSORES_BORRADOR.map((g, i) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrosorBorrador(g)}
                      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 ${
                        grosorBorrador === g ? "bg-accent text-primary-dark" : "text-white/90"
                      }`}
                      aria-label={`Tamaño borrador ${ETIQUETAS_BORRADOR[i]}`}
                      title={`Tamaño ${ETIQUETAS_BORRADOR[i]}`}
                    >
                      <span
                        className="rounded-full bg-current"
                        style={{
                          width: Math.min(10 + i * 5, 22),
                          height: Math.min(10 + i * 5, 22),
                        }}
                      />
                    </button>
                  ))}
                </>
              ) : (
                GROSORES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrosor(g)}
                    className={`flex h-8 w-8 items-center justify-center rounded-md ${
                      grosor === g ? "bg-accent text-primary-dark" : "text-white/90"
                    }`}
                    aria-label={`Grosor lápiz ${g}`}
                  >
                    <span
                      className="rounded-full bg-current"
                      style={{ width: g + 4, height: g + 4 }}
                    />
                  </button>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setHerramienta("lapiz")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                herramienta === "lapiz" ? "bg-accent text-primary-dark" : "bg-white/10"
              }`}
            >
              Lápiz
            </button>

            <button
              type="button"
              onClick={() => setHerramienta("subrayar")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                herramienta === "subrayar" ? "bg-accent text-primary-dark" : "bg-white/10"
              }`}
              title="Dibuja una línea horizontal bajo el texto"
            >
              Subrayar
            </button>

            <button
              type="button"
              onClick={() => setHerramienta("encerrar")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                herramienta === "encerrar" ? "bg-accent text-primary-dark" : "bg-white/10"
              }`}
              title="Dibuja alrededor: círculo u óvalo si es redondo, rectángulo si es cuadrado"
            >
              Encerrar
            </button>

            <button
              type="button"
              onClick={() => setHerramienta("borrador")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                herramienta === "borrador" ? "bg-accent text-primary-dark" : "bg-white/10"
              }`}
              title="Elige el tamaño con los círculos: S, M, L, XL"
            >
              Borrador
            </button>

            <button
              type="button"
              onClick={() => void pizarra.limpiarTablero()}
              className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold"
              title="Borra solo la pantalla actual"
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
        {!esMaestro && totalPaginas > 1 && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-800/75 px-3 py-1 text-[11px] text-white">
            Pantalla {paginaActual + 1} de {totalPaginas}
          </div>
        )}
      </div>

      {esMaestro && herramienta === "borrador" && (
        <p className="shrink-0 bg-primary/90 px-3 py-1.5 text-center text-[10px] text-blue-100/90">
          Borrador: elige tamaño S · M · L · XL en la barra de arriba
        </p>
      )}

      {esMaestro && herramienta === "lapiz" && (
        <p className="shrink-0 bg-primary/90 px-3 py-1.5 text-center text-[10px] text-blue-100/90">
          Lápiz: dibuja libremente. Usa Subrayar o Encerrar si quieres formas.
        </p>
      )}

      {!esMaestro && sesion?.rol === "alumno" && (
        <p className="shrink-0 bg-primary/95 px-3 py-2 text-center text-[11px] text-blue-100">
          El maestro está usando la pizarra. Lo que escriba aparecerá aquí en tiempo real.
        </p>
      )}
    </div>
  )
}
