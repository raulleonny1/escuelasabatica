import "./globals.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="m-0 p-0">
        <div className="flex flex-col min-h-screen">
          {/* Header */}
          <header className="bg-blue-900 text-white p-4">
            <h1 className="text-2xl font-bold">📖 Escuela Sabática</h1>
            <p className="text-sm opacity-80">Lección del trimestre | Estudio Bíblico Diario</p>
          </header>

          {/* Contenedor principal */}
          <div className="flex flex-1 justify-center overflow-auto p-4 bg-gray-50">
            <div className="flex w-full max-w-[1200px] h-full border rounded shadow bg-white">
              {children}
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}