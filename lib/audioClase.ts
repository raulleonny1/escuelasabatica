import { prepararSonidoChat } from "@/lib/chatNotificaciones"

/** Activa el contexto de audio tras el primer toque (avisos del chat). */
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
