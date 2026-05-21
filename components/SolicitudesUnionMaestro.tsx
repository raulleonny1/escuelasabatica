"use client"

import { useEffect, useRef, useState } from "react"
import { actualizarListaAlumnos, subscribeDatosClase } from "@/lib/claseMaestro"
import {
  notificarSolicitudUnion,
  prepararSonidoChat,
  reproducirSonidoSolicitudUnion,
  solicitarPermisoNotificaciones,
} from "@/lib/chatNotificaciones"
import {
  responderSolicitudUnion,
  subscribeSolicitudesPendientes,
  type SolicitudUnion,
} from "@/lib/solicitudUnion"

interface SolicitudesUnionMaestroProps {
  claseId: string
  nombreMaestro: string
  nombreClase?: string
}

export default function SolicitudesUnionMaestro({
  claseId,
  nombreMaestro,
  nombreClase = "",
}: SolicitudesUnionMaestroProps) {
  const [pendientes, setPendientes] = useState<SolicitudUnion[]>([])
  const [alumnos, setAlumnos] = useState<string[]>([])
  const [procesando, setProcesando] = useState<string | null>(null)
  const [nuevaSolicitud, setNuevaSolicitud] = useState(false)
  const conocidosRef = useRef<Set<string> | null>(null)

  useEffect(() => {
    prepararSonidoChat()
    void solicitarPermisoNotificaciones()
  }, [])

  useEffect(() => subscribeSolicitudesPendientes(claseId, setPendientes), [claseId])

  useEffect(() => {
    const ids = new Set(pendientes.map((p) => p.presenceId))
    if (conocidosRef.current === null) {
      conocidosRef.current = ids
      return
    }
    const nuevas = pendientes.filter((p) => !conocidosRef.current!.has(p.presenceId))
    conocidosRef.current = ids
    if (nuevas.length === 0) return

    setNuevaSolicitud(true)
    reproducirSonidoSolicitudUnion()
    for (const s of nuevas) {
      notificarSolicitudUnion(s.nombre, nombreClase || s.claseNombre)
    }
  }, [pendientes, nombreClase])

  useEffect(() => {
    if (pendientes.length === 0) setNuevaSolicitud(false)
  }, [pendientes.length])

  useEffect(() => {
    return subscribeDatosClase(claseId, (d) => {
      if (d) setAlumnos(d.alumnos)
    })
  }, [claseId])

  async function responder(s: SolicitudUnion, aceptar: boolean) {
    setProcesando(s.presenceId)
    try {
      await responderSolicitudUnion(claseId, s.presenceId, aceptar, nombreMaestro)
      if (aceptar && s.nombre.trim()) {
        const ya = alumnos.some((a) => a.toLowerCase() === s.nombre.toLowerCase())
        if (!ya) {
          await actualizarListaAlumnos(claseId, [...alumnos, s.nombre.trim()])
        }
      }
    } catch {
      alert("No se pudo responder la solicitud.")
    } finally {
      setProcesando(null)
    }
  }

  if (pendientes.length === 0) return null

  return (
    <div
      className={`mb-3 rounded-xl border-2 p-3 transition-shadow ${
        nuevaSolicitud
          ? "animate-pulse border-amber-400 bg-amber-50 shadow-md shadow-amber-200/60"
          : "border-amber-300/80 bg-amber-50/90"
      }`}
      onMouseEnter={() => setNuevaSolicitud(false)}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
        Quiere unirse a tu clase
        {nuevaSolicitud && (
          <span className="ml-2 inline-flex rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold text-white normal-case">
            Nuevo
          </span>
        )}
      </p>
      <p className="mt-0.5 text-[11px] text-amber-950/80">
        Estudian en independiente y pidieron entrar a tu grupo.
      </p>
      <ul className="mt-2 space-y-2">
        {pendientes.map((s) => (
          <li
            key={s.presenceId}
            className="flex flex-col gap-2 rounded-lg bg-white p-2.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-sm font-medium text-slate-800">{s.nombre}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={procesando === s.presenceId}
                onClick={() => void responder(s, true)}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                Aceptar
              </button>
              <button
                type="button"
                disabled={procesando === s.presenceId}
                onClick={() => void responder(s, false)}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
              >
                Rechazar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
