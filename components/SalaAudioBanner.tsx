"use client"

import { useSalaAudioOptional } from "@/components/SalaAudioContext"

/** Audio de clase en la cabecera — compacto y alineado. */
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
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
        <span className="text-base leading-none" aria-hidden>
          🎙️
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-accent sm:text-xs">
            Audio de la clase
          </p>
          <p className="hidden text-[11px] text-blue-100/80 sm:block">
            Habla con tu grupo sin salir de la app
          </p>
        </div>
        <button
          type="button"
          onClick={() => void entrarSala()}
          className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-primary-dark shadow-sm active:opacity-90 sm:px-4 sm:py-2 sm:text-sm"
        >
          Unirse
        </button>
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border px-3 py-2 backdrop-blur-sm ${
        enSala
          ? "border-emerald-400/40 bg-emerald-500/15"
          : "border-white/20 bg-white/10"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {enSala && (
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
          )}
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white sm:text-xs">
            {enSala ? "Audio en vivo" : "Conectando…"}
          </p>
          {participantes.length > 0 && (
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-blue-100">
              {participantes.length}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto custom-scroll">
          {participantes.map((p) => (
            <span
              key={p.peerId}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-[11px] ${
                p.speaking
                  ? "bg-emerald-400/35 text-white ring-1 ring-emerald-300/70"
                  : "bg-white/10 text-blue-50"
              }`}
            >
              <span className="font-bold">{p.nombre.charAt(0).toUpperCase()}</span>
              <span className="max-w-[4.5rem] truncate">{p.nombre.split(" ")[0]}</span>
              {p.speaking && <span className="text-[9px] uppercase text-emerald-200">●</span>}
            </span>
          ))}
        </div>

        <div className="ml-auto flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={() => void toggleSilencio()}
            disabled={!enSala || conectando}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold active:opacity-90 disabled:opacity-50 sm:text-xs ${
              silenciado ? "bg-amber-400 text-amber-950" : "bg-white/15 text-white"
            }`}
            aria-pressed={silenciado}
          >
            {silenciado ? "🔇 Mic" : "🎤 Mic"}
          </button>
          <button
            type="button"
            onClick={() => void salirSala()}
            disabled={conectando}
            className="rounded-lg bg-red-500/90 px-2.5 py-1 text-[11px] font-semibold text-white active:opacity-90 disabled:opacity-50 sm:text-xs"
          >
            Salir
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-1.5 rounded-md bg-red-500/25 px-2 py-1 text-[11px] text-red-100">{error}</p>
      )}
    </div>
  )
}
