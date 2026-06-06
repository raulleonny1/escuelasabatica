"use client"

import { useState } from "react"
import { usePizarraOptional } from "@/components/PizarraContext"
import PizarraInkCanvas from "@/components/PizarraInkCanvas"
import { leerSesion } from "@/lib/sesionUsuario"
import type { HerramientaPizarra } from "@/lib/pizarraClase"

const COLORES = ["#1e293b", "#dc2626", "#2563eb", "#16a34a"] as const
const GROSORES = [2, 4, 7] as const
const GROSORES_BORRADOR = [8, 16, 28, 44] as const
const ETIQUETAS_BORRADOR = ["S", "M", "L", "XL"] as const

function esDispositivoTactil() {
  if (typeof window === "undefined") return false
  return window.matchMedia("(pointer: coarse)").matches
}

export default function PizarraOverlay({ claseId }: { claseId: string }) {
  const pizarra = usePizarraOptional()

  const [color, setColor] = useState<string>(COLORES[0])
  const [grosor, setGrosor] = useState<number>(() => (esDispositivoTactil() ? GROSORES[2] : GROSORES[1]))
  const [grosorBorrador, setGrosorBorrador] = useState<number>(GROSORES_BORRADOR[1])
  const [herramienta, setHerramienta] = useState<HerramientaPizarra>("lapiz")

  const esMaestro = pizarra?.esMaestro ?? false
  const abierta = pizarra?.abierta ?? false
  const visible = pizarra?.pantallaCompleta ?? false
  const paginaActual = pizarra?.paginaActual ?? 0
  const totalPaginas = pizarra?.totalPaginas ?? 1

  if (!pizarra || !abierta) return null

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => pizarra.restaurarPizarra()}
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-3 z-50 flex items-center gap-2 rounded-full border border-primary/20 bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg active:opacity-90 lg:bottom-6"
      >
        <span aria-hidden>📝</span>
        Ver pizarra
      </button>
    )
  }

  const sesion = leerSesion()
  const etiquetaMaestro = pizarra.estado?.abiertaPor || "Maestro"

  return (
    <div
      className="fixed inset-0 z-[65] flex flex-col bg-slate-900/55 backdrop-blur-[2px]"
      role="dialog"
      aria-label="Pizarra de la clase"
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-primary px-3 py-2 text-white sm:px-4">
        <p className="mr-auto text-sm font-semibold">
          📝 Pizarra {esMaestro ? "" : `· ${etiquetaMaestro}`}
        </p>

        <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1">
          <button
            type="button"
            onClick={() => void pizarra.paginaAnterior()}
            disabled={!esMaestro || paginaActual <= 0}
            className="rounded-md px-2 py-1 text-xs font-semibold disabled:opacity-40"
            aria-label="Página anterior"
          >
            ←
          </button>
          <span className="min-w-[4.5rem] text-center text-[11px] font-medium tabular-nums">
            {paginaActual + 1} / {totalPaginas}
          </span>
          <button
            type="button"
            onClick={() => void pizarra.paginaSiguiente()}
            disabled={!esMaestro || paginaActual >= totalPaginas - 1}
            className="rounded-md px-2 py-1 text-xs font-semibold disabled:opacity-40"
            aria-label="Página siguiente"
          >
            →
          </button>
          {esMaestro && (
            <button
              type="button"
              onClick={() => void pizarra.crearPagina()}
              className="rounded-md bg-accent px-2 py-1 text-[11px] font-semibold text-primary-dark"
              title="Nueva pantalla"
            >
              + Nueva
            </button>
          )}
        </div>

        {esMaestro && (
          <>
            <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1">
              {COLORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setHerramienta("lapiz")
                    setColor(c)
                  }}
                  className={`h-7 w-7 rounded-md border-2 ${
                    herramienta !== "borrador" &&
                    herramienta !== "subrayar" &&
                    herramienta !== "encerrar" &&
                    color === c
                      ? "border-accent scale-110"
                      : "border-white/30"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1">
              {herramienta === "borrador" ? (
                <>
                  <span className="hidden px-1 text-[10px] font-medium text-white/75 sm:inline">
                    Borrador
                  </span>
                  {GROSORES_BORRADOR.map((g, i) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrosorBorrador(g)}
                      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 ${
                        grosorBorrador === g ? "bg-accent text-primary-dark" : "text-white/90"
                      }`}
                      aria-label={`Tamaño borrador ${ETIQUETAS_BORRADOR[i]}`}
                      title={`Tamaño ${ETIQUETAS_BORRADOR[i]}`}
                    >
                      <span
                        className="rounded-full bg-current"
                        style={{
                          width: Math.min(10 + i * 5, 22),
                          height: Math.min(10 + i * 5, 22),
                        }}
                      />
                    </button>
                  ))}
                </>
              ) : (
                GROSORES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrosor(g)}
                    className={`flex h-8 w-8 items-center justify-center rounded-md ${
                      grosor === g ? "bg-accent text-primary-dark" : "text-white/90"
                    }`}
                    aria-label={`Grosor lápiz ${g}`}
                  >
                    <span
                      className="rounded-full bg-current"
                      style={{ width: g + 4, height: g + 4 }}
                    />
                  </button>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setHerramienta("lapiz")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                herramienta === "lapiz" ? "bg-accent text-primary-dark" : "bg-white/10"
              }`}
            >
              Lápiz
            </button>

            <button
              type="button"
              onClick={() => setHerramienta("subrayar")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                herramienta === "subrayar" ? "bg-accent text-primary-dark" : "bg-white/10"
              }`}
              title="Dibuja una línea horizontal bajo el texto"
            >
              Subrayar
            </button>

            <button
              type="button"
              onClick={() => setHerramienta("encerrar")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                herramienta === "encerrar" ? "bg-accent text-primary-dark" : "bg-white/10"
              }`}
              title="Círculo u óvalo si es redondo, rectángulo si es cuadrado"
            >
              Encerrar
            </button>

            <button
              type="button"
              onClick={() => setHerramienta("borrador")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                herramienta === "borrador" ? "bg-accent text-primary-dark" : "bg-white/10"
              }`}
              title="Borra trazos vectoriales al pasar"
            >
              Borrador
            </button>

            <button
              type="button"
              onClick={() => void pizarra.limpiarTablero()}
              className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold"
              title="Borra solo la pantalla actual"
            >
              Limpiar
            </button>
          </>
        )}

        {esMaestro ? (
          <button
            type="button"
            onClick={() => void pizarra.cerrarPizarra()}
            className="rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-semibold"
          >
            Cerrar para todos
          </button>
        ) : (
          <button
            type="button"
            onClick={() => pizarra.minimizarPizarra()}
            className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white active:opacity-90"
          >
            Volver a la lección
          </button>
        )}
      </div>

      <PizarraInkCanvas
        claseId={claseId}
        paginaActual={paginaActual}
        esMaestro={esMaestro}
        abierta={abierta}
        visible={visible}
        herramienta={herramienta}
        color={color}
        grosor={grosor}
        grosorBorrador={grosorBorrador}
        limpiarEn={pizarra.estado?.limpiarEn}
      />

      {!esMaestro && totalPaginas > 1 && (
        <div className="pointer-events-none absolute bottom-14 left-1/2 -translate-x-1/2 rounded-full bg-slate-800/75 px-3 py-1 text-[11px] text-white">
          Pantalla {paginaActual + 1} de {totalPaginas}
        </div>
      )}

      {esMaestro && herramienta === "borrador" && (
        <p className="shrink-0 bg-primary/90 px-3 py-1.5 text-center text-[10px] text-blue-100/90">
          Borrador vectorial: elimina trazos al soltar. Tamaños S · M · L · XL arriba.
        </p>
      )}

      {esMaestro && herramienta === "lapiz" && (
        <p className="shrink-0 bg-primary/90 px-3 py-1.5 text-center text-[10px] text-blue-100/90">
          Motor de tinta WebGL · Apple Pencil con presión e inclinación · dedo ignorado
        </p>
      )}

      {!esMaestro && sesion?.rol === "alumno" && (
        <p className="shrink-0 bg-primary/95 px-3 py-2 text-center text-[11px] text-blue-100">
          El maestro está usando la pizarra. Lo que escriba aparecerá aquí en tiempo real.
        </p>
      )}
    </div>
  )
}
