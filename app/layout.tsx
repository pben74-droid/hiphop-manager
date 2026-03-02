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
      <body className="bg-black text-white">

        <MeseProvider>

          <div className="flex min-h-screen">

            <aside className="w-64 bg-black border-r border-yellow-500 p-6 flex flex-col">

              {/* LOGO */}
              <div className="mb-8 flex justify-center">
                <Image
                  src="/LOGO_DEFINITIVO_TRASPARENTE.png"
                  alt="Hip Hop Family"
                  width={160}
                  height={160}
                  priority
                />
              </div>

              {/* MENU */}
              <nav className="flex flex-col space-y-3 text-yellow-400 text-sm">

                {/* SEZIONE CONTROLLO */}
                <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">
                  Controllo
                </div>

                <Link href="/" className="hover:text-yellow-500 transition">
                  Dashboard
                </Link>

                <Link href="/report" className="hover:text-yellow-500 transition">
                  Report PDF
                </Link>

                <div className="border-t border-yellow-500 my-4 opacity-30" />

                {/* SEZIONE OPERATIVA */}
                <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">
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

                <Link href="/versamenti" className="hover:text-yellow-500 transition">
                  Versamenti Soci
                </Link>

                <Link href="/affitto" className="hover:text-yellow-500 transition">
                  Affitto
                </Link>

                <div className="border-t border-yellow-500 my-4 opacity-30" />

                {/* SEZIONE FINANZIARIA */}
                <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">
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

            <main className="flex-1 p-8 bg-gradient-to-br from-black via-neutral-900 to-black">
              {children}
            </main>

          </div>

        </MeseProvider>

      </body>
    </html>
  )
}
