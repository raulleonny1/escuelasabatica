"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Biblia from "@/components/Biblia"
import dynamic from "next/dynamic"
import {
  subscribeComentariosClase,
  guardarComentarioClase,
  eliminarComentarioClase,
  leerComentariosClaseLocal,
  migrarComentariosClaseLocales,
  guardarComentariosClaseLocal,
  idDocumentoComentario,
  misComentariosPorFecha,
  type NotaClase,
} from "@/lib/comentarios"
import { esModoIndependiente, guardarClaseLocal, unirseAClase } from "@/lib/clase"
import { marcarGrupoEnEstudio, quitarGrupoEnEstudio } from "@/lib/gruposEnEstudio"
import { guardarSesion, leerSesion, type SesionUsuario } from "@/lib/sesionUsuario"
import { IR_MENU_PRINCIPAL_EVENT } from "@/lib/navegacion"
import {
  ESTUDIO_INICIADO_EVENT,
  getEstudioDeHoy,
  iniciarSesionEstudio,
  subscribeSesionEstudio,
  type SesionEstudio,
} from "@/lib/sesionEstudio"

import LeccionControls from "@/components/LeccionControls"
import MobilePdfControls from "@/components/MobilePdfControls"
import NotasPanel from "@/components/NotasPanel"
import ComunicacionPanel from "@/components/ComunicacionPanel"
import { SalaAudioProvider } from "@/components/SalaAudioContext"
import SalaAudioBarraFlotante from "@/components/SalaAudioBarraFlotante"
import IniciarEstudioButton from "@/components/IniciarEstudioButton"
import PantallaAcceso from "@/components/PantallaAcceso"
import PanelMaestro from "@/components/PanelMaestro"
import MaterialesMaestro from "@/components/MaterialesMaestro"
import UnirseAGrupoIndependiente from "@/components/UnirseAGrupoIndependiente"
import AvisosEntradaClase from "@/components/AvisosEntradaClase"
import PdfErrorBoundary from "@/components/PdfErrorBoundary"
import {
  getFechaDestacadaEnSemana,
  getFechasSemana,
  getSemanaActual,
} from "@/lib/semana"
import {
  anunciarEntradaChat,
  getChatSessionId,
  guardarNombreChat,
  iniciarPresenciaEnApp,
} from "@/lib/chat"
import { desbloquearSonidosEnInteraccion } from "@/lib/audioClase"
import { useMediaLg } from "@/hooks/useMediaLg"
import { CHAT_ABRIR_EVENT, CHAT_NO_LEIDOS_EVENT } from "@/lib/chatNotificaciones"
import { prepararSonidoChat } from "@/lib/chatNotificaciones"
import {
  comentariosOtrosEnFecha,
  guardarPreferenciaCompartir,
  listarNotasCompartidasDelGrupo,
  miPreferenciaCompartir,
  subscribePreferenciasCompartir,
  type PreferenciaCompartir,
} from "@/lib/compartirNotas"

const PdfViewer = dynamic(() => import("@/components/PdfViewer"), { ssr: false })

type MobileTab = "pdf" | "estudio" | "chat"

