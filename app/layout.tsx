"use client"

import "./globals.css"
import Link from "next/link"
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

            {/* SIDEBAR */}
            <aside className="w-64 bg-black border-r border-yellow-500 p-6 space-y-6">

              <div className="text-2xl font-bold text-yellow-500">
                HIP HOP FAMILY
              </div>

              <nav className="flex flex-col space-y-3">

                <Link href="/" className="hover:text-yellow-500">
                  Dashboard
                </Link>

                <Link href="/incassi" className="hover:text-yellow-500">
                  Incassi
                </Link>

                <Link href="/spese" className="hover:text-yellow-500">
                  Spese
                </Link>

                <Link href="/insegnanti" className="hover:text-yellow-500">
                  Insegnanti
                </Link>

                <Link href="/versamenti" className="hover:text-yellow-500">
                  Versamenti Soci
                </Link>

                <Link href="/affitto" className="hover:text-yellow-500">
                  Affitto
                </Link>

                <Link href="/banca" className="hover:text-yellow-500">
                  Banca
                </Link>

                <Link href="/cassa" className="hover:text-yellow-500">
                  Cassa
                </Link>

              </nav>
            </aside>

            {/* CONTENUTO */}
            <main className="flex-1 p-8">
              {children}
            </main>

          </div>

        </MeseProvider>

      </body>
    </html>
  )
}
