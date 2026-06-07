/** Entrada de tinta de alta frecuencia (estilo Google Keep / Pointer Events). */

export type PuntoInk = [number, number, number]

export function presionDesdePointer(e: PointerEvent): number {
  if (e.pointerType === "pen") {
    return e.pressure > 0 && e.pressure <= 1 ? e.pressure : 0.45
  }
  if (e.pointerType === "mouse") {
    return e.buttons === 1 ? 0.5 : 0.35
  }
  if (e.width > 0 && e.width < 8) return 0.5
  return 0.42
}

export function puntoDesdePointer(e: PointerEvent, rect: DOMRect): PuntoInk {
  return [e.clientX - rect.left, e.clientY - rect.top, presionDesdePointer(e)]
}

/** Todos los muestreos del lápiz (240 Hz) dentro de un pointermove. */
export function puntosCoalescidos(e: PointerEvent, rect: DOMRect): PuntoInk[] {
  const crudos =
    typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : []
  const eventos = crudos.length > 0 ? crudos : [e]
  return eventos.map((ev) => puntoDesdePointer(ev, rect))
}

/** Puntos predichos por el SO — solo vista previa en vivo, no se guardan. */
export function puntosPredichos(e: PointerEvent, rect: DOMRect): PuntoInk[] {
  if (typeof e.getPredictedEvents !== "function") return []
  return e.getPredictedEvents().map((ev) => puntoDesdePointer(ev, rect))
}

/** Añade puntos sin interpolación pesada (el canvas ya rellena huecos al dibujar). */
export function agregarPuntosInk(
  actual: PuntoInk[],
  nuevos: PuntoInk[],
  minDist = 0.9
): PuntoInk[] {
  if (nuevos.length === 0) return actual
  const out = [...actual]
  for (const p of nuevos) {
    const ultimo = out[out.length - 1]
    if (ultimo && Math.hypot(p[0] - ultimo[0], p[1] - ultimo[1]) < minDist) continue
    out.push(p)
  }
  return out
}

export function trazoUsaPresionReal(points: PuntoInk[]): boolean {
  return points.some((p) => p[2] > 0.05 && p[2] < 0.98 && p[2] !== 0.5)
}

export function esPencilPointer(
  e: Pick<PointerEvent, "pointerType" | "width" | "height">
): boolean {
  if (e.pointerType === "pen") return true
  if (e.pointerType === "touch") {
    const ancho = e.width > 0 ? e.width : 24
    const alto = e.height > 0 ? e.height : 24
    return ancho < 8 && alto < 8
  }
  return false
}

export function esEntradaDibujo(e: PointerEvent): boolean {
  if (e.pointerType === "pen") return true
  if (e.pointerType === "mouse") return e.buttons === 1
  if (e.pointerType === "touch") return true
  return false
}

export function crearContextoTinta(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const tactil =
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
  return (
    canvas.getContext("2d", {
      alpha: true,
      desynchronized: !tactil,
      willReadFrequently: false,
    }) ?? canvas.getContext("2d")
  )
}

/** Evita canvas gigantes que en móvil Safari se ven negros. */
export function calcularDimensionesCanvas(
  w: number,
  h: number,
  dprIn = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 3) : 1
) {
  const MAX_PX = 4096
  let pixelW = w * dprIn
  let pixelH = h * dprIn
  let scale = 1
  if (pixelW > MAX_PX || pixelH > MAX_PX) {
    scale = Math.min(MAX_PX / pixelW, MAX_PX / pixelH, 1)
  }
  return {
    w,
    h,
    dpr: dprIn,
    pixelW: Math.max(1, Math.floor(pixelW * scale)),
    pixelH: Math.max(1, Math.floor(pixelH * scale)),
    renderScale: dprIn * scale,
  }
}
