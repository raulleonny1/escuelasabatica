"use client"

import { useEffect, useState } from "react"
import {
  actualizarListaAlumnos,
  fechaAsistenciaHoy,
  guardarAsistencia,
  subscribeAsistencia,
  subscribeDatosClase,
} from "@/lib/claseMaestro"
import EnlaceInvitacionClase from "@/components/EnlaceInvitacionClase"
import SolicitudesUnionMaestro from "@/components/SolicitudesUnionMaestro"
import { formatoCodigoLegible } from "@/lib/clase"

interface PanelMaestroProps {
  claseId: string
  nombreMaestro: string
}

export default function PanelMaestro({ claseId, nombreMaestro }: PanelMaestroProps) {
  const [alumnos, setAlumnos] = useState<string[]>([])
  const [nombreClase, setNombreClase] = useState("")
  const [codigo, setCodigo] = useState("")
  const [nuevoAlumno, setNuevoAlumno] = useState("")
  const [fecha, setFecha] = useState(fechaAsistenciaHoy)
  const [presentes, setPresentes] = useState<Set<string>>(new Set())
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)

  useEffect(() => {
    return subscribeDatosClase(claseId, (datos) => {
      if (!datos) return
      setAlumnos(datos.alumnos)
      setNombreClase(datos.nombre)
      setCodigo(datos.codigo)
    })
  }, [claseId])

  useEffect(() => {
    return subscribeAsistencia(claseId, fecha, (reg) => {
      if (reg) {
        setPresentes(new Set(reg.presentes))
      } else {
        setPresentes(new Set())
      }
    })
  }, [claseId, fecha])

  async function handleAgregarAlumno(e: React.FormEvent) {
    e.preventDefault()
    const nombre = nuevoAlumno.trim()
    if (nombre.length < 2) return
    if (alumnos.some((a) => a.toLowerCase() === nombre.toLowerCase())) {
      setMensaje("Ese alumno ya está en la lista.")
      return
    }
    const lista = [...alumnos, nombre]
    setGuardando(true)
    try {
      await actualizarListaAlumnos(claseId, lista)
      setNuevoAlumno("")
      setMensaje(null)
    } catch {
      setMensaje("No se pudo guardar la lista.")
    } finally {
      setGuardando(false)
    }
  }

  async function handleQuitar(nombre: string) {
    const lista = alumnos.filter((a) => a !== nombre)
    setGuardando(true)
    try {
      await actualizarListaAlumnos(claseId, lista)
      setPresentes((prev) => {
        const n = new Set(prev)
        n.delete(nombre)
        return n
      })
    } catch {
      setMensaje("No se pudo actualizar.")
    } finally {
      setGuardando(false)
    }
  }

  function togglePresente(nombre: string) {
    setPresentes((prev) => {
      const n = new Set(prev)
      if (n.has(nombre)) n.delete(nombre)
      else n.add(nombre)
      return n
    })
  }

  async function handleGuardarAsistencia() {
    setGuardando(true)
    setMensaje(null)
    try {
      await guardarAsistencia(claseId, fecha, [...presentes], nombreMaestro)
      setMensaje(`Asistencia guardada: ${presentes.size} de ${alumnos.length}`)
    } catch {
      setMensaje("No se pudo guardar la asistencia.")
    } finally {
      setGuardando(false)
    }
  }

  function marcarTodos(presente: boolean) {
    if (presente) setPresentes(new Set(alumnos))
    else setPresentes(new Set())
  }

  return (
    <section className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-900/80">
        Panel del maestro
      </p>
      <p className="mt-0.5 text-sm font-medium text-slate-800">{nombreClase}</p>
      <p className="text-xs text-slate-600">
        Código: <strong className="text-primary">{formatoCodigoLegible(codigo || claseId)}</strong>
      </p>

      <SolicitudesUnionMaestro
        claseId={claseId}
        nombreMaestro={nombreMaestro}
        nombreClase={nombreClase}
      />

      <div className="mt-3">
        <EnlaceInvitacionClase
          claseId={codigo || claseId}
          nombreClase={nombreClase}
        />
      </div>

      <div className="mt-3">
        <p className="mb-1.5 text-xs font-medium text-slate-600">Lista de alumnos</p>
        <form onSubmit={handleAgregarAlumno} className="flex gap-1.5">
          <input
            value={nuevoAlumno}
            onChange={(e) => setNuevoAlumno(e.target.value)}
            placeholder="Nombre del alumno"
            maxLength={32}
            className="min-w-0 flex-1 rounded-lg border border-border bg-white px-2.5 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={guardando}
            className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            Añadir
          </button>
        </form>
        {alumnos.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">Aún no hay alumnos. Añade nombres arriba.</p>
        ) : (
          <ul className="mt-2 max-h-28 overflow-y-auto custom-scroll space-y-1">
            {alumnos.map((a) => (
              <li
                key={a}
                className="flex items-center justify-between rounded-md bg-white/80 px-2 py-1 text-sm"
              >
                <span>{a}</span>
                <button
                  type="button"
                  onClick={() => void handleQuitar(a)}
                  className="text-xs text-red-600 underline"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 border-t border-amber-200/60 pt-3">
        <p className="mb-1.5 text-xs font-medium text-slate-600">Tomar asistencia</p>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="mb-2 w-full rounded-lg border border-border bg-white px-2.5 py-2 text-sm"
        />
        {alumnos.length > 0 && (
          <>
            <div className="mb-2 flex gap-2">
              <button
                type="button"
                onClick={() => marcarTodos(true)}
                className="text-[11px] text-primary underline"
              >
                Marcar todos
              </button>
              <button
                type="button"
                onClick={() => marcarTodos(false)}
                className="text-[11px] text-slate-500 underline"
              >
                Ninguno
              </button>
            </div>
            <ul className="max-h-36 overflow-y-auto custom-scroll space-y-1">
              {alumnos.map((a) => (
                <li key={a}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md bg-white px-2 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={presentes.has(a)}
                      onChange={() => togglePresente(a)}
                      className="h-4 w-4 rounded border-border text-primary"
                    />
                    {a}
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
        <button
          type="button"
          onClick={() => void handleGuardarAsistencia()}
          disabled={guardando || alumnos.length === 0}
          className="mt-2 min-h-10 w-full rounded-lg bg-amber-700 text-sm font-medium text-white disabled:opacity-50"
        >
          {guardando ? "Guardando…" : `Guardar asistencia (${presentes.size}/${alumnos.length})`}
        </button>
        {mensaje && <p className="mt-1.5 text-xs text-amber-900">{mensaje}</p>}
      </div>
    </section>
  )
}
