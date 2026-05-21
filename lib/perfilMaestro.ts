import { safeLocalGet, safeLocalRemove, safeLocalSet } from "./storage"

const PERFIL_KEY = "perfilMaestro"

export type PerfilMaestro = {
  nombre: string
  claseId: string
  claseNombre: string
}

export function leerPerfilMaestro(): PerfilMaestro | null {
  const raw = safeLocalGet(PERFIL_KEY)
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as PerfilMaestro
    if (!p.nombre?.trim() || !p.claseId?.trim()) return null
    return {
      nombre: p.nombre.trim().slice(0, 32),
      claseId: p.claseId.trim(),
      claseNombre: (p.claseNombre ?? "").trim().slice(0, 48),
    }
  } catch {
    return null
  }
}

export function guardarPerfilMaestro(perfil: PerfilMaestro) {
  safeLocalSet(
    PERFIL_KEY,
    JSON.stringify({
      nombre: perfil.nombre.trim().slice(0, 32),
      claseId: perfil.claseId.trim(),
      claseNombre: perfil.claseNombre.trim().slice(0, 48),
    })
  )
}

export function borrarPerfilMaestro() {
  safeLocalRemove(PERFIL_KEY)
}
