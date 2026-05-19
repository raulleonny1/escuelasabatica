/** Utilidades PWA: detección de plataforma e instalación */

export type PlataformaPwa = "ios" | "android" | "desktop"

export const PWA_MOSTRAR_EVENT = "pwa-mostrar-instalacion"

/** Clave antigua: ya no se usa para ocultar el banner de forma permanente */
const LEGACY_DISMISS_KEY = "pwa-install-dismissed"

/** iPhone, iPad (incl. iPadOS que reporta "Macintosh") */
export function esAppleDispositivo(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent
  if (/iPhone|iPod|iPad/i.test(ua)) return true
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1
}

export function esAndroid(): boolean {
  if (typeof navigator === "undefined") return false
  return /Android/i.test(navigator.userAgent)
}

export function esTablet(): boolean {
  if (typeof navigator === "undefined") return false
  if (/iPad/i.test(navigator.userAgent)) return true
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true
  if (esAndroid() && !/Mobile/i.test(navigator.userAgent)) return true
  return false
}

export function getPlataformaPwa(): PlataformaPwa {
  if (esAppleDispositivo()) return "ios"
  if (esAndroid()) return "android"
  return "desktop"
}

/** Móvil o tablet donde conviene ofrecer instalación */
export function esDispositivoInstalable(): boolean {
  if (typeof window === "undefined") return false
  if (esAppleDispositivo() || esAndroid()) return true
  return window.matchMedia("(pointer: coarse)").matches
}

export function yaInstaladaPwa(): boolean {
  if (typeof window === "undefined") return false
  if (window.matchMedia("(display-mode: standalone)").matches) return true
  return Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

/** Quita el “no volver a mostrar” de versiones anteriores */
export function limpiarRechazoInstalacionAntiguo(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(LEGACY_DISMISS_KEY)
  } catch {
    // ignorar
  }
}

export function solicitarBannerInstalacion(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(PWA_MOSTRAR_EVENT))
}

export function etiquetaDispositivo(): string {
  if (esTablet()) {
    return esAppleDispositivo() ? "iPad" : "tablet Android"
  }
  if (esAppleDispositivo()) return "iPhone"
  if (esAndroid()) return "Android"
  return "dispositivo"
}

export function modoBannerParaPlataforma(
  tienePromptNativo: boolean
): "nativo" | "ios" | "android-manual" | "desktop-manual" {
  if (tienePromptNativo) return "nativo"
  if (esAppleDispositivo()) return "ios"
  if (esAndroid()) return "android-manual"
  return "desktop-manual"
}
