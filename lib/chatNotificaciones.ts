/** Avisos cuando llegan mensajes nuevos al chat */

export const CHAT_ABRIR_EVENT = "chat-abrir"
export const CHAT_NO_LEIDOS_EVENT = "chat-no-leidos"

/** Nombres con los que se puede mencionar (@Raul, @Matias, nombre completo…) */
export function variantesMencion(nombreUsuario: string): string[] {
  const nombre = nombreUsuario.trim()
  if (!nombre) return []
  const partes = nombre.split(/\s+/).filter(Boolean)
  const set = new Set([nombre, ...partes])
  return [...set]
}

/** Mensaje dirigido a alguien con @nombre o @primerNombre */
export function mensajeDirigidoAUsuario(texto: string, nombreUsuario: string): boolean {
  const variantes = variantesMencion(nombreUsuario)
  if (variantes.length === 0) return false

  return variantes.some((variante) => {
    const esc = variante.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const sinAcentos = variante
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
    const escSin = sinAcentos.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const patrones = [esc, escSin].filter((p, i, a) => a.indexOf(p) === i)
    return patrones.some((p) => new RegExp(`@${p}(?:\\s|$|[.,!?;:])`, "iu").test(texto))
  })
}

export function mensajeEsParaMi(texto: string, miNombre: string): boolean {
  return mensajeDirigidoAUsuario(texto, miNombre)
}

let audioCtx: AudioContext | null = null
let ultimoSonidoMs = 0
let ultimoSonidoUnionMs = 0
let ultimoSonidoEntradaMs = 0
let audioListo = false

/** El navegador exige un clic antes de reproducir sonido */
export function prepararSonidoChat() {
  if (typeof window === "undefined" || audioListo) return
  try {
    const Ctx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    audioCtx = audioCtx ?? new Ctx()
    if (audioCtx.state === "suspended") void audioCtx.resume()
    audioListo = true
  } catch {
    // ignorar
  }
}

function beep(freq: number, start: number, dur: number, vol = 0.12) {
  if (!audioCtx) return
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.frequency.value = freq
  osc.type = "sine"
  gain.gain.setValueAtTime(vol, start)
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur)
  osc.start(start)
  osc.stop(start + dur)
}

export function reproducirSonidoMensajeDirecto() {
  if (typeof window === "undefined") return
  const ahora = Date.now()
  if (ahora - ultimoSonidoMs < 400) return
  ultimoSonidoMs = ahora

  prepararSonidoChat()
  if (!audioCtx) return

  try {
    if (audioCtx.state === "suspended") void audioCtx.resume()
    beep(880, audioCtx.currentTime, 0.22)
  } catch {
    // ignorar
  }
}

/** Dos tonos suaves: alguien pidió unirse a la clase (maestro) */
/** Maestro: alguien entró a la clase (presencia en la app) */
export function reproducirSonidoEntradaAlumno() {
  if (typeof window === "undefined") return
  const ahora = Date.now()
  if (ahora - ultimoSonidoEntradaMs < 1200) return
  ultimoSonidoEntradaMs = ahora

  prepararSonidoChat()
  if (!audioCtx) return

  try {
    if (audioCtx.state === "suspended") void audioCtx.resume()
    const t = audioCtx.currentTime
    beep(392, t, 0.12, 0.11)
    beep(523, t + 0.14, 0.14, 0.11)
    beep(659, t + 0.3, 0.2, 0.1)
  } catch {
    // ignorar
  }
}

export function notificarEntradaAlumno(nombreAlumno: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return
  if (Notification.permission !== "granted") return
  if (!nombreAlumno.trim()) return

  try {
    const n = new Notification("Alguien se unió a la clase", {
      body: `${nombreAlumno.trim()} entró. Ya está en la sala de voz de la clase.`,
      icon: "/logoes.png",
      tag: "entrada-clase-es",
    })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    // ignorar
  }
}

export function reproducirSonidoSolicitudUnion() {
  if (typeof window === "undefined") return
  const ahora = Date.now()
  if (ahora - ultimoSonidoUnionMs < 800) return
  ultimoSonidoUnionMs = ahora

  prepararSonidoChat()
  if (!audioCtx) return

  try {
    if (audioCtx.state === "suspended") void audioCtx.resume()
    const t = audioCtx.currentTime
    beep(523, t, 0.14, 0.1)
    beep(659, t + 0.16, 0.18, 0.1)
  } catch {
    // ignorar
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

export function notificarSolicitudUnion(nombreSolicitante: string, nombreClase: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return
  if (Notification.permission !== "granted") return
  if (!nombreSolicitante.trim()) return

  const clase = nombreClase.trim() || "tu clase"
  try {
    const n = new Notification("Alguien quiere unirse", {
      body: `${nombreSolicitante.trim()} pidió entrar a «${clase}». Revisa tu panel de maestro.`,
      icon: "/logoes.png",
      tag: "solicitud-union-es",
    })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    // ignorar
  }
}

export function notificarMensajeChat(de: string, texto: string, paraNombre: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return
  if (Notification.permission !== "granted") return
  if (!mensajeEsParaMi(texto, paraNombre)) return

  const cuerpo = texto.length > 120 ? `${texto.slice(0, 117)}…` : texto

  try {
    const n = new Notification(`💬 ${de} te escribió`, {
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
    // ignorar
  }
}

export function actualizarTituloNoLeidos(cantidad: number) {
  if (typeof document === "undefined") return
  const base = "Escuela Sabática"
  document.title = cantidad > 0 ? `(${cantidad}) ${base}` : base
}
