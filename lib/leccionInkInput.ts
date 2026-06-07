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

function interpolarEntre(
  desde: PuntoInk,
  hasta: PuntoInk,
  paso: number
): PuntoInk[] {
  const dx = hasta[0] - desde[0]
  const dy = hasta[1] - desde[1]
  const dist = Math.hypot(dx, dy)
  if (dist <= paso) return []
  const n = Math.ceil(dist / paso) - 1
  const pts: PuntoInk[] = []
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1)
    pts.push([
      desde[0] + dx * t,
      desde[1] + dy * t,
      desde[2] + (hasta[2] - desde[2]) * t,
    ])
  }
  return pts
}

/** Añade puntos coalescidos rellenando huecos (trazo continuo). */
export function agregarPuntosInk(
  actual: PuntoInk[],
  nuevos: PuntoInk[],
  minDist = 0.35
): PuntoInk[] {
  if (nuevos.length === 0) return actual
  let out = [...actual]
  for (const p of nuevos) {
    const ultimo = out[out.length - 1]
    if (!ultimo) {
      out.push(p)
      continue
    }
    const dist = Math.hypot(p[0] - ultimo[0], p[1] - ultimo[1])
    if (dist < minDist) continue
    if (dist > minDist * 2.5) {
      out = out.concat(interpolarEntre(ultimo, p, minDist * 1.2))
    }
    out.push(p)
  }
  return out
}

/** Procesa cada evento coalescido por separado (máxima fidelidad). */
export function agregarEventosPointer(
  actual: PuntoInk[],
  e: PointerEvent,
  rect: DOMRect,
  minDist = 0.35
): PuntoInk[] {
  const eventos =
    typeof e.getCoalescedEvents === "function" && e.getCoalescedEvents().length > 0
      ? e.getCoalescedEvents()
      : [e]
  let out = actual
  for (const ev of eventos) {
    out = agregarPuntosInk(out, [puntoDesdePointer(ev, rect)], minDist)
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
  return (
    canvas.getContext("2d", {
      alpha: true,
      desynchronized: true,
      willReadFrequently: false,
    }) ?? canvas.getContext("2d")
  )
}
