"use client"

import { useEffect, useState, type ReactNode } from "react"
import dynamic from "next/dynamic"
import AppHeader from "@/components/AppHeader"
import { LecturaUiProvider, useLecturaUiOptional } from "@/components/LecturaUiContext"
import { PizarraProvider, usePizarraOptional } from "@/components/PizarraContext"
import { SalaAudioProvider } from "@/components/SalaAudioContext"
import { esModoIndependiente } from "@/lib/clase"
import { leerSesion, type SesionUsuario } from "@/lib/sesionUsuario"

const PizarraOverlay = dynamic(() => import("@/components/PizarraOverlay"), {
  ssr: false,
  loading: () => null,
})

function CabeceraEnvolvente() {
  const lectura = useLecturaUiOptional()
  const pizarra = usePizarraOptional()
  const oculta = Boolean(lectura?.headerOculto || pizarra?.pantallaCompleta)

  useEffect(() => {
    document.documentElement.dataset.lectura = oculta ? "1" : "0"
    return () => {
      document.documentElement.dataset.lectura = "0"
    }
  }, [oculta])

  return (
    <div
      className={`app-header-shell shrink-0 overflow-hidden transition-[max-height,transform,opacity] duration-200 ease-out motion-reduce:transition-none lg:!max-h-none lg:!translate-y-0 lg:!opacity-100 ${
        oculta
          ? "pointer-events-none max-h-0 -translate-y-2 opacity-0"
          : "max-h-[min(70vh,520px)] translate-y-0 opacity-100"
      }`}
    >
      <AppHeader />
    </div>
  )
}

function ShellInterior({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <CabeceraEnvolvente />
      <main className="app-main flex min-h-0 flex-1 overflow-hidden bg-surface p-1 md:p-2 lg:p-4">
        <div className="app-main-inner mx-auto flex h-full min-h-0 w-full max-w-[1800px] overflow-hidden rounded-xl border border-border bg-card shadow-xl lg:rounded-2xl">
          {children}
        </div>
      </main>
    </div>
  )
}

export default function AppShell({ children }: { children: ReactNode }) {
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

  const claseId = sesion?.claseId ?? ""
  const nombre = sesion?.nombre ?? ""
  const claseGrupo = Boolean(sesion && claseId && !esModoIndependiente(claseId))

  const interior = <ShellInterior>{children}</ShellInterior>

  if (claseGrupo) {
    return (
      <LecturaUiProvider>
        <SalaAudioProvider claseId={claseId} nombre={nombre}>
          <PizarraProvider claseId={claseId}>
            {interior}
            <PizarraOverlay claseId={claseId} />
          </PizarraProvider>
        </SalaAudioProvider>
      </LecturaUiProvider>
    )
  }

  return <LecturaUiProvider>{interior}</LecturaUiProvider>
}
