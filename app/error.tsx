"use client"

import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Error en la aplicación:", error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="font-display text-xl font-semibold text-primary">Algo salió mal</h2>
      <p className="max-w-md text-sm text-slate-600">
        Ocurrió un error al cargar la aplicación. Puedes intentar de nuevo.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="min-h-11 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white active:opacity-90"
      >
        Reintentar
      </button>
    </div>
  )
}
