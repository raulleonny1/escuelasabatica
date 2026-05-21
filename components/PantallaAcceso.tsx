"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import {
  CLASE_INDEPENDIENTE_ID,
  CLASE_INDEPENDIENTE_NOMBRE,
  asegurarSalaIndependiente,
  formatoCodigoLegible,
  generarCodigoClase,
  guardarClaseLocal,
  normalizarCodigoClase,
  unirseAClase,
} from "@/lib/clase"
import { crearSalaMaestro, entrarSalaMaestroExistente } from "@/lib/claseMaestro"
import {
  leerCodigoInvitacionDesdeUrl,
  limpiarParametrosInvitacionEnUrl,
  resolverClaseInvitacion,
} from "@/lib/enlaceInvitacion"
import { guardarPerfilMaestro, leerPerfilMaestro } from "@/lib/perfilMaestro"
import type { SesionUsuario } from "@/lib/sesionUsuario"
import { guardarSesion } from "@/lib/sesionUsuario"

type Paso =
  | "inicio"
  | "maestro-menu"
  | "maestro-crear"
  | "maestro-entrar"
  | "alumno"
  | "independiente"

interface PantallaAccesoProps {
  onEntrar: (sesion: SesionUsuario) => void
}

const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-surface/80 px-4 py-3 text-base text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-primary-light focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/15"

function BtnVolver({
  onClick,
  etiqueta = "Menú principal",
}: {
  onClick: () => void
  etiqueta?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-1 flex items-center gap-1 text-sm font-medium text-primary transition hover:text-primary-dark"
    >
      <span aria-hidden>←</span> {etiqueta}
    </button>
  )
}

