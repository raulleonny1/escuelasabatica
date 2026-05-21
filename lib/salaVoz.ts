import { normalizarCodigoClase } from "./clase"

/** Servidor Jitsi (opcional: NEXT_PUBLIC_JITSI_DOMAIN=tu-servidor.com) */
export const JITSI_DOMAIN =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_JITSI_DOMAIN?.trim()) ||
  "meet.jit.si"

/** Nombre de sala estable por clase (solo letras y números para Jitsi). */
export function nombreSalaVozJitsi(claseId: string): string {
  const id = normalizarCodigoClase(claseId).replace(/-/g, "")
  const base = `ESabatica${id}`.replace(/[^a-zA-Z0-9]/g, "")
  return base.slice(0, 64) || "ESabaticaGeneral"
}

function hashJitsi(nombre: string, esMaestro: boolean): string {
  const display = encodeURIComponent(nombre.trim().slice(0, 32))
  const partes = [
    "config.prejoinPageEnabled=false",
    "config.startWithVideoMuted=true",
    "config.startWithAudioMuted=false",
    "config.disableDeepLinking=true",
    "config.enableWelcomePage=false",
    "config.enableLobby=false",
    "config.hideLobbyButton=true",
    "config.requireDisplayName=false",
    "interfaceConfig.MOBILE_APP_PROMO=false",
    "interfaceConfig.SHOW_JITSI_WATERMARK=false",
    "interfaceConfig.DISPLAY_WELCOME_PAGE_CONTENT=false",
    "interfaceConfig.SHOW_PROMOTIONAL_CLOSE_PAGE=false",
    "interfaceConfig.TOOLBAR_BUTTONS=[\"microphone\",\"hangup\",\"settings\"]",
    `userInfo.displayName="${display}"`,
  ]
  if (esMaestro) {
    partes.push("config.subject=Escuela Sabatica - Maestro")
  }
  return partes.join("&")
}

/** URL de la sala (iframe o pestaña nueva). */
export function urlSalaVozJitsi(claseId: string, nombre: string, esMaestro = false): string {
  const room = nombreSalaVozJitsi(claseId)
  return `https://${JITSI_DOMAIN}/${room}#${hashJitsi(nombre, esMaestro)}`
}
