"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import {
  limpiarPizarra,
  publicarEstadoPizarra,
  subscribeEstadoPizarra,
  type EstadoPizarra,
} from "@/lib/pizarraClase"
import { leerSesion } from "@/lib/sesionUsuario"

type PizarraContextValue = {
  esMaestro: boolean
  abierta: boolean
  estado: EstadoPizarra | null
  abrirPizarra: () => Promise<void>
  cerrarPizarra: () => Promise<void>
  togglePizarra: () => Promise<void>
  limpiarTablero: () => Promise<void>
}

const PizarraContext = createContext<PizarraContextValue | null>(null)

export function PizarraProvider({
  claseId,
  children,
}: {
  claseId: string
  children: ReactNode
}) {
  const [esMaestro, setEsMaestro] = useState(false)
  const [nombre, setNombre] = useState("")
  const [estado, setEstado] = useState<EstadoPizarra | null>(null)
  const abierta = estado?.abierta ?? false

  useEffect(() => {
    const sync = () => {
      const s = leerSesion()
      setEsMaestro(s?.rol === "maestro")
      setNombre(s?.nombre ?? "")
    }
    sync()
    window.addEventListener("sesion-actualizada", sync)
    return () => window.removeEventListener("sesion-actualizada", sync)
  }, [])

  useEffect(() => {
    if (!claseId) return
    return subscribeEstadoPizarra(claseId, setEstado)
  }, [claseId])

  const abrirPizarra = useCallback(async () => {
    if (!claseId || !esMaestro || !nombre) return
    await publicarEstadoPizarra(claseId, nombre, true)
  }, [claseId, esMaestro, nombre])

  const cerrarPizarra = useCallback(async () => {
    if (!claseId || !esMaestro || !nombre) return
    await publicarEstadoPizarra(claseId, nombre, false)
  }, [claseId, esMaestro, nombre])

  const togglePizarra = useCallback(async () => {
    if (abierta) await cerrarPizarra()
    else await abrirPizarra()
  }, [abierta, abrirPizarra, cerrarPizarra])

  const limpiarTablero = useCallback(async () => {
    if (!claseId || !esMaestro || !nombre) return
    await limpiarPizarra(claseId, nombre)
  }, [claseId, esMaestro, nombre])

  return (
    <PizarraContext.Provider
      value={{
        esMaestro,
        abierta,
        estado,
        abrirPizarra,
        cerrarPizarra,
        togglePizarra,
        limpiarTablero,
      }}
    >
      {children}
    </PizarraContext.Provider>
  )
}

export function usePizarra() {
  const ctx = useContext(PizarraContext)
  if (!ctx) throw new Error("usePizarra debe usarse dentro de PizarraProvider")
  return ctx
}

export function usePizarraOptional() {
  return useContext(PizarraContext)
}
