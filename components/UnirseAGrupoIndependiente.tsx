"use client"

import { useEffect, useRef, useState } from "react"
import { subscribeGruposEnEstudio, type GrupoEnEstudio } from "@/lib/gruposEnEstudio"
import {
  crearSolicitudUnion,
  subscribeMiSolicitudUnion,
  type SolicitudUnion,
} from "@/lib/solicitudUnion"

interface UnirseAGrupoIndependienteProps {
  nombre: string
  onUnidoAClase: (claseId: string, claseNombre: string) => void
}

export default function UnirseAGrupoIndependiente({
  nombre,
  onUnidoAClase,
}: UnirseAGrupoIndependienteProps) {
  const [grupos, setGrupos] = useState<GrupoEnEstudio[]>([])
  const [solicitud, setSolicitud] = useState<SolicitudUnion | null>(null)
  const [claseSolicitada, setClaseSolicitada] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [conectandoLista, setConectandoLista] = useState(true)
  const unidoRef = useRef(false)

  useEffect(
    () =>
      subscribeGruposEnEstudio(
        (lista) => {
          setGrupos(lista)
          setConectandoLista(false)
        },
        () => setConectandoLista(false)
      ),
    []
  )

  useEffect(() => {
    if (!claseSolicitada || !nombre.trim()) {
      setSolicitud(null)
      return
    }
    return subscribeMiSolicitudUnion(claseSolicitada, nombre, setSolicitud)
  }, [claseSolicitada, nombre])

  useEffect(() => {
    if (solicitud?.estado === "aceptada" && claseSolicitada && !unidoRef.current) {
      unidoRef.current = true
      const nombreClase = solicitud.claseNombre || claseSolicitada
      setMensaje(`¡${solicitud.respondidoPor || "El maestro"} te aceptó! Entrando a la clase…`)
      onUnidoAClase(claseSolicitada, nombreClase)
    }
    if (solicitud?.estado === "rechazada") {
      setMensaje(
        solicitud.respondidoPor
          ? `${solicitud.respondidoPor} no pudo aceptarte en este momento.`
          : "Tu solicitud no fue aceptada."
      )
      setClaseSolicitada(null)
    }
  }, [solicitud, claseSolicitada, onUnidoAClase])

  async function solicitarUnirse(grupo: GrupoEnEstudio) {
    if (!nombre.trim()) return
    if (
      !confirm(
        `¿Pedir unirte a "${grupo.nombreClase}"?\n\nEl maestro ${grupo.maestroNombre || ""} debe aceptarte antes de entrar.`
      )
    ) {
      return
    }
    setCargando(true)
    setError(null)
    setMensaje(null)
    try {
      await crearSolicitudUnion(grupo.claseId, nombre, grupo.nombreClase)
      setClaseSolicitada(grupo.claseId)
      setMensaje(`Esperando que ${grupo.maestroNombre || "el maestro"} acepte tu entrada…`)
    } catch {
      setError("No se pudo enviar la solicitud. Revisa tu conexión.")
    } finally {
      setCargando(false)
    }
  }

  if (solicitud?.estado === "pendiente" && claseSolicitada) {
    return (
      <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
          Solicitud enviada
        </p>
        <p className="mt-1 text-sm text-amber-950">
          {mensaje || "El maestro verá tu nombre y decidirá si te acepta en el grupo."}
        </p>
      </div>
    )
  }

  if (conectandoLista && grupos.length === 0) {
    return (
      <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <p className="text-[11px] text-slate-500">Buscando grupos en estudio…</p>
      </div>
    )
  }

  if (grupos.length === 0) return null

  return (
    <div className="mb-3 rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-primary/5 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
        Grupos estudiando ahora
      </p>
      <p className="mt-1 text-[11px] leading-snug text-slate-600">
        Hay clase en vivo. Si quieres unirte, el maestro debe aceptarte.
      </p>
      {error && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      {mensaje && solicitud?.estado !== "pendiente" && (
        <p className="mt-2 text-xs text-emerald-800">{mensaje}</p>
      )}
      <ul className="mt-2 space-y-2">
        {grupos.map((g) => (
          <li
            key={g.claseId}
            className="flex flex-col gap-2 rounded-lg border border-white/80 bg-white/90 p-2.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">{g.nombreClase}</p>
              <p className="text-[11px] text-slate-500">
                Maestro: {g.maestroNombre || "—"} · {g.diaLabel || "estudio de hoy"}
              </p>
            </div>
            <button
              type="button"
              disabled={cargando}
              onClick={() => void solicitarUnirse(g)}
              className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Quiero unirme
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
