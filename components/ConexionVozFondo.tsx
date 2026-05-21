"use client"

import SalaVozPanel from "@/components/SalaVozPanel"

/** Una sola conexión Jitsi en segundo plano (móvil en Lección PDF) */
export default function ConexionVozFondo({
  claseId,
  nombre,
  onSalaVozChange,
}: {
  claseId: string
  nombre: string
  onSalaVozChange: (enSala: boolean) => void
}) {
  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-[-1] h-[min(100dvh,420px)] w-[min(100vw,480px)] max-w-[480px] overflow-hidden opacity-0"
      aria-hidden
    >
      <SalaVozPanel
        claseId={claseId}
        nombre={nombre}
        vozAutomatica
        visible={false}
        onSalaVozChange={onSalaVozChange}
        className="h-full min-h-[360px] w-full"
      />
    </div>
  )
}
