"use client"

import { useEffect, useRef } from "react"
import { getPresenceDocId, subscribePresenciaCompleta } from "@/lib/chat"
import {
  notificarEntradaAlumno,
  prepararSonidoChat,
  reproducirSonidoEntradaAlumno,
  solicitarPermisoNotificaciones,
} from "@/lib/chatNotificaciones"

interface AvisosEntradaClaseProps {
  claseId: string
  nombre: string
  esMaestro: boolean
}

/** Avisa al maestro con sonido cuando un alumno entra a la app */
export default function AvisosEntradaClase({
  claseId,
  nombre,
  esMaestro,
}: AvisosEntradaClaseProps) {
  const conocidosRef = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (!esMaestro || !claseId || !nombre.trim()) return

    prepararSonidoChat()
    void solicitarPermisoNotificaciones()

    const miId = getPresenceDocId(nombre)
    const miLower = nombre.trim().toLowerCase()

    return subscribePresenciaCompleta(
      claseId,
      (conectados) => {
        const otros = conectados.filter(
          (u) =>
            u.presenceId !== miId && u.nombre.trim().toLowerCase() !== miLower
        )
        const ids = new Set(otros.map((u) => u.presenceId))

        if (conocidosRef.current === null) {
          conocidosRef.current = ids
          return
        }

        const nuevos = otros.filter((u) => !conocidosRef.current!.has(u.presenceId))
        conocidosRef.current = ids

        for (const u of nuevos) {
          reproducirSonidoEntradaAlumno()
          notificarEntradaAlumno(u.nombre)
        }
      },
      () => {}
    )
  }, [claseId, nombre, esMaestro])

  return null
}
