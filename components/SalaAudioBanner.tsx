"use client"

import { useSalaAudioOptional } from "@/components/SalaAudioContext"

/** Banner de audio en la cabecera (visible para maestro y alumnos de clase). */
export default function SalaAudioBanner() {
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
      <div className="mt-2 rounded-xl border border-accent/50 bg-accent/15 p-2.5 backdrop-blur-sm sm:p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-accent">
              Audio de la clase
            </p>
            <p className="mt-0.5 text-[11px] text-blue-100/85 sm:text-xs">
              Habla y escucha sin salir de la app · solo tu clase
            </p>
          </div>
          <button
            type="button"
            onClick={() => void entrarSala()}
            className="flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-primary-dark shadow-md active:opacity-90 sm:min-w-[9rem]"
          >
            <span aria-hidden>🎙️</span>
            Unirse al audio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`mt-2 rounded-xl border p-2.5 backdrop-blur-sm sm:p-3 ${
        enSala
          ? "border-emerald-400/50 bg-emerald-500/15"
          : "border-white/25 bg-white/10"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {enSala && (
            <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
          )}
          <p className="text-xs font-bold uppercase tracking-wider text-white">
            {enSala ? "Sala de audio en vivo" : "Conectando audio…"}
          </p>
          {participantes.length > 0 && (
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-blue-100">
              {participantes.length} en sala
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => void toggleSilencio()}
            disabled={!enSala || conectando}
            className={`flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold active:opacity-90 disabled:opacity-50 ${
              silenciado
                ? "bg-amber-400/90 text-amber-950"
                : "bg-white/15 text-white"
            }`}
            aria-pressed={silenciado}
          >
            <span aria-hidden>{silenciado ? "🔇" : "🎤"}</span>
            {silenciado ? "Activar" : "Silenciar"}
          </button>
          <button
            type="button"
            onClick={() => void salirSala()}
            disabled={conectando}
            className="flex min-h-9 items-center gap-1 rounded-lg bg-red-500/85 px-2.5 text-xs font-semibold text-white active:opacity-90 disabled:opacity-50"
          >
            <span aria-hidden>📴</span>
            Salir
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-2 rounded-lg bg-red-500/25 px-2 py-1 text-xs text-red-100">{error}</p>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 custom-scroll">
        {participantes.map((p) => (
          <div
            key={p.peerId}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              p.speaking
                ? "bg-emerald-400/30 ring-2 ring-emerald-300/80 text-white"
                : "bg-white/10 text-blue-50"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                p.speaking ? "bg-emerald-400 text-emerald-950" : "bg-white/20 text-white"
              }`}
            >
              {p.nombre.charAt(0).toUpperCase()}
            </span>
            <span className="max-w-[5.5rem] truncate">{p.nombre}</span>
            {p.muted && <span className="text-[9px] uppercase opacity-70">mudo</span>}
            {p.speaking && (
              <span className="text-[9px] font-bold uppercase text-emerald-200">habla</span>
            )}
          </div>
        ))}
        {participantes.length === 0 && conectando && (
          <span className="text-xs text-blue-100/80">Esperando participantes…</span>
        )}
      </div>
    </div>
  )
}