function TarjetaRol({
  titulo,
  descripcion,
  icono,
  variant = "default",
  onClick,
}: {
  titulo: string
  descripcion: string
  icono: string
  variant?: "primary" | "default" | "soft"
  onClick: () => void
}) {
  const styles = {
    primary:
      "border-transparent bg-gradient-to-br from-primary to-primary-light text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/35",
    default:
      "border-primary/20 bg-white text-slate-800 shadow-md hover:border-primary/40 hover:bg-primary/[0.03]",
    soft: "border-border bg-surface text-slate-700 shadow-sm hover:bg-white hover:shadow-md",
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition active:scale-[0.99] ${styles[variant]}`}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${
          variant === "primary" ? "bg-white/15" : "bg-primary/8 group-hover:bg-primary/12"
        }`}
        aria-hidden
      >
        {icono}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-semibold ${variant === "primary" ? "text-white" : "text-primary"}`}>
          {titulo}
        </span>
        <span
          className={`mt-0.5 block text-xs leading-snug ${
            variant === "primary" ? "text-blue-100/90" : "text-slate-500"
          }`}
        >
          {descripcion}
        </span>
      </span>
      <span
        className={`shrink-0 text-lg opacity-60 ${variant === "primary" ? "text-white" : "text-primary"}`}
        aria-hidden
      >
        ›
      </span>
    </button>
  )
}

export default function PantallaAcceso({ onEntrar }: PantallaAccesoProps) {
  const [paso, setPaso] = useState<Paso>("inicio")
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState("")

  const [nombreMaestro, setNombreMaestro] = useState("")
  const [nombreClase, setNombreClase] = useState("")
  const [codigo, setCodigo] = useState(() => generarCodigoClase())
  const [textoAlumnos, setTextoAlumnos] = useState("")

  const [nombreAlumno, setNombreAlumno] = useState("")
  const [codigoAlumno, setCodigoAlumno] = useState("")

  const [nombreIndependiente, setNombreIndependiente] = useState("")

  const [nombreMaestroEntrar, setNombreMaestroEntrar] = useState("")
  const [codigoMaestroEntrar, setCodigoMaestroEntrar] = useState("")

  const [invitacionActiva, setInvitacionActiva] = useState(false)
  const [invitacionNombreClase, setInvitacionNombreClase] = useState("")

  const perfilMaestro = leerPerfilMaestro()

  useEffect(() => {
    const codigoUrl = leerCodigoInvitacionDesdeUrl()
    if (!codigoUrl) return

    let activo = true
    setCodigoAlumno(codigoUrl)
    setPaso("alumno")
    setInvitacionActiva(true)
    setCargando(true)

    resolverClaseInvitacion(codigoUrl)
      .then((clase) => {
        if (!activo) return
        if (!clase) {
          setInvitacionActiva(false)
          setError("Este enlace no es válido o la sala ya no existe. Pide uno nuevo a tu maestro.")
          return
        }
        setInvitacionNombreClase(clase.nombre)
        setCodigoAlumno(clase.id)
        setError("")
      })
      .catch(() => {
        if (activo) {
          setError("No se pudo verificar la invitación. Revisa tu conexión.")
        }
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [])

  function parsearAlumnos(texto: string): string[] {
    return texto
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2)
  }

  function finalizar(sesion: SesionUsuario) {
    guardarClaseLocal(sesion.claseId, sesion.claseNombre)
    guardarSesion(sesion)
    if (sesion.rol === "maestro") {
      guardarPerfilMaestro({
        nombre: sesion.nombre,
        claseId: sesion.claseId,
        claseNombre: sesion.claseNombre,
      })
    }
    if (sesion.rol === "alumno") {
      limpiarParametrosInvitacionEnUrl()
    }
    onEntrar(sesion)
  }

  function volverInicio() {
    setPaso("inicio")
    setError("")
  }

  function volverMenuMaestro() {
    setPaso("maestro-menu")
    setError("")
  }

  async function handleMaestro(e: React.FormEvent) {
    e.preventDefault()
    const maestro = nombreMaestro.trim()
    const clase = nombreClase.trim()
    if (maestro.length < 2) {
      setError("Escribe tu nombre como maestro.")
      return
    }
    if (clase.length < 2) {
      setError("Escribe el nombre de tu clase o grupo.")
      return
    }
    const id = normalizarCodigoClase(codigo)
    if (id.length < 3) {
      setError("El código debe tener al menos 3 caracteres.")
      return
    }

    setCargando(true)
    setError("")
    try {
      const alumnos = parsearAlumnos(textoAlumnos)
      const { id: claseId, nombre } = await crearSalaMaestro(maestro, clase, id, alumnos)
      finalizar({
        rol: "maestro",
        nombre: maestro,
        claseId,
        claseNombre: nombre,
      })
    } catch {
      setError("No se pudo crear la sala. Revisa tu conexión a internet.")
    } finally {
      setCargando(false)
    }
  }

  async function continuarComoMaestro() {
    if (!perfilMaestro) return
    setCargando(true)
    setError("")
    try {
      const { id, nombre } = await entrarSalaMaestroExistente(
        perfilMaestro.nombre,
        perfilMaestro.claseId
      )
      finalizar({
        rol: "maestro",
        nombre: perfilMaestro.nombre,
        claseId: id,
        claseNombre: nombre,
      })
    } catch {
      setError(
        "No se encontró tu sala. Puede que el código haya cambiado — entra con el código o crea una sala nueva."
      )
    } finally {
      setCargando(false)
    }
  }

  async function handleMaestroEntrar(e: React.FormEvent) {
    e.preventDefault()
    const maestro = nombreMaestroEntrar.trim()
    const cod = codigoMaestroEntrar.trim()
    if (maestro.length < 2) {
      setError("Escribe tu nombre como maestro.")
      return
    }
    if (cod.length < 3) {
      setError("Escribe el código de tu sala.")
      return
    }

    setCargando(true)
    setError("")
    try {
      const { id, nombre } = await entrarSalaMaestroExistente(maestro, cod)
      finalizar({
        rol: "maestro",
        nombre: maestro,
        claseId: id,
        claseNombre: nombre,
      })
    } catch {
      setError("No se encontró la sala con ese código. Verifica o crea una nueva.")
    } finally {
      setCargando(false)
    }
  }

  async function handleAlumno(e: React.FormEvent) {
    e.preventDefault()
    const nombre = nombreAlumno.trim()
    const cod = codigoAlumno.trim()
    if (nombre.length < 2) {
      setError("Escribe tu nombre.")
      return
    }
    if (cod.length < 3) {
      setError("Escribe el código que te dio tu maestro.")
      return
    }

    setCargando(true)
    setError("")
    try {
      const { id, nombre: nombreClaseGrupo } = await unirseAClase(cod)
      finalizar({
        rol: "alumno",
        nombre,
        claseId: id,
        claseNombre: nombreClaseGrupo,
      })
    } catch {
      setError("No se encontró la clase. Verifica el código.")
    } finally {
      setCargando(false)
    }
  }

  async function handleIndependiente(e: React.FormEvent) {
    e.preventDefault()
    const nombre = nombreIndependiente.trim()
    if (nombre.length < 2) {
      setError("Escribe tu nombre para el chat y las notas.")
      return
    }

    setCargando(true)
    setError("")
    try {
      await asegurarSalaIndependiente()
    } catch {
      guardarClaseLocal(CLASE_INDEPENDIENTE_ID, CLASE_INDEPENDIENTE_NOMBRE)
    }
    finalizar({
      rol: "independiente",
      nombre,
      claseId: CLASE_INDEPENDIENTE_ID,
      claseNombre: CLASE_INDEPENDIENTE_NOMBRE,
    })
    setCargando(false)
  }

  const tituloPaso =
    paso === "inicio"
      ? "¿Cómo quieres entrar?"
      : paso === "maestro-menu"
        ? "Acceso maestro"
        : paso === "maestro-crear"
          ? "Crear nueva sala"
          : paso === "maestro-entrar"
            ? "Entrar a mi sala"
            : paso === "alumno"
              ? invitacionActiva
                ? "Te invitaron a la clase"
                : "Unirte a la clase"
              : "Estudio personal"

  return (
    <div className="acceso-pantalla fixed inset-0 z-[80] flex min-h-dvh items-center justify-center overflow-y-auto p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
        <div className="absolute -right-20 top-1/4 h-64 w-64 rounded-full bg-primary-light/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-accent/15 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="relative my-auto w-full max-w-md">
        <div className="flex justify-center">
          <div className="acceso-logo-wrap relative z-10 -mb-10">
            <div className="rounded-2xl bg-white p-2.5 shadow-2xl ring-4 ring-white/30 sm:p-3">
              <Image
                src="/logoes.png"
                alt="Escuela Sabática"
                width={96}
                height={96}
                className="h-20 w-20 object-contain sm:h-24 sm:w-24"
                priority
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/25 bg-card/95 shadow-2xl shadow-primary-dark/40 backdrop-blur-md">
          <div className="border-b border-accent/30 bg-gradient-to-r from-primary-dark via-primary to-primary-light px-6 pb-5 pt-14 text-center text-white">
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
              Escuela Sabática
            </h1>
            <p className="mt-1 text-sm text-blue-100/90">Lección · Biblia · Notas · Chat</p>
            <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-accent shadow-[0_0_12px_rgba(201,162,39,0.6)]" />
          </div>

          <div className="px-5 py-6 sm:px-7 sm:py-7">
            <h2 className="font-display text-lg font-semibold text-primary">{tituloPaso}</h2>

            {paso === "inicio" && (
              <>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Elige tu forma de estudio. Si eres <strong className="text-primary">maestro</strong>, crea
                  una sala para tu grupo; si eres <strong className="text-primary">alumno</strong>, usa el
                  código; o entra <strong className="text-primary">en independiente</strong>.
                </p>
                <p className="mt-3 rounded-xl border border-primary/15 bg-primary/[0.04] px-3 py-2.5 text-xs leading-relaxed text-slate-600">
                  <strong className="text-primary">¿Cómo inicio sesión?</strong> En este dispositivo la app
                  te recuerda: si ya entraste, abres directo la lección. Para cambiar de rol, usa{" "}
                  <strong>Menú principal</strong> (arriba, cuando estés dentro) o elige de nuevo aquí.
                </p>
                <div className="mt-5 flex flex-col gap-3">
                  <TarjetaRol
                    variant="primary"
                    icono="👨‍🏫"
                    titulo="Soy maestro"
                    descripcion="Entrar a tu sala, crear una nueva o continuar donde quedaste"
                    onClick={() => {
                      if (perfilMaestro) {
                        setNombreMaestro(perfilMaestro.nombre)
                        setNombreMaestroEntrar(perfilMaestro.nombre)
                        setCodigoMaestroEntrar(perfilMaestro.claseId)
                      }
                      setPaso("maestro-menu")
                      setError("")
                    }}
                  />
                  <TarjetaRol
                    variant="default"
                    icono="🎓"
                    titulo="Soy alumno"
                    descripcion="Tengo el código que me compartió mi maestro"
                    onClick={() => {
                      setPaso("alumno")
                      setError("")
                    }}
                  />
                  <TarjetaRol
                    variant="soft"
                    icono="📖"
                    titulo="Estudiar en independiente"
                    descripcion="Sin código — chat, PDF y notas para ti"
                    onClick={() => {
                      setPaso("independiente")
                      setError("")
                    }}
                  />
                </div>
              </>
            )}

            {paso === "maestro-menu" && (
              <div className="mt-4 space-y-3">
                <BtnVolver onClick={volverInicio} />
                <p className="text-sm text-slate-600">
                  Si ya creaste una sala antes, <strong>continúa con el mismo código</strong>. Solo crea una
                  sala nueva si es un grupo distinto.
                </p>
                {perfilMaestro && (
                  <button
                    type="button"
                    disabled={cargando}
                    onClick={() => void continuarComoMaestro()}
                    className="w-full rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-accent-soft/50 p-4 text-left transition hover:border-primary/50 disabled:opacity-60"
                  >
                    <span className="block text-xs font-semibold uppercase tracking-wide text-primary">
                      Continuar donde quedaste
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-slate-800">
                      {perfilMaestro.nombre} · {perfilMaestro.claseNombre}
                    </span>
                    <span className="mt-0.5 block font-mono text-xs text-slate-500">
                      Código: {formatoCodigoLegible(perfilMaestro.claseId)}
                    </span>
                  </button>
                )}
                <TarjetaRol
                  variant="default"
                  icono="🔑"
                  titulo="Entrar con mi código"
                  descripcion="Ya tengo sala — escribo el código que comparto con alumnos"
                  onClick={() => {
                    setPaso("maestro-entrar")
                    setError("")
                  }}
                />
                <TarjetaRol
                  variant="soft"
                  icono="➕"
                  titulo="Crear sala nueva"
                  descripcion="Primera vez o un grupo nuevo con código distinto"
                  onClick={() => {
                    setPaso("maestro-crear")
                    setError("")
                  }}
                />
                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                    {error}
                  </p>
                )}
              </div>
            )}

            {paso === "maestro-entrar" && (
              <form onSubmit={handleMaestroEntrar} className="mt-4 space-y-4">
                <BtnVolver onClick={volverMenuMaestro} etiqueta="Atrás" />
                <p className="text-sm text-slate-600">
                  Usa el mismo código que diste a tus alumnos. No hace falta volver a crear la sala.
                </p>
                <div>
                  <label
                    className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                    htmlFor="nombre-maestro-entrar"
                  >
                    Tu nombre
                  </label>
                  <input
                    id="nombre-maestro-entrar"
                    value={nombreMaestroEntrar}
                    onChange={(e) => setNombreMaestroEntrar(e.target.value)}
                    className={inputClass}
                    placeholder="Ej. Prof. García"
                    maxLength={32}
                    autoFocus
                  />
                </div>
                <div>
                  <label
                    className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                    htmlFor="codigo-maestro-entrar"
                  >
                    Código de tu sala
                  </label>
                  <input
                    id="codigo-maestro-entrar"
                    value={codigoMaestroEntrar}
                    onChange={(e) => setCodigoMaestroEntrar(e.target.value)}
                    className={`${inputClass} font-mono`}
                    placeholder="luz-paz-42"
                  />
                </div>
                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={cargando}
                  className="min-h-12 w-full rounded-xl bg-gradient-to-r from-primary to-primary-light text-base font-semibold text-white shadow-lg shadow-primary/25 disabled:opacity-60"
                >
                  {cargando ? "Entrando…" : "Entrar a mi sala"}
                </button>
              </form>
            )}

            {paso === "maestro-crear" && (
              <form onSubmit={handleMaestro} className="mt-4 space-y-4">
                <BtnVolver onClick={volverMenuMaestro} etiqueta="Atrás" />
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="nombre-maestro">
                    Tu nombre
                  </label>
                  <input
                    id="nombre-maestro"
                    value={nombreMaestro}
                    onChange={(e) => setNombreMaestro(e.target.value)}
                    className={inputClass}
                    placeholder="Ej. Prof. García"
                    maxLength={32}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="nombre-clase-m">
                    Nombre de la clase
                  </label>
                  <input
                    id="nombre-clase-m"
                    value={nombreClase}
                    onChange={(e) => setNombreClase(e.target.value)}
                    className={inputClass}
                    placeholder="Ej. Jóvenes — sábado 9am"
                    maxLength={48}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Código para alumnos
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      value={codigo}
                      onChange={(e) => setCodigo(normalizarCodigoClase(e.target.value))}
                      className={`${inputClass} mt-0 font-mono text-sm`}
                    />
                    <button
                      type="button"
                      onClick={() => setCodigo(generarCodigoClase())}
                      className="shrink-0 rounded-xl border border-border bg-white px-3 text-xs font-medium text-slate-600 shadow-sm hover:bg-surface"
                    >
                      Otro
                    </button>
                  </div>
                  <p className="mt-2 rounded-lg bg-accent-soft/80 px-3 py-2 text-center text-sm font-semibold text-primary">
                    Comparte: {formatoCodigoLegible(codigo)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="alumnos">
                    Alumnos (opcional)
                  </label>
                  <textarea
                    id="alumnos"
                    value={textoAlumnos}
                    onChange={(e) => setTextoAlumnos(e.target.value)}
                    className={`${inputClass} min-h-28 resize-none`}
                    placeholder={"María\nJuan\nPedro"}
                  />
                </div>
                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={cargando}
                  className="min-h-12 w-full rounded-xl bg-gradient-to-r from-primary to-primary-light text-base font-semibold text-white shadow-lg shadow-primary/25 disabled:opacity-60"
                >
                  {cargando ? "Creando sala…" : "Crear sala de clase"}
                </button>
              </form>
            )}

            {paso === "alumno" && (
              <form onSubmit={handleAlumno} className="mt-4 space-y-4">
                <BtnVolver
                  onClick={() => {
                    if (invitacionActiva) limpiarParametrosInvitacionEnUrl()
                    setInvitacionActiva(false)
                    volverInicio()
                  }}
                />
                {invitacionActiva && (
                  <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-primary/5 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                      Invitación
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {invitacionNombreClase || "Clase de Escuela Sabática"}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Escribe tu nombre y pulsa entrar. El código ya viene en el enlace.
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="nombre-alumno">
                    Tu nombre
                  </label>
                  <input
                    id="nombre-alumno"
                    value={nombreAlumno}
                    onChange={(e) => setNombreAlumno(e.target.value)}
                    className={inputClass}
                    placeholder="Ej. María"
                    maxLength={32}
                    autoFocus
                  />
                </div>
                {!invitacionActiva && (
                  <div>
                    <label
                      className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                      htmlFor="codigo-alumno"
                    >
                      Código de la clase
                    </label>
                    <input
                      id="codigo-alumno"
                      value={codigoAlumno}
                      onChange={(e) => setCodigoAlumno(e.target.value)}
                      className={`${inputClass} font-mono`}
                      placeholder="luz-paz-42"
                    />
                  </div>
                )}
                {invitacionActiva && codigoAlumno && (
                  <p className="text-center text-xs text-slate-500">
                    Código:{" "}
                    <span className="font-mono font-medium text-primary">
                      {formatoCodigoLegible(codigoAlumno)}
                    </span>
                  </p>
                )}
                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={cargando}
                  className="min-h-12 w-full rounded-xl bg-gradient-to-r from-primary to-primary-light text-base font-semibold text-white shadow-lg shadow-primary/25 disabled:opacity-60"
                >
                  {cargando
                    ? "Entrando…"
                    : invitacionActiva
                      ? "Entrar a la clase"
                      : "Entrar a la clase"}
                </button>
              </form>
            )}

            {paso === "independiente" && (
              <form onSubmit={handleIndependiente} className="mt-4 space-y-4">
                <BtnVolver onClick={volverInicio} />
                <p className="text-sm text-slate-600">
                  Estudia a tu ritmo con lección en PDF, Biblia integrada, notas y chat general.
                </p>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="nombre-ind">
                    Tu nombre
                  </label>
                  <input
                    id="nombre-ind"
                    value={nombreIndependiente}
                    onChange={(e) => setNombreIndependiente(e.target.value)}
                    className={inputClass}
                    placeholder="Para identificarte en el chat"
                    maxLength={32}
                    autoFocus
                  />
                </div>
                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={cargando}
                  className="min-h-12 w-full rounded-xl bg-gradient-to-r from-primary to-primary-light text-base font-semibold text-white shadow-lg shadow-primary/25 disabled:opacity-60"
                >
                  {cargando ? "Entrando…" : "Empezar a estudiar"}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-white/70">
          2.º trimestre 2026 · Estudio bíblico adventista
        </p>
      </div>
    </div>
  )
}
