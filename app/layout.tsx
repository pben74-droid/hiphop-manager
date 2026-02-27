import "./globals.css"
import { MeseProvider } from "@/lib/MeseContext"
import Link from "next/link"

export const metadata = {
  title: "Hip Hop Family Manager",
  description: "Gestionale interno professionale",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body className="bg-black text-white">

        <MeseProvider>

          <div className="flex min-h-screen">

            {/* Sidebar */}
            <aside className="w-64 bg-black border-r border-yellow-500 p-6 space-y-6">

              <h1 className="text-xl font-bold text-yellow-500">
                HIP HOP FAMILY
              </h1>

              <nav className="space-y-4">

                <Link href="/">
                  <div className="hover:text-yellow-400 cursor-pointer">
                    Dashboard
                  </div>
                </Link>

                <Link href="/incassi">
                  <div className="hover:text-yellow-400 cursor-pointer">
                    Incassi
                  </div>
                </Link>

                <Link href="/spese">
                  <div className="hover:text-yellow-400 cursor-pointer">
                    Spese
                  </div>
                </Link>

                <Link href="/soci">
                  <div className="hover:text-yellow-400 cursor-pointer">
                    Soci
                  </div>
                </Link>

                <Link href="/versamenti">
                  <div className="hover:text-yellow-400 cursor-pointer">
                    Versamenti
                  </div>
                </Link>

                <Link href="/chiusura">
                  <div className="hover:text-yellow-400 cursor-pointer">
                    Chiusura Mese
                  </div>
                </Link>

              </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-10">
              {children}
            </main>

          </div>

        </MeseProvider>

      </body>
    </html>
  )
}
