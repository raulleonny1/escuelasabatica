"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CHAT_EMOJIS } from "@/lib/chatEmojis"
import {
  anunciarEntradaChat,
  enviarMensajeChat,
  formatHoraChat,
  getChatSessionId,
  getPresenceDocId,
  iniciarPresenciaEnChat,
  pulsoActividadEnChat,
  subscribeChatMessages,
  subscribePresenciaCompleta,
  type ChatMessage,
  type ChatUsuarioEnLinea,
} from "@/lib/chat"
import {
  emitirNoLeidos,
  mensajeEsParaMi,
  notificarMensajeChat,
  prepararSonidoChat,
  reproducirSonidoMensajeDirecto,
  solicitarPermisoNotificaciones,
  actualizarTituloNoLeidos,
  variantesMencion,
} from "@/lib/chatNotificaciones"

interface ChatPanelProps {
  nombre: string
  activo?: boolean
  onCambiarNombre?: () => void
  className?: string
}

export default function ChatPanel({
  nombre,
  activo = false,
  onCambiarNombre,
  className = "",
}: ChatPanelProps) {
  const [mensajes, setMensajes] = useState<ChatMessage[]>([])
  const [conectados, setConectados] = useState<ChatUsuarioEnLinea[]>([])
  const [activosEnChat, setActivosEnChat] = useState<ChatUsuarioEnLinea[]>([])
  const [texto, setTexto] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)
  const [mostrarEmojis, setMostrarEmojis] = useState(false)
  const listaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [sessionId, setSessionId] = useState("")
  const ultimoIdVistoRef = useRef<string | null>(null)
  const historialListoRef = useRef(false)
  const entradaAnunciadaRef = useRef(false)
  const activoRef = useRef(activo)

  useEffect(() => {
    activoRef.current = activo
  }, [activo])

  useEffect(() => {
    setSessionId(getChatSessionId())
  }, [])

  useEffect(() => {
    if (!activo || !sessionId) return
    solicitarPermisoNotificaciones().catch(() => {})
    if (!entradaAnunciadaRef.current) {
      entradaAnunciadaRef.current = true
      anunciarEntradaChat(nombre, sessionId).catch(() => {})
    }
    return iniciarPresenciaEnChat(nombre, sessionId)
  }, [activo, nombre, sessionId])

  const procesarMensajesNuevos = useCallback(
    (data: ChatMessage[]) => {
      const mensajesTexto = data.filter((m) => m.tipo === "message")
      const ultimo = mensajesTexto[mensajesTexto.length - 1]
      if (!ultimo) return

      const miNombre = nombre.trim().toLowerCase()

      if (!historialListoRef.current) {
        historialListoRef.current = true
        ultimoIdVistoRef.current = ultimo.id
        return
      }

      if (activoRef.current) {
        ultimoIdVistoRef.current = ultimo.id
        emitirNoLeidos(0)
        actualizarTituloNoLeidos(0)
        return
      }

      if (ultimo.nombre.trim().toLowerCase() === miNombre) {
        ultimoIdVistoRef.current = ultimo.id
        return
      }

      if (ultimoIdVistoRef.current === ultimo.id) return

      const previo = ultimoIdVistoRef.current
      let noLeidos = 1
      if (previo) {
        const idx = data.findIndex((m) => m.id === previo)
        if (idx >= 0) {
          noLeidos = data
            .slice(idx + 1)
            .filter(
              (m) =>
                m.tipo === "message" && m.nombre.trim().toLowerCase() !== miNombre
            ).length
        }
      }

      emitirNoLeidos(noLeidos)
      actualizarTituloNoLeidos(noLeidos)

      if (mensajeEsParaMi(ultimo.texto, nombre)) {
        reproducirSonidoMensajeDirecto()
        notificarMensajeChat(ultimo.nombre, ultimo.texto, nombre)
      }

      ultimoIdVistoRef.current = ultimo.id
    },
    [nombre]
  )

  useEffect(() => {
    if (!sessionId) return

    setListo(true)

    const unsubMsg = subscribeChatMessages(
      (data) => {
        procesarMensajesNuevos(data)
        setMensajes(data)
        setError(null)
      },
      () => setError("Sin conexión al chat.")
    )

    const unsubPres = subscribePresenciaCompleta((todos, enChat) => {
      setConectados(todos)
      setActivosEnChat(enChat)
    }, () => {})

    return () => {
      unsubMsg()
      unsubPres()
    }
  }, [nombre, sessionId, procesarMensajesNuevos])

  useEffect(() => {
    if (!activo || mensajes.length === 0) return
    const ultimo = mensajes[mensajes.length - 1]
    ultimoIdVistoRef.current = ultimo.id
    emitirNoLeidos(0)
    actualizarTituloNoLeidos(0)
  }, [activo, mensajes])

  useEffect(() => {
    const el = listaRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [mensajes])

  function insertarEmoji(emoji: string) {
    setTexto((prev) => prev + emoji)
    inputRef.current?.focus()
    pulsoActividadEnChat(nombre)
  }

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault()
    const limpio = texto.trim()
    if (!limpio || enviando) return
    setEnviando(true)
    pulsoActividadEnChat(nombre)
    try {
      await enviarMensajeChat(nombre, limpio, sessionId)
      setTexto("")
      setError(null)
    } catch {
      setError("No se pudo enviar el mensaje.")
    } finally {
      setEnviando(false)
    }
  }

  const miPresenceId = getPresenceDocId(nombre)
  const miNombreLower = nombre.trim().toLowerCase()
  const otrosConectados = conectados.filter(
    (u) => u.presenceId !== miPresenceId && u.nombre.trim().toLowerCase() !== miNombreLower
  )
  const otrosEnChat = activosEnChat.filter(
    (u) => u.presenceId !== miPresenceId && u.nombre.trim().toLowerCase() !== miNombreLower
  )

  const nombresParaMencionar = (() => {
    const map = new Map<string, string>()
    for (const u of otrosConectados) map.set(u.nombre.trim().toLowerCase(), u.nombre)
    for (const m of mensajes) {
      if (m.tipo !== "message") continue
      const k = m.nombre.trim().toLowerCase()
      if (k && k !== miNombreLower) map.set(k, m.nombre.trim())
    }
    return [...map.values()].sort((a, b) => a.localeCompare(b, "es"))
  })()

  function insertarMencion(destinatario: string) {
    prepararSonidoChat()
    const primera = destinatario.split(/\s+/)[0] ?? destinatario
    const mencion = `@${primera} `
    setTexto((prev) => {
      const base = prev.trimEnd()
      if (!base) return mencion
      if (base.endsWith("@")) return base + `${primera} `
      return `${base} ${mencion}`
    })
    inputRef.current?.focus()
    pulsoActividadEnChat(nombre)
  }

  return (
    <section
      className={`flex min-h-0 flex-col rounded-xl border border-border bg-card shadow-sm ${className}`}
    >
      <div className="shrink-0 border-b border-border bg-primary/5 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Chat grupal</p>
            <p className="text-sm font-medium text-primary">
              Hola, {nombre}
              {onCambiarNombre && (
                <button
                  type="button"
                  onClick={onCambiarNombre}
                  className="ml-2 text-xs font-normal text-slate-500 underline"
                >
                  cambiar nombre
                </button>
              )}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
            {conectados.length} en línea
          </span>
        </div>
        {otrosConectados.length > 0 ? (
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            Conectados: {otrosConectados.map((u) => u.nombre).join(", ")}
            {otrosEnChat.length > 0 && (
              <span className="text-slate-400">
                {" "}
                · En el chat: {otrosEnChat.map((u) => u.nombre).join(", ")}
              </span>
            )}
          </p>
        ) : (
          <p className="mt-1 text-[11px] text-slate-400">Solo tú conectado por ahora</p>
        )}
        <p className="mt-1 text-[10px] text-slate-400">
          Toca un nombre abajo o escribe @{variantesMencion(nombre)[0] ?? "nombre"} para avisar con sonido
        </p>
      </div>

      <div ref={listaRef} className="custom-scroll min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {!listo && (
          <p className="py-4 text-center text-sm text-muted">Conectando al chat…</p>
        )}
        {listo && mensajes.length === 0 && (
          <p className="py-4 text-center text-sm text-muted">
            Nadie ha escrito aún. ¡Comparte una idea!
          </p>
        )}
        {mensajes.map((m) =>
          m.tipo === "join" ? (
            <p
              key={m.id}
              className="my-2 text-center text-xs text-slate-500 italic"
            >
              {m.texto}
              {m.createdAt && (
                <span className="ml-1 not-italic text-slate-400">{formatHoraChat(m.createdAt)}</span>
              )}
            </p>
          ) : (
            <article
              key={m.id}
              className={`mb-2 max-w-[95%] rounded-lg px-2.5 py-1.5 ${
                m.nombre === nombre
                  ? "ml-auto bg-primary text-white"
                  : "mr-auto bg-surface border border-border"
              }`}
            >
              {m.nombre !== nombre && (
                <p className="text-[10px] font-semibold text-primary mb-0.5">{m.nombre}</p>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.texto}</p>
              {m.createdAt && (
                <p
                  className={`mt-0.5 text-[10px] ${
                    m.nombre === nombre ? "text-blue-100/80" : "text-slate-400"
                  }`}
                >
                  {formatHoraChat(m.createdAt)}
                </p>
              )}
            </article>
          )
        )}
      </div>

      {error && (
        <p className="shrink-0 px-3 py-1 text-xs text-amber-700 bg-amber-50 border-t border-amber-100">
          {error}
        </p>
      )}

      <div className="chat-compose shrink-0 border-t border-border bg-card p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {nombresParaMencionar.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            <span className="w-full text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Avisar a:
            </span>
            {nombresParaMencionar.map((dest) => (
              <button
                key={dest}
                type="button"
                onClick={() => insertarMencion(dest)}
                className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary active:bg-primary/15"
              >
                @{dest.split(/\s+/)[0]}
              </button>
            ))}
          </div>
        )}
        {mostrarEmojis && (
          <div className="mb-2 grid grid-cols-8 gap-1 rounded-lg border border-border bg-surface p-2 sm:grid-cols-12">
            {CHAT_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertarEmoji(emoji)}
                className="flex min-h-9 min-w-9 items-center justify-center rounded-md text-xl active:bg-white"
                aria-label={`Emoji ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={handleEnviar} className="flex w-full min-w-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMostrarEmojis((v) => !v)}
            disabled={!listo}
            className={`min-h-11 w-11 shrink-0 rounded-lg border text-xl active:opacity-90 disabled:opacity-50 ${
              mostrarEmojis
                ? "border-primary bg-primary/10"
                : "border-border bg-white"
            }`}
            aria-label={mostrarEmojis ? "Ocultar emojis" : "Mostrar emojis"}
            aria-expanded={mostrarEmojis}
          >
            😀
          </button>
          <input
            ref={inputRef}
            type="text"
            value={texto}
            onFocus={() => prepararSonidoChat()}
            onChange={(e) => {
              setTexto(e.target.value)
              if (e.target.value.trim()) pulsoActividadEnChat(nombre)
            }}
            placeholder="Mensaje… Toca un nombre arriba para @avisar"
            maxLength={2000}
            disabled={!listo}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-white px-3 py-2 text-base text-slate-800 focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 md:text-sm"
          />
          <button
            type="submit"
            disabled={!listo || enviando || !texto.trim()}
            aria-label="Enviar mensaje"
            className="flex min-h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-medium text-white disabled:opacity-50 active:opacity-90 sm:w-auto sm:px-4"
          >
            <span className="hidden sm:inline">{enviando ? "…" : "Enviar"}</span>
            <span className="text-lg sm:hidden" aria-hidden>
              ➤
            </span>
          </button>
        </form>
      </div>
    </section>
  )
}
