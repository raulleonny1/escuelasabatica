"use client"

import { useEffect, useState } from "react"
import ChatEnLineaIndicador from "@/components/ChatEnLineaIndicador"
import PwaInstallButton from "@/components/PwaInstallButton"
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

  return (
    <header className="relative shrink-0 overflow-hidden bg-gradient-to-r from-primary-dark via-primary to-primary-light text-white shadow-lg">
      <div
        className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_50%,#c9a227_0%,transparent_50%)]"
        aria-hidden
      />
      <div className="relative flex items-center gap-2 border-b-4 border-accent px-3 py-2.5 sm:gap-3 sm:px-4 md:gap-4 md:px-8 md:py-4">
        <div className="min-w-0 flex-1 sm:max-w-[38%] lg:max-w-none lg:flex-none">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="font-display text-lg font-semibold tracking-tight sm:text-xl md:text-3xl">
                Escuela Sabática
              </h1>
              <p className="mt-0.5 text-xs text-blue-100/90 sm:text-sm md:mt-1 md:text-base">
                Lección del trimestre · Estudio bíblico diario
              </p>
            </div>
            {sesion && (
              <button
                type="button"
                onClick={handleMenuPrincipal}
                className="shrink-0 rounded-lg border border-white/30 bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm hover:bg-white/20 sm:text-xs"
              >
                Menú principal
              </button>
            )}
          </div>
          {sesion && (
            <p className="mt-1 text-[11px] text-accent sm:text-xs">
              {rolLabel}: <span className="font-medium">{sesion.nombre}</span>
              {!independiente && sesion.claseNombre && (
                <>
                  {" "}
                  · <span className="text-blue-100/90">{sesion.claseNombre}</span>
                  {formatoCodigoLegible(sesion.claseId) && (
                    <span className="text-blue-100/80">
                      {" "}
                      · {formatoCodigoLegible(sesion.claseId)}
                    </span>
                  )}
                </>
              )}
              {independiente && (
                <span className="text-blue-100/80"> · estudio personal</span>
              )}
            </p>
          )}
          <ChatEnLineaIndicador placement="mobile" />
          <PwaInstallButton />
        </div>

        <ChatEnLineaIndicador placement="desktop" />

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <TextSizeControl variant="header" />
          <div className="relative h-12 w-24 sm:h-14 sm:w-28 md:h-20 md:w-44 lg:h-24 lg:w-52">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/segundo_trimestre.png"
            alt="Segundo trimestre 2026"
            className="h-full w-full object-contain object-right"
          />
          </div>
        </div>
      </div>
    </header>
  )
}
