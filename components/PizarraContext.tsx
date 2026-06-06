"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  cambiarPaginaPizarra,
  limpiarPaginaPizarra,
  nuevaPaginaPizarra,
  publicarEstadoPizarra,
  pulsoPizarraActiva,
  subscribeEstadoPizarra,
  type EstadoPizarra,
} from "@/lib/pizarraClase"
import { leerSesion } from "@/lib/sesionUsuario"

/** Si la pizarra lleva más de esto sin actualizarse, el maestro la cierra al entrar. */
const PIZARRA_STALE_MS = 2 * 60 * 60 * 1000

type PizarraContextValue = {
  esMaestro: boolean
  abierta: boolean
  pantallaCompleta: boolean
  minimizadaAlumno: boolean
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
  minimizarPizarra: () => void
  restaurarPizarra: () => void
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
  const [minimizadaAlumno, setMinimizadaAlumno] = useState(false)
  const staleRevisado = useRef(false)

  const abierta = estado?.abierta ?? false
  const paginaActual = estado?.paginaActual ?? 0
  const totalPaginas = estado?.totalPaginas ?? 1
  const pantallaCompleta = abierta && (esMaestro || !minimizadaAlumno)

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
    staleRevisado.current = false
    return subscribeEstadoPizarra(claseId, setEstado)
  }, [claseId])

  useEffect(() => {
    if (!abierta) setMinimizadaAlumno(false)
  }, [abierta])

  const cerrarPizarra = useCallback(async () => {
    if (!claseId || !esMaestro || !nombre) return
    await publicarEstadoPizarra(claseId, nombre, false)
  }, [claseId, esMaestro, nombre])

  /** Pizarra quedó abierta en Firestore de una sesión anterior → cerrar al volver el maestro. */
  useEffect(() => {
    if (!esMaestro || !claseId || !nombre || !estado?.abierta || staleRevisado.current) return
    staleRevisado.current = true
    const ms = estado.actualizadoMs
    if (!ms || Date.now() - ms > PIZARRA_STALE_MS) {
      void publicarEstadoPizarra(claseId, nombre, false)
    }
  }, [esMaestro, claseId, nombre, estado?.abierta, estado?.actualizadoMs])

  /** Al cerrar pestaña/app, el maestro cierra la pizarra para no dejar a alumnos atrapados. */
  useEffect(() => {
    if (!esMaestro || !claseId || !nombre) return
    const alSalir = () => {
      if (estado?.abierta) {
        void publicarEstadoPizarra(claseId, nombre, false)
      }
    }
    window.addEventListener("pagehide", alSalir)
    return () => window.removeEventListener("pagehide", alSalir)
  }, [esMaestro, claseId, nombre, estado?.abierta])

  /** Mientras la pizarra está abierta, refrescar timestamp (clase larga). */
  useEffect(() => {
    if (!esMaestro || !claseId || !nombre || !abierta) return
    const tick = setInterval(() => {
      void pulsoPizarraActiva(claseId, nombre)
    }, 5 * 60 * 1000)
    return () => clearInterval(tick)
  }, [esMaestro, claseId, nombre, abierta])

  const abrirPizarra = useCallback(async () => {
    if (!claseId || !esMaestro || !nombre) return
    staleRevisado.current = true
    await publicarEstadoPizarra(claseId, nombre, true, {
      paginaActual: 0,
      totalPaginas: Math.max(1, estado?.totalPaginas ?? 1),
    })
  }, [claseId, esMaestro, nombre, estado?.totalPaginas])

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

  const minimizarPizarra = useCallback(() => setMinimizadaAlumno(true), [])
  const restaurarPizarra = useCallback(() => setMinimizadaAlumno(false), [])

  return (
    <PizarraContext.Provider
      value={{
        esMaestro,
        abierta,
        pantallaCompleta,
        minimizadaAlumno,
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
        minimizarPizarra,
        restaurarPizarra,
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
