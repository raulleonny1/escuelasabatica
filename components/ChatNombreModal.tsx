"use client"

import { useState } from "react"

interface ChatNombreModalProps {
  onConfirm: (nombre: string) => void
}

export default function ChatNombreModal({ onConfirm }: ChatNombreModalProps) {
  const [nombre, setNombre] = useState("")
  const [error, setError] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const limpio = nombre.trim()
    if (limpio.length < 2) {
      setError("Escribe al menos 2 caracteres.")
      return
    }
    if (limpio.length > 32) {
      setError("Máximo 32 caracteres.")
      return
    }
    onConfirm(limpio)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-nombre-titulo"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl"
      >
        <h2 id="chat-nombre-titulo" className="font-display text-lg font-semibold text-primary">
          Bienvenido al chat
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Para conversar con quienes estén estudiando ahora, escribe cómo te llamas.
        </p>
        <label className="mt-4 block text-xs font-medium text-slate-500" htmlFor="chat-nombre">
          Tu nombre
        </label>
        <input
          id="chat-nombre"
          type="text"
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value)
            setError("")
          }}
          placeholder="Ej. María"
          maxLength={32}
          autoComplete="nickname"
          autoFocus
          className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-3 text-base text-slate-800 shadow-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          className="mt-4 min-h-12 w-full rounded-lg bg-primary py-3 text-base font-medium text-white shadow-md shadow-primary/20 active:opacity-90"
        >
          Entrar al chat
        </button>
      </form>
    </div>
  )
}
