import "./globals.css"
import Link from "next/link"
import Image from "next/image"
import { ReactNode } from "react"
import { MeseProvider } from "@/lib/MeseContext"

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="it">
      <body className="bg-gray-100 text-gray-900">

        <MeseProvider>

          <div className="flex min-h-screen">

            {/* SIDEBAR */}
            <aside className="w-64 bg-gray-900 text-yellow-400 border-r border-gray-800 p-6 flex flex-col shadow-lg">

              {/* LOGO */}
              <div className="mb-8 flex justify-center">
                <Image
                  src="/LOGO_DEFINITIVO_TRASPARENTE.png"
                  alt="Hip Hop Family"
                  width={150}
                  height={150}
                  priority
                />
              </div>

              {/* MENU */}
              <nav className="flex flex-col space-y-3 text-sm">

                {/* SEZIONE CONTROLLO */}
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                  Controllo
                </div>

                <Link href="/" className="hover:text-yellow-500 transition">
                  Dashboard
                </Link>

                <Link href="/report" className="hover:text-yellow-500 transition">
                  Report PDF
                </Link>

                <div className="border-t border-gray-700 my-4 opacity-40" />

                {/* SEZIONE OPERATIVA */}
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                  Operativo
                </div>

                <Link href="/incassi" className="hover:text-yellow-500 transition">
                  Incassi
                </Link>

                <Link href="/spese" className="hover:text-yellow-500 transition">
                  Spese
                </Link>

                <Link href="/insegnanti" className="hover:text-yellow-500 transition">
                  Insegnanti
                </Link>

                <Link href="/soci" className="hover:text-yellow-500 transition">
                  Soci
                </Link>

                <Link href="/versamenti" className="hover:text-yellow-500 transition">
                  Versamenti Soci
                </Link>

                <Link href="/affitto" className="hover:text-yellow-500 transition">
                  Affitto
                </Link>

                <div className="border-t border-gray-700 my-4 opacity-40" />

                {/* SEZIONE FINANZIARIA */}
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                  Finanziario
                </div>

                <Link href="/banca" className="hover:text-yellow-500 transition">
                  Banca
                </Link>

                <Link href="/cassa" className="hover:text-yellow-500 transition">
                  Cassa
                </Link>

                <Link href="/trasferimenti" className="hover:text-blue-400 transition">
                  Trasferimenti
                </Link>

              </nav>

            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 p-10 bg-gray-50">
              {children}
            </main>

          </div>

        </MeseProvider>

      </body>
    </html>
  )
}
