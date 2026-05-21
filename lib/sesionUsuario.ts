import { safeLocalGet, safeLocalRemove, safeLocalSet } from "./storage"

const SESION_KEY = "sesionUsuario"

export type RolUsuario = "maestro" | "alumno" | "independiente"

export type SesionUsuario = {
  rol: RolUsuario
  nombre: string
  claseId: string
  claseNombre: string
}

export function leerSesion(): SesionUsuario | null {
  const raw = safeLocalGet(SESION_KEY)
  if (!raw) return null
  try {
    const s = JSON.parse(raw) as SesionUsuario
    if (!s.rol || !s.nombre?.trim() || !s.claseId) return null
    return {
      rol: s.rol,
      nombre: s.nombre.trim().slice(0, 32),
      claseId: s.claseId,
      claseNombre: (s.claseNombre ?? "").trim().slice(0, 48),
    }
  } catch {
    return null
  }
}

export function guardarSesion(sesion: SesionUsuario) {
  safeLocalSet(SESION_KEY, JSON.stringify(sesion))
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("sesion-actualizada"))
  }
}

export function cerrarSesion() {
  safeLocalRemove(SESION_KEY)
  safeLocalRemove("claseId")
  safeLocalRemove("claseNombre")
  safeLocalRemove("chatNombre")
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("sesion-actualizada"))
  }
}

export function esMaestro(sesion?: SesionUsuario | null): boolean {
  return (sesion ?? leerSesion())?.rol === "maestro"
}
