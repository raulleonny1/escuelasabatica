"use client"

import { useEffect, useState, type ReactNode } from "react"
import AppHeader from "@/components/AppHeader"
import { SalaAudioProvider } from "@/components/SalaAudioContext"
import { esModoIndependiente } from "@/lib/clase"
import { leerSesion, type SesionUsuario } from "@/lib/sesionUsuario"

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
  const audioClase =
    Boolean(sesion && claseId && !esModoIndependiente(claseId))

  const contenido = (
    <div className="flex h-dvh flex-col overflow-hidden">
      <AppHeader />
      <main className="flex min-h-0 flex-1 overflow-hidden bg-surface p-2 md:p-4">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[1800px] overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          {children}
        </div>
      </main>
    </div>
  )

  if (audioClase) {
    return (
      <SalaAudioProvider claseId={claseId} nombre={nombre}>
        {contenido}
      </SalaAudioProvider>
    )
  }

  return contenido
}
