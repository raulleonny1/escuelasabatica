export type TrazoLeccionLocal = {
  id: string
  points: [number, number, number][]
  color: string
  size: number
}

const PREFIJO = "leccion-tinta"

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
