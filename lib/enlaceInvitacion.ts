import { getDoc } from "firebase/firestore"
import { claseRef, normalizarCodigoClase } from "./clase"

/** Parámetro de URL: ?unirse=codigo-de-la-clase */
export const PARAM_UNIRSE = "unirse"

export function construirEnlaceInvitacion(claseId: string, origen?: string): string {
  const base =
    origen?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "")
  const codigo = normalizarCodigoClase(claseId)
  if (!base) return `/?${PARAM_UNIRSE}=${codigo}`
  return `${base}/?${PARAM_UNIRSE}=${encodeURIComponent(codigo)}`
}

export function leerCodigoInvitacionDesdeUrl(
  search?: string
): string | null {
  if (typeof window === "undefined" && !search) return null
  const q = search ?? window.location.search
  const params = new URLSearchParams(q)
  const raw =
    params.get(PARAM_UNIRSE) ||
    params.get("codigo") ||
    params.get("invite")
  if (!raw?.trim()) return null
  const codigo = normalizarCodigoClase(raw)
  if (codigo === "independiente") return null
  return codigo
}

export function limpiarParametrosInvitacionEnUrl() {
  if (typeof window === "undefined") return
  const url = new URL(window.location.href)
  let cambio = false
  for (const key of [PARAM_UNIRSE, "codigo", "invite"]) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      cambio = true
    }
  }
  if (cambio) {
    const resto = url.searchParams.toString()
    const destino = url.pathname + (resto ? `?${resto}` : "")
    window.history.replaceState({}, "", destino)
  }
}

/** Comprueba que la sala exista y devuelve nombre visible para la pantalla de invitación. */
export async function resolverClaseInvitacion(
  codigo: string
): Promise<{ id: string; nombre: string } | null> {
  const id = normalizarCodigoClase(codigo)
  if (!id) return null
  const snap = await getDoc(claseRef(id))
  if (!snap.exists()) return null
  const nombre = ((snap.data().nombre as string) ?? "").trim() || id.replace(/-/g, " ")
  return { id, nombre }
}

export function mensajeCompartirInvitacion(
  nombreClase: string,
  codigoLegible: string,
  enlace: string
): string {
  const titulo = nombreClase.trim() || "Escuela Sabática"
  return (
    `Te invito a nuestra clase de Escuela Sabática: ${titulo}.\n` +
    `Entra con un clic aquí: ${enlace}\n` +
    `(Código por si lo necesitas: ${codigoLegible})`
  )
}
