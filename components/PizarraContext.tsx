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
  cambiarPaginaPizarra,
  limpiarPaginaPizarra,
  nuevaPaginaPizarra,
  publicarEstadoPizarra,
  subscribeEstadoPizarra,
  type EstadoPizarra,
} from "@/lib/pizarraClase"
import { leerSesion } from "@/lib/sesionUsuario"

type PizarraContextValue = {
  esMaestro: boolean
  abierta: boolean
  estado: EstadoPizarra | null
  paginaActual: number
  totalPaginas: number
  abrirPizarra: () => Promise<void>
  cerrarPizarra: () => Promise<void>
  togglePizarra: () => Promise<void>
  limpiarTablero: () => Promise<void>
  irPagina: (pagina: number) => Promise<void>
  paginaAnterior: () => Promise<void>
  paginaSiguiente: () => Promise<void>
  crearPagina: () => Promise<void>
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
  const paginaActual = estado?.paginaActual ?? 0
  const totalPaginas = estado?.totalPaginas ?? 1

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
    await publicarEstadoPizarra(claseId, nombre, true, {
      paginaActual: 0,
      totalPaginas: Math.max(1, estado?.totalPaginas ?? 1),
    })
  }, [claseId, esMaestro, nombre, estado?.totalPaginas])

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
    await limpiarPaginaPizarra(claseId, nombre, paginaActual)
  }, [claseId, esMaestro, nombre, paginaActual])

  const irPagina = useCallback(
    async (pagina: number) => {
      if (!claseId || !esMaestro || !nombre) return
      const p = Math.max(0, Math.min(pagina, totalPaginas - 1))
      await cambiarPaginaPizarra(claseId, nombre, p)
    },
    [claseId, esMaestro, nombre, totalPaginas]
  )

  const paginaAnterior = useCallback(async () => {
    if (paginaActual > 0) await irPagina(paginaActual - 1)
  }, [paginaActual, irPagina])

  const paginaSiguiente = useCallback(async () => {
    if (paginaActual < totalPaginas - 1) await irPagina(paginaActual + 1)
  }, [paginaActual, totalPaginas, irPagina])

  const crearPagina = useCallback(async () => {
    if (!claseId || !esMaestro || !nombre) return
    await nuevaPaginaPizarra(claseId, nombre)
  }, [claseId, esMaestro, nombre])

  return (
    <PizarraContext.Provider
      value={{
        esMaestro,
        abierta,
        estado,
        paginaActual,
        totalPaginas,
        abrirPizarra,
        cerrarPizarra,
        togglePizarra,
        limpiarTablero,
        irPagina,
        paginaAnterior,
        paginaSiguiente,
        crearPagina,
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
