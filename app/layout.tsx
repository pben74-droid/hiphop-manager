import "./globals.css"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MeseProvider } from "@/lib/MeseContext"

function Sidebar() {
  const pathname = usePathname()

  const linkClass = (path: string) =>
    `block px-4 py-2 rounded transition ${
      pathname === path
        ? "bg-yellow-500 text-black font-bold shadow-lg"
        : "hover:bg-yellow-500 hover:text-black"
    }`

  return (
    <aside className="w-64 bg-black border-r border-yellow-500 flex flex-col p-6">

      {/* Logo */}
      <div className="mb-10 text-center">
        <img
          src="/LOGO_DEFINITIVO_TRASPARENTE.png"
          alt="Logo"
          className="mx-auto mb-4"
        />
        <h1 className="text-yellow-500 font-bold text-lg tracking-wider">
          HIP HOP FAMILY
        </h1>
      </div>

      {/* Navigation */}
      <nav className="space-y-3 text-white">

        <Link href="/" className={linkClass("/")}>
          Dashboard
        </Link>

        <Link href="/incassi" className={linkClass("/incassi")}>
          Incassi
        </Link>

        <Link href="/spese" className={linkClass("/spese")}>
          Spese
        </Link>

        <Link href="/soci" className={linkClass("/soci")}>
          Soci
        </Link>

        <Link href="/versamenti" className={linkClass("/versamenti")}>
          Versamenti
        </Link>

        <Link href="/affitto" className={linkClass("/affitto")}>
          Affitto
        </Link>

        <Link href="/chiusura" className={linkClass("/chiusura")}>
          Chiusura Mese
        </Link>

      </nav>

      <div className="mt-auto text-xs text-gray-500 text-center">
        Gestionale interno
      </div>
    </aside>
  )
}

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

            <Sidebar />

            <main className="flex-1 p-10">
              {children}
            </main>

          </div>

        </MeseProvider>

      </body>
    </html>
  )
}
