import { prepararSonidoChat } from "@/lib/chatNotificaciones"

/** Pide micrófono en el mismo clic del login (requerido en iPad/iPhone). */
export async function prepararMicrofonoClase(): Promise<boolean> {
  prepararSonidoChat()
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return false
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    })
    stream.getTracks().forEach((t) => t.stop())
    return true
  } catch {
    return false
  }
}

/** Activa el contexto de audio tras el primer toque en la app */
export function desbloquearSonidosEnInteraccion() {
  if (typeof document === "undefined") return
  const unaVez = () => {
    prepararSonidoChat()
    document.removeEventListener("pointerdown", unaVez)
    document.removeEventListener("keydown", unaVez)
  }
  document.addEventListener("pointerdown", unaVez, { passive: true })
  document.addEventListener("keydown", unaVez, { passive: true })
}
