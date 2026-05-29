"use client"

import { useSalaAudioOptional } from "@/components/SalaAudioContext"

interface SalaAudioPanelProps {
  compacto?: boolean
}

export default function SalaAudioPanel({ compacto = false }: SalaAudioPanelProps) {
  const sala = useSalaAudioOptional()
  if (!sala) return null

  const {
    enSala,
    conectando,
    silenciado,
    participantes,
    error,
    entrarSala,
    salirSala,
    toggleSilencio,
  } = sala

  if (!enSala && !conectando && !error) {
    return (
      <section className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          Sala de audio
        </p>
        <p className="mb-3 text-xs text-slate-500">
          Conecta el micrófono y habla con tu clase sin salir de la app.
        </p>
        <button
          type="button"
          onClick={() => void entrarSala()}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white shadow-md shadow-primary/20 active:opacity-90"
        >
          <span aria-hidden>🎙️</span>
          Unirse al audio
        </button>
      </section>
    )
  }

  const lista = compacto ? participantes.slice(0, 4) : participantes
  const extra = participantes.length - lista.length

  return (
    <section
      className={`rounded-xl border bg-card shadow-sm ${
        enSala ? "border-emerald-300/60 bg-emerald-50/30" : "border-border"
      } ${compacto ? "p-2" : "p-3"}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          {enSala ? "En la sala de audio" : "Conectando…"}
        </p>
        {enSala && (
          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden />
            En vivo
          </span>
        )}
      </div>

      {error && (
        <p className="mb-2 rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-700">{error}</p>
      )}

      <ul className={`space-y-1.5 ${compacto ? "mb-2" : "mb-3"}`}>
        {lista.map((p) => (
          <li
            key={p.peerId}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
              p.speaking
                ? "bg-emerald-100 ring-2 ring-emerald-400/70"
                : "bg-white/80"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                p.speaking ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary"
              }`}
              aria-hidden
            >
              {p.nombre.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{p.nombre}</span>
            {p.muted && (
              <span className="shrink-0 text-[10px] font-semibold uppercase text-slate-400">
                Mudo
              </span>
            )}
            {p.speaking && (
              <span className="shrink-0 text-[10px] font-semibold uppercase text-emerald-700">
                Habla
              </span>
            )}
          </li>
        ))}
        {participantes.length === 0 && conectando && (
          <li className="px-2 py-1 text-xs text-slate-500">Esperando participantes…</li>
        )}
        {extra > 0 && (
          <li className="px-2 text-xs text-slate-500">+{extra} más en la sala</li>
        )}
      </ul>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void toggleSilencio()}
          disabled={!enSala || conectando}
          className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition active:opacity-90 disabled:opacity-50 ${
            silenciado
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : "border-border bg-white text-slate-700"
          }`}
          aria-pressed={silenciado}
        >
          <span aria-hidden>{silenciado ? "🔇" : "🎤"}</span>
          {silenciado ? "Activar mic" : "Silenciar"}
        </button>
        <button
          type="button"
          onClick={() => void salirSala()}
          disabled={conectando}
          className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 text-sm font-medium text-red-700 active:opacity-90 disabled:opacity-50"
        >
          <span aria-hidden>📴</span>
          Salir
        </button>
      </div>
    </section>
  )
}