export default function Home() {
  const [showModal, setShowModal] = useState(false)
  const [showModalOtros, setShowModalOtros] = useState(false)
  const [showAvisoCompartir, setShowAvisoCompartir] = useState(false)
  const [preferenciasCompartir, setPreferenciasCompartir] = useState<PreferenciaCompartir[]>([])
  const [editFecha, setEditFecha] = useState<string | null>(null)
  const [editTexto, setEditTexto] = useState("")
  const [BibliaPasaje, setBibliaPasaje] = useState("")
  const [semana, setSemana] = useState(() => getSemanaActual())
  const [tipo, setTipo] = useState("leccion")
  const [notasClase, setNotasClase] = useState<Record<string, NotaClase>>({})
  const [comentario, setComentario] = useState("")
  const [selectedDate, setSelectedDate] = useState(() =>
    getFechaDestacadaEnSemana(getSemanaActual())
  )
  const [cargandoClase, setCargandoClase] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>("pdf")
  const [leccionJump, setLeccionJump] = useState(0)
  const [sesion, setSesion] = useState<SesionUsuario | null>(null)
  const [sesionListo, setSesionListo] = useState(false)
  const [chatNoLeidos, setChatNoLeidos] = useState(0)
  const [sesionActiva, setSesionActiva] = useState<SesionEstudio | null>(null)
  const [iniciandoEstudio, setIniciandoEstudio] = useState(false)
  const [materialMaestroPdf, setMaterialMaestroPdf] = useState<{
    url: string
    titulo: string
  } | null>(null)
  const isLg = useMediaLg()

  function formatDateDMY(dateStr: string) {
    if (!dateStr) return ""
    const [year, month, day] = dateStr.split("-")
    return `${day}/${month}/${year}`
  }

  function agregarVersiculo(v: string) {
    setBibliaPasaje(v)
    setMobileTab("pdf")
  }

  const claseId = sesion?.claseId ?? ""
  const claseNombre = sesion?.claseNombre ?? ""
  const chatNombre = sesion?.nombre ?? ""
  const modoIndependiente = sesion ? esModoIndependiente(sesion.claseId) : false
  const esMaestro = sesion?.rol === "maestro"
  const chatClaseActiva = Boolean(sesion && claseId && !modoIndependiente)

  useEffect(() => {
    const s = leerSesion()
    setSesion(s)
    if (s) {
      guardarNombreChat(s.nombre)
    }
    setSesionListo(true)
  }, [])

  useEffect(() => {
    const sync = () => {
      const s = leerSesion()
      setSesion(s)
      if (!s) {
        setMaterialMaestroPdf(null)
        setChatNoLeidos(0)
      }
    }
    window.addEventListener("sesion-actualizada", sync)
    window.addEventListener(IR_MENU_PRINCIPAL_EVENT, sync)
    return () => {
      window.removeEventListener("sesion-actualizada", sync)
      window.removeEventListener(IR_MENU_PRINCIPAL_EVENT, sync)
    }
  }, [])

  useEffect(() => {
    desbloquearSonidosEnInteraccion()
  }, [])

  useEffect(() => {
    if (!chatNombre || !claseId) return
    const sessionId = getChatSessionId()
    void anunciarEntradaChat(claseId, chatNombre, sessionId)
    return iniciarPresenciaEnApp(claseId, chatNombre, sessionId)
  }, [chatNombre, claseId])

  useEffect(() => {
    if (!claseId) return
    return subscribeSesionEstudio(claseId, setSesionActiva, () => {})
  }, [claseId])

  useEffect(() => {
    const onEstudio = (e: Event) => {
      const det = (e as CustomEvent<{ semana: number; fecha: string }>).detail
      if (!det?.semana || !det?.fecha) return
      setSemana(det.semana)
      setSelectedDate(det.fecha)
      setTipo("leccion")
      setLeccionJump((n) => n + 1)
      setMobileTab("pdf")
      setComentario(misComentariosPorFecha(notasClase, chatNombre)[det.fecha]?.texto ?? "")
    }
    window.addEventListener(ESTUDIO_INICIADO_EVENT, onEstudio)
    return () => window.removeEventListener(ESTUDIO_INICIADO_EVENT, onEstudio)
  }, [claseId, notasClase, chatNombre])

  useEffect(() => {
    const onNoLeidos = (e: Event) => {
      const det = (e as CustomEvent<{ cantidad: number }>).detail
      setChatNoLeidos(det?.cantidad ?? 0)
    }
    const onAbrirChat = () => setMobileTab("chat")

    window.addEventListener(CHAT_NO_LEIDOS_EVENT, onNoLeidos)
    window.addEventListener(CHAT_ABRIR_EVENT, onAbrirChat)
    return () => {
      window.removeEventListener(CHAT_NO_LEIDOS_EVENT, onNoLeidos)
      window.removeEventListener(CHAT_ABRIR_EVENT, onAbrirChat)
    }
  }, [])

  useEffect(() => {
    if (!claseId) {
      setCargandoClase(false)
      return
    }

    let migrado = false
    setCargandoClase(true)

    const unsubscribe = subscribeComentariosClase(
      claseId,
      async (data) => {
        if (!migrado && Object.keys(data).length === 0) {
          const local = leerComentariosClaseLocal(claseId)
          if (Object.keys(local).length > 0) {
            try {
              await migrarComentariosClaseLocales(claseId, local)
            } catch {
              setNotasClase(local)
              setSyncError("Sin conexión. Mostrando notas de clase guardadas aquí.")
            }
            migrado = true
            return
          }
        }
        migrado = true
        setNotasClase(data)
        setSyncError(null)
        setCargandoClase(false)
      },
      () => {
        setNotasClase(leerComentariosClaseLocal(claseId))
        setSyncError("Sin conexión a Firebase. Notas de clase solo en caché local.")
        setCargandoClase(false)
      }
    )

    return () => unsubscribe()
  }, [claseId])

  useEffect(() => {
    if (!claseId) {
      setPreferenciasCompartir([])
      return
    }
    return subscribePreferenciasCompartir(claseId, setPreferenciasCompartir)
  }, [claseId])

  const yoCompartoNotas =
    miPreferenciaCompartir(preferenciasCompartir, chatNombre)?.aceptaCompartir ?? false

  const misComentarios = useMemo(
    () => misComentariosPorFecha(notasClase, chatNombre),
    [notasClase, chatNombre]
  )

  const notasCompartidasOtros = listarNotasCompartidasDelGrupo(
    notasClase,
    preferenciasCompartir,
    chatNombre,
    yoCompartoNotas
  )

  const comentariosOtrosDelDia = comentariosOtrosEnFecha(
    notasClase,
    preferenciasCompartir,
    chatNombre,
    selectedDate,
    yoCompartoNotas
  )

  async function handleCambiarCompartir(acepta: boolean) {
    if (!claseId || !chatNombre) return
    try {
      await guardarPreferenciaCompartir(claseId, chatNombre, acepta)
      if (!acepta) setShowModalOtros(false)
    } catch {
      setSyncError("No se pudo guardar tu preferencia de compartir notas.")
    }
  }

  function handleVerComentariosOtros() {
    if (!yoCompartoNotas) {
      setShowAvisoCompartir(true)
      return
    }
    setShowModalOtros(true)
  }

  useEffect(() => {
    const dias = getFechasSemana(semana)
    if (!dias.length) return
    const enRango = dias.some((d) => d.fecha === selectedDate)
    if (!enRango) {
      const fecha = getFechaDestacadaEnSemana(semana)
      setSelectedDate(fecha)
    }
  }, [semana, selectedDate])

  async function handleUnidoDesdeIndependiente(claseIdDestino: string, claseNombreDestino: string) {
    try {
      await unirseAClase(claseIdDestino, claseNombreDestino)
      const nueva: SesionUsuario = {
        rol: "alumno",
        nombre: chatNombre,
        claseId: claseIdDestino,
        claseNombre: claseNombreDestino,
      }
      guardarClaseLocal(claseIdDestino, claseNombreDestino)
      guardarSesion(nueva)
      guardarNombreChat(chatNombre)
      prepararSonidoChat()
      setSesion(nueva)
      setNotasClase({})
      setCargandoClase(true)
    } catch {
      alert("No se pudo entrar a la clase. Intenta de nuevo.")
    }
  }

  useEffect(() => {
    if (!esMaestro || !claseId || !sesionActiva || !chatNombre) return

    const datos = {
      nombreClase: claseNombre,
      maestroNombre: chatNombre,
      semana: sesionActiva.semana,
      fecha: sesionActiva.fecha,
      diaLabel: sesionActiva.diaLabel,
    }

    void marcarGrupoEnEstudio(claseId, datos)
    const id = window.setInterval(() => {
      void marcarGrupoEnEstudio(claseId, datos)
    }, 60_000)

    return () => {
      window.clearInterval(id)
      void quitarGrupoEnEstudio(claseId)
    }
  }, [esMaestro, claseId, sesionActiva, claseNombre, chatNombre])

  function handleEntrarSesion(nueva: SesionUsuario) {
    guardarNombreChat(nueva.nombre)
    prepararSonidoChat()
    setSesion(nueva)
    setNotasClase({})
    setCargandoClase(true)
  }

  async function handleGuardarComentario(fecha: string, texto: string) {
    if (!claseId || !chatNombre) return
    setGuardando(true)
    try {
      await guardarComentarioClase(claseId, fecha, texto, chatNombre, semana)
      const nota: NotaClase = { texto: texto.trim(), autor: chatNombre, semana }
      const docId = idDocumentoComentario(fecha, chatNombre)
      setNotasClase((prev) => {
        const n = { ...prev, [docId]: nota }
        guardarComentariosClaseLocal(claseId, n)
        return n
      })
      setComentario(texto.trim())
      setSyncError(null)
    } catch {
      const nota: NotaClase = { texto: texto.trim(), autor: chatNombre, semana }
      const docId = idDocumentoComentario(fecha, chatNombre)
      setNotasClase((prev) => {
        const n = { ...prev, [docId]: nota }
        guardarComentariosClaseLocal(claseId, n)
        return n
      })
      setSyncError("No se pudo sincronizar. Guardado en caché de este dispositivo.")
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminarComentario(fecha: string) {
    if (!claseId || !chatNombre) return
    setGuardando(true)
    try {
      await eliminarComentarioClase(claseId, fecha, chatNombre)
      const docId = idDocumentoComentario(fecha, chatNombre)
      setNotasClase((prev) => {
        const n = { ...prev }
        delete n[docId]
        guardarComentariosClaseLocal(claseId, n)
        return n
      })
      if (selectedDate === fecha) setComentario("")
      setSyncError(null)
    } catch {
      const docId = idDocumentoComentario(fecha, chatNombre)
      setNotasClase((prev) => {
        const n = { ...prev }
        delete n[docId]
        guardarComentariosClaseLocal(claseId, n)
        return n
      })
      setSyncError("No se pudo eliminar en la nube.")
    } finally {
      setGuardando(false)
    }
  }

  /** Misma acción que el botón «Lección»: PDF del día y pestaña lección en móvil */
  const irALeccionDelDia = useCallback(() => {
    setMaterialMaestroPdf(null)
    setTipo("leccion")
    setLeccionJump((n) => n + 1)
    setMobileTab("pdf")
  }, [])

  const handleIniciarEstudio = useCallback(async () => {
    const hoy = getEstudioDeHoy()
    setIniciandoEstudio(true)
    setSemana(hoy.semana)
    setSelectedDate(hoy.fecha)
    irALeccionDelDia()
    setComentario(misComentarios[hoy.fecha]?.texto ?? "")
    prepararSonidoChat()

    if (claseId && chatNombre) {
      try {
        await iniciarSesionEstudio(claseId, chatNombre, hoy.semana, hoy.fecha, claseNombre)
        await marcarGrupoEnEstudio(claseId, {
          nombreClase: claseNombre,
          maestroNombre: chatNombre,
          semana: hoy.semana,
          fecha: hoy.fecha,
          diaLabel: hoy.diaLabel,
        })
      } catch {
        // seguir aunque falle la nube
      }
    }

    setIniciandoEstudio(false)
  }, [claseId, chatNombre, misComentarios, irALeccionDelDia])

  const pdfUrl = `/pdfs/semana${semana}/${tipo === "leccion" ? "leccion" : tipo}.pdf`
  const pdfUrlActivo = materialMaestroPdf?.url ?? pdfUrl
  const pdfViewerKey = materialMaestroPdf
    ? `maestro-${materialMaestroPdf.url}`
    : tipo === "leccion"
      ? `${semana}-leccion-${leccionJump}`
      : `${semana}-${tipo}`

  if (!sesionListo) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted">
        Cargando…
      </div>
    )
  }

  if (!sesion) {
    return <PantallaAcceso onEntrar={handleEntrarSesion} />
  }

  const vistaPrincipal = (
    <div className="flex h-full min-h-0 w-full flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:flex-row lg:pb-0">
      {chatClaseActiva && (
        <AvisosEntradaClase claseId={claseId} nombre={chatNombre} esMaestro={esMaestro} />
      )}
      <div
        className={`layout-pdf-panel flex min-h-0 min-w-0 flex-col bg-slate-50 lg:border-r lg:border-border ${
          mobileTab === "pdf" ? "flex flex-1" : "hidden lg:flex"
        }`}
      >
        {esMaestro && materialMaestroPdf && (
          <div className="shrink-0 border-b border-amber-300/50 bg-gradient-to-r from-amber-50 to-accent-soft px-3 py-2.5 lg:px-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900/80">
              Material auxiliar (maestro)
            </p>
            <p className="text-sm font-medium text-primary">{materialMaestroPdf.titulo}</p>
            <button
              type="button"
              onClick={() => setMaterialMaestroPdf(null)}
              className="mt-1.5 text-xs font-medium text-primary underline"
            >
              ← Volver a la lección del trimestre
            </button>
          </div>
        )}
        {BibliaPasaje && (
          <div className="border-b border-accent/30 bg-accent-soft px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary/70 mb-1">
              Pasaje seleccionado
            </p>
            <p className="text-sm leading-relaxed text-slate-800 whitespace-pre-line">{BibliaPasaje}</p>
            <button
              type="button"
              onClick={() => setBibliaPasaje("")}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Cerrar
            </button>
          </div>
        )}
        <div className="relative min-h-0 flex-1 w-full">
          <MobilePdfControls scrollKey={pdfViewerKey}>
            {esMaestro && (
              <IniciarEstudioButton
                onIniciar={() => void handleIniciarEstudio()}
                cargando={iniciandoEstudio}
                sesionActiva={sesionActiva}
              />
            )}
            <LeccionControls
              semana={semana}
              setSemana={setSemana}
              tipo={tipo}
              setTipo={setTipo}
              onLeccionClick={irALeccionDelDia}
            />
          </MobilePdfControls>
          <PdfErrorBoundary url={pdfUrlActivo}>
            <PdfViewer
              key={pdfViewerKey}
              url={pdfUrlActivo}
              irAlDiaLectura={!materialMaestroPdf && tipo === "leccion"}
              semana={semana}
            />
          </PdfErrorBoundary>
        </div>
      </div>

      <aside
        className={`layout-sidebar-panel flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto custom-scroll bg-surface p-3 md:p-4 ${
          mobileTab === "estudio" ? "flex flex-1" : "hidden lg:flex"
        }`}
      >
        {esMaestro && (
          <div className="hidden lg:block">
            <IniciarEstudioButton
              onIniciar={() => void handleIniciarEstudio()}
              cargando={iniciandoEstudio}
              sesionActiva={sesionActiva}
            />
          </div>
        )}

        <div className="hidden lg:block">
          <LeccionControls
            semana={semana}
            setSemana={setSemana}
            tipo={tipo}
            setTipo={setTipo}
            onLeccionClick={irALeccionDelDia}
          />
        </div>

        {esMaestro && <PanelMaestro claseId={claseId} nombreMaestro={chatNombre} />}

        {esMaestro && (
          <MaterialesMaestro
            onVerEnPantalla={(url, titulo) => {
              setMaterialMaestroPdf({ url, titulo })
              setMobileTab("pdf")
            }}
          />
        )}

        <NotasPanel
          semana={semana}
          misComentarios={misComentarios}
          comentariosOtrosDelDia={comentariosOtrosDelDia}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          comentario={comentario}
          setComentario={setComentario}
          cargando={cargandoClase}
          syncError={syncError}
          guardando={guardando}
          editFecha={editFecha}
          editTexto={editTexto}
          setEditFecha={setEditFecha}
          setEditTexto={setEditTexto}
          onGuardar={handleGuardarComentario}
          onEliminar={handleEliminarComentario}
          onVerMisComentarios={() => setShowModal(true)}
          onVerComentariosOtros={handleVerComentariosOtros}
          yoCompartoNotas={yoCompartoNotas}
          onCambiarCompartir={handleCambiarCompartir}
        />

        <section className="flex min-h-[min(50vh,360px)] max-h-[min(55vh,480px)] flex-col custom-scroll overflow-y-auto rounded-xl border border-border bg-card p-3 shadow-sm lg:min-h-[320px] lg:max-h-[420px]">
          {modoIndependiente && (
            <UnirseAGrupoIndependiente
              nombre={chatNombre}
              onUnidoAClase={handleUnidoDesdeIndependiente}
            />
          )}
          <Biblia agregarVersiculo={agregarVersiculo} />
        </section>

        {isLg && chatClaseActiva && (
          <ComunicacionPanel
            claseId={claseId}
            nombre={chatNombre}
            activoChat
            className="hidden lg:flex lg:min-h-[320px] lg:max-h-[480px]"
          />
        )}
      </aside>

      {!isLg && mobileTab === "chat" && chatClaseActiva && (
        <div className="flex min-h-0 flex-1 flex-col bg-surface p-3 md:p-4 lg:hidden">
          <ComunicacionPanel
            claseId={claseId}
            nombre={chatNombre}
            activoChat
            className="min-h-0 flex-1"
          />
        </div>
      )}

      {chatClaseActiva && !isLg && mobileTab !== "chat" && <SalaAudioBarraFlotante />}

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-card shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navegación principal"
      >
        <button
          type="button"
          onClick={irALeccionDelDia}
          className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition active:bg-slate-100 ${
            mobileTab === "pdf" ? "text-primary bg-primary/5" : "text-slate-600"
          }`}
        >
          <span className="text-lg" aria-hidden>📄</span>
          Lección PDF
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("estudio")}
          className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition active:bg-slate-100 ${
            mobileTab === "estudio" ? "text-primary bg-primary/5" : "text-slate-600"
          }`}
        >
          <span className="text-lg" aria-hidden>📖</span>
          Biblia y notas
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("chat")}
          className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition active:bg-slate-100 ${
            mobileTab === "chat" ? "text-primary bg-primary/5" : "text-slate-600"
          }`}
        >
          <span className="relative text-lg" aria-hidden>
            💬
            {chatNoLeidos > 0 && (
              <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {chatNoLeidos > 9 ? "9+" : chatNoLeidos}
              </span>
            )}
          </span>
          Chat
        </button>
      </nav>

      {showAvisoCompartir && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setShowAvisoCompartir(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-lg font-semibold text-primary">Compartir para ver</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Para leer comentarios de maestros, alumnos o quien estudie en independiente en esta
              sala, primero marca <strong>Compartir mis comentarios</strong>. Si no aceptas, no verás
              los de los demás y ellos no verán los tuyos.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                className="min-h-11 rounded-xl bg-primary text-sm font-semibold text-white"
                onClick={() => {
                  void handleCambiarCompartir(true)
                  setShowAvisoCompartir(false)
                  setShowModalOtros(true)
                }}
              >
                Sí, compartir y ver comentarios
              </button>
              <button
                type="button"
                className="min-h-11 rounded-xl border border-border text-sm font-medium text-slate-600"
                onClick={() => setShowAvisoCompartir(false)}
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      )}

      {showModalOtros && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setShowModalOtros(false)}
        >
          <div
            className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border bg-primary px-5 py-4 text-white">
              <h2 className="font-display text-lg font-semibold">Comentarios del grupo</h2>
              <p className="mt-0.5 text-xs text-blue-100/80">
                Solo quien aceptó compartir · {claseNombre || "esta sala"}
              </p>
            </div>
            <button
              type="button"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
              onClick={() => setShowModalOtros(false)}
              aria-label="Cerrar"
            >
              ×
            </button>
            <div className="custom-scroll max-h-[60vh] overflow-y-auto p-5">
              {!yoCompartoNotas ? (
                <p className="text-center text-sm text-muted">
                  Activa &quot;Compartir mis comentarios&quot; para ver los de otros.
                </p>
              ) : notasCompartidasOtros.length === 0 ? (
                <p className="text-center text-sm text-muted">
                  Aún no hay comentarios compartidos de otros en esta sala, o nadie más aceptó
                  compartir.
                </p>
              ) : (
                notasCompartidasOtros.map(({ fecha, nota }) => (
                  <article
                    key={`o-${fecha}-${nota.autor}`}
                    className="mb-4 border-b border-border pb-4 last:mb-0"
                  >
                    <time className="text-xs font-semibold text-primary">
                      {formatDateDMY(fecha)}
                    </time>
                    {nota.autor && (
                      <span className="ml-2 text-[10px] font-medium text-slate-500">
                        · {nota.autor}
                      </span>
                    )}
                    <p className="mt-1 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                      {nota.texto}
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border bg-primary px-5 py-4 text-white">
              <h2 className="font-display text-lg font-semibold">Mis comentarios</h2>
              <p className="text-xs text-blue-100/80 mt-0.5">
                {claseNombre ? claseNombre : "Tu sala"}
              </p>
            </div>
            <button
              type="button"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition"
              onClick={() => setShowModal(false)}
              aria-label="Cerrar"
            >
              ×
            </button>
            <div className="custom-scroll max-h-[60vh] overflow-y-auto p-5">
              {Object.keys(misComentarios).length === 0 ? (
                <p className="text-center text-sm text-muted">Aún no has guardado comentarios.</p>
              ) : (
                Object.entries(misComentarios)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([fecha, nota]) => (
                    <article
                      key={`m-${fecha}`}
                      className="mb-4 border-b border-border pb-4 last:mb-0"
                    >
                      <time className="text-xs font-semibold text-primary">
                        {formatDateDMY(fecha)}
                      </time>
                      {!yoCompartoNotas && (
                        <span className="ml-2 text-[10px] text-amber-700">· solo tú lo ves</span>
                      )}
                      <p className="mt-1 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                        {nota.texto}
                      </p>
                    </article>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  if (chatClaseActiva) {
    return (
      <SalaAudioProvider claseId={claseId} nombre={chatNombre}>
        {vistaPrincipal}
      </SalaAudioProvider>
    )
  }

  return vistaPrincipal
}
