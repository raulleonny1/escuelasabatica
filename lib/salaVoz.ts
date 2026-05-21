import { normalizarCodigoClase } from "./clase"

/** Servidor Jitsi (puedes usar tu propio con NEXT_PUBLIC_JITSI_DOMAIN). */
export const JITSI_DOMAIN =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_JITSI_DOMAIN?.trim()) ||
  "meet.jit.si"

/** Nombre de sala estable por clase (solo letras y números para Jitsi). */
export function nombreSalaVozJitsi(claseId: string): string {
  const id = normalizarCodigoClase(claseId).replace(/-/g, "")
  const base = `ESabatica${id}`.replace(/[^a-zA-Z0-9]/g, "")
  return base.slice(0, 64) || "ESabaticaGeneral"
}

export function cargarScriptJitsi(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Solo en el navegador"))
  }
  if (window.JitsiMeetExternalAPI) {
    return Promise.resolve()
  }

  const existente = document.querySelector('script[data-jitsi-api="1"]')
  if (existente) {
    return new Promise((resolve, reject) => {
      existente.addEventListener("load", () => resolve())
      existente.addEventListener("error", () => reject(new Error("No se cargó Jitsi")))
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = `https://${JITSI_DOMAIN}/external_api.js`
    script.async = true
    script.dataset.jitsiApi = "1"
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("No se pudo cargar la sala de voz"))
    document.head.appendChild(script)
  })
}
