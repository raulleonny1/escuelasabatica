"use client"

import { useEffect, useState } from "react"
import ChatEnLineaIndicador from "@/components/ChatEnLineaIndicador"
import PizarraBannerButton from "@/components/PizarraBannerButton"
import PwaInstallButton from "@/components/PwaInstallButton"
import SalaAudioBanner from "@/components/SalaAudioBanner"
import TextSizeControl from "@/components/TextSizeControl"
import {
  esModoIndependiente,
  formatoCodigoLegible,
} from "@/lib/clase"
import { irAMenuPrincipal } from "@/lib/navegacion"
import { cerrarSesion, leerSesion, type SesionUsuario } from "@/lib/sesionUsuario"

export default function AppHeader() {
  const [sesion, setSesion] = useState<SesionUsuario | null>(null)

  useEffect(() => {
    const sync = () => setSesion(leerSesion())
    sync()
    window.addEventListener("sesion-actualizada", sync)
    window.addEventListener("clase-guardada", sync)
    return () => {
      window.removeEventListener("sesion-actualizada", sync)
      window.removeEventListener("clase-guardada", sync)
    }
  }, [])

  function handleMenuPrincipal() {
    if (
      !confirm(
        "¿Ir al menú principal? Saldrás de tu sesión actual en este dispositivo (podrás volver a entrar después)."
      )
    ) {
      return
    }
    cerrarSesion()
    irAMenuPrincipal()
  }

  const independiente = sesion ? esModoIndependiente(sesion.claseId) : false
  const rolLabel =
    sesion?.rol === "maestro"
      ? "Maestro"
      : sesion?.rol === "alumno"
        ? "Alumno"
        : "Independiente"

  const portada = (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/segundo_trimestre.png"
      alt="Segundo trimestre 2026"
      className="h-full w-full object-contain object-right"
    />
  )

  return (
    <header className="relative shrink-0 overflow-hidden bg-gradient-to-r from-primary-dark via-primary to-primary-light text-white shadow-lg">
      <div
        className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_50%,#c9a227_0%,transparent_50%)]"
        aria-hidden
      />

      <div className="relative border-b-4 border-accent px-3 py-3 sm:px-5 md:px-8 md:py-4">
        {/* Fila 1: título + portada */}
        <div className="flex items-start justify-between gap-3 md:gap-6">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
              Escuela Sabática
            </h1>
            <p className="mt-0.5 text-xs text-blue-100/90 sm:text-sm">
              Lección del trimestre · Estudio bíblico diario
            </p>
          </div>
          <div className="relative h-12 w-20 shrink-0 sm:h-14 sm:w-28 md:h-[5.5rem] md:w-44 lg:h-24 lg:w-52">
            {portada}
          </div>
        </div>

        {sesion && (
          <>
            {/* Fila 2: sesión + herramientas alineadas */}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <p className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] leading-snug text-blue-50 backdrop-blur-sm sm:text-xs">
                <span className="font-semibold text-accent">{rolLabel}</span>
                <span className="text-white/50">·</span>
                <span className="font-medium text-white">{sesion.nombre}</span>
                {!independiente && sesion.claseNombre && (
                  <>
                    <span className="text-white/50">·</span>
                    <span className="text-blue-100/95">{sesion.claseNombre}</span>
                    {formatoCodigoLegible(sesion.claseId) && (
                      <>
                        <span className="hidden text-white/50 sm:inline">·</span>
                        <span className="hidden text-blue-100/75 sm:inline">
                          {formatoCodigoLegible(sesion.claseId)}
                        </span>
                      </>
                    )}
                  </>
                )}
                {independiente && (
                  <>
                    <span className="text-white/50">·</span>
                    <span className="text-blue-100/80">estudio personal</span>
                  </>
                )}
              </p>

              <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                {!independiente && <PizarraBannerButton />}
                <ChatEnLineaIndicador />
                <TextSizeControl variant="header" />
                <PwaInstallButton />
                <button
                  type="button"
                  onClick={handleMenuPrincipal}
                  className="rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm hover:bg-white/20 sm:text-xs"
                >
                  Menú principal
                </button>
              </div>
            </div>

            {/* Fila 3: audio (solo clases con maestro/alumnos) */}
            {!independiente && (
              <div className="mt-2.5 max-w-3xl">
                <SalaAudioBanner />
              </div>
            )}
          </>
        )}
      </div>
    </header>
  )
}
