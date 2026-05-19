/** Avisos cuando llegan mensajes nuevos al chat */

export const CHAT_ABRIR_EVENT = "chat-abrir"
export const CHAT_NO_LEIDOS_EVENT = "chat-no-leidos"

/** Mensaje dirigido a alguien: @nombre (p. ej. @Raul) */
export function mensajeDirigidoAUsuario(texto: string, nombreUsuario: string): boolean {
  const nombre = nombreUsuario.trim()
  if (!nombre) return false

  const esc = nombre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const sinAcentos = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
  const escSin = sinAcentos.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

  const patrones = [esc, escSin].filter((p, i, a) => a.indexOf(p) === i)
  return patrones.some((p) => new RegExp(`@${p}(?=\\s|$|[.,!?;:])`, "iu").test(texto))
}

/**
 * ¿Te escriben a ti? @tuNombre, o chat de dos (solo otra persona en el chat ahora).
 */
export function mensajeEsParaMi(
  texto: string,
  miNombre: string,
  otrosActivosEnChat: number
): boolean {
  if (mensajeDirigidoAUsuario(texto, miNombre)) return true
  return otrosActivosEnChat === 1
}

let audioCtx: AudioContext | null = null
let ultimoSonidoMs = 0

/** Sonido corto solo para mensajes dirigidos a ti (no en cada mensaje del grupo). */
export function reproducirSonidoMensajeDirecto() {
  if (typeof window === "undefined") return
  const ahora = Date.now()
  if (ahora - ultimoSonidoMs < 400) return
  ultimoSonidoMs = ahora

  try {
    const Ctx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    audioCtx = audioCtx ?? new Ctx()
    if (audioCtx.state === "suspended") void audioCtx.resume()

    const t = audioCtx.currentTime
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.frequency.value = 740
    osc.type = "sine"
    gain.gain.setValueAtTime(0.07, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
    osc.start(t)
    osc.stop(t + 0.18)
  } catch {
    // navegador sin audio o sin gesto previo
  }
}

export function emitirNoLeidos(cantidad: number) {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent(CHAT_NO_LEIDOS_EVENT, { detail: { cantidad } })
  )
}

export function solicitarAbrirChat() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(CHAT_ABRIR_EVENT))
}

export async function solicitarPermisoNotificaciones(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false
  if (Notification.permission === "granted") return true
  if (Notification.permission === "denied") return false
  const perm = await Notification.requestPermission()
  return perm === "granted"
}

/** Notificación del sistema solo si el mensaje es para ti. */
export function notificarMensajeChat(
  de: string,
  texto: string,
  paraNombre: string,
  otrosActivosEnChat: number
) {
  if (typeof window === "undefined" || !("Notification" in window)) return
  if (Notification.permission !== "granted") return
  if (!mensajeEsParaMi(texto, paraNombre, otrosActivosEnChat)) return

  const cuerpo = texto.length > 120 ? `${texto.slice(0, 117)}…` : texto

  try {
    const n = new Notification(`💬 ${de} en Escuela Sabática`, {
      body: cuerpo,
      icon: "/logoes.png",
      tag: "chat-escuela-sabatica",
    })
    n.onclick = () => {
      window.focus()
      solicitarAbrirChat()
      n.close()
    }
  } catch {
    // ignorar si el navegador bloquea la notificación
  }
}

export function actualizarTituloNoLeidos(cantidad: number) {
  if (typeof document === "undefined") return
  const base = "Escuela Sabática"
  document.title = cantidad > 0 ? `(${cantidad}) ${base}` : base
}
