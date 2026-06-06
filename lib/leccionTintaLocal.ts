export type TrazoLeccionLocal = {
  id: string
  points: [number, number, number][]
  color: string
  size: number
}

const PREFIJO = "leccion-tinta"
export const RADIO_BORRADOR_LECCION = 20

function clave(semana: number, fecha: string) {
  return `${PREFIJO}-${semana}-${fecha}`
}

export function leerTrazosLeccion(semana: number, fecha: string): TrazoLeccionLocal[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(clave(semana, fecha))
    if (!raw) return []
    const parsed = JSON.parse(raw) as TrazoLeccionLocal[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function guardarTrazosLeccion(
  semana: number,
  fecha: string,
  trazos: TrazoLeccionLocal[]
) {
  if (typeof window === "undefined") return
  const key = clave(semana, fecha)
  if (trazos.length === 0) localStorage.removeItem(key)
  else localStorage.setItem(key, JSON.stringify(trazos))
}

function nuevoId(prefijo: string) {
  return `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/** Divide o elimina trazos que tocan el borrador en (x, y). */
export function borrarTrazosEnPunto(
  trazos: TrazoLeccionLocal[],
  x: number,
  y: number,
  radio = RADIO_BORRADOR_LECCION
): { trazos: TrazoLeccionLocal[]; huboCambio: boolean } {
  const out: TrazoLeccionLocal[] = []
  let huboCambio = false

  for (const trazo of trazos) {
    const umbral = radio + trazo.size * 0.45
    const segmentos: [number, number, number][][] = []
    let run: [number, number, number][] = []

    for (const p of trazo.points) {
      const cerca = Math.hypot(p[0] - x, p[1] - y) < umbral
      if (cerca) {
        huboCambio = true
        if (run.length >= 2) segmentos.push(run)
        run = []
      } else {
        run.push(p)
      }
    }
    if (run.length >= 2) segmentos.push(run)
    else if (run.length === 1 && trazo.points.length === 1) {
      huboCambio = true
    }

    const intacto =
      segmentos.length === 1 &&
      segmentos[0].length === trazo.points.length

    if (intacto) {
      out.push(trazo)
      continue
    }

    if (segmentos.length === 0) continue

    segmentos.forEach((pts, i) => {
      out.push({
        ...trazo,
        id: intacto ? trazo.id : nuevoId(`${trazo.id}-${i}`),
        points: pts,
      })
    })
  }

  return { trazos: out, huboCambio }
}

/** Rellena puntos intermedios para trazos más suaves. */
export function interpolarPuntos(
  desde: [number, number, number],
  hasta: [number, number, number],
  paso = 1.25
): [number, number, number][] {
  const dx = hasta[0] - desde[0]
  const dy = hasta[1] - desde[1]
  const dist = Math.hypot(dx, dy)
  if (dist <= paso) return [hasta]
  const n = Math.ceil(dist / paso)
  const pts: [number, number, number][] = []
  for (let i = 1; i <= n; i++) {
    const t = i / n
    pts.push([
      desde[0] + dx * t,
      desde[1] + dy * t,
      desde[2] + (hasta[2] - desde[2]) * t,
    ])
  }
  return pts
}

export function grosorDesdePresion(presion: number, base = 4.5): number {
  const p = presion > 0 && presion <= 1 ? presion : 0.5
  return base * (0.55 + p * 0.85)
}
