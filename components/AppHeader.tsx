"use client"

import ChatEnLineaIndicador from "@/components/ChatEnLineaIndicador"
import PwaInstallButton from "@/components/PwaInstallButton"

export default function AppHeader() {
  return (
    <header className="relative shrink-0 overflow-hidden bg-gradient-to-r from-primary-dark via-primary to-primary-light text-white shadow-lg">
      <div
        className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_50%,#c9a227_0%,transparent_50%)]"
        aria-hidden
      />
      <div className="relative flex items-center gap-2 border-b-4 border-accent px-3 py-2.5 sm:gap-3 sm:px-4 md:gap-4 md:px-8 md:py-4">
        <div className="min-w-0 flex-1 sm:max-w-[38%] lg:max-w-none lg:flex-none">
          <h1 className="font-display text-lg font-semibold tracking-tight sm:text-xl md:text-3xl">
            Escuela Sabática
          </h1>
          <p className="mt-0.5 text-xs text-blue-100/90 sm:text-sm md:mt-1 md:text-base">
            Lección del trimestre · Estudio bíblico diario
          </p>
          <ChatEnLineaIndicador placement="mobile" />
          <PwaInstallButton />
        </div>

        <ChatEnLineaIndicador placement="desktop" />

        <div className="relative ml-auto h-12 w-24 shrink-0 sm:h-14 sm:w-28 md:h-20 md:w-44 lg:h-24 lg:w-52">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/segundo_trimestre.png"
            alt="Segundo trimestre 2026"
            className="h-full w-full object-contain object-right"
          />
        </div>
      </div>
    </header>
  )
}
