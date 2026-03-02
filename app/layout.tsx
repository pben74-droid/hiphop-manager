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

            <aside className="w-64 bg-black border-r border-yellow-500 p-6 space-y-6">

              <div className="text-2xl font-bold text-yellow-500">
                HIP HOP FAMILY
              </div>

              <nav className="flex flex-col space-y-3">
                <Link href="/">Dashboard</Link>
                <Link href="/incassi">Incassi</Link>
                <Link href="/spese">Spese</Link>
                <Link href="/insegnanti">Insegnanti</Link>
                <Link href="/versamenti">Versamenti Soci</Link>
                <Link href="/affitto">Affitto</Link>
                <Link href="/banca">Banca</Link>
                <Link href="/cassa">Cassa</Link>
              </nav>

            </aside>

            <main className="flex-1 p-8">
              {children}
            </main>

          </div>

        </MeseProvider>

      </body>
    </html>
  )
}
