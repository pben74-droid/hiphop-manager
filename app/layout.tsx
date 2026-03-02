import "./globals.css"
import Link from "next/link"
import Image from "next/image"
import { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { MeseProvider } from "@/lib/MeseContext"

function Sidebar() {
  const pathname = usePathname()

  const linkStyle = (path: string) =>
    `px-3 py-2 rounded transition-all ${
      pathname === path
        ? "bg-yellow-500 text-black font-bold shadow-[0_0_15px_gold]"
        : "text-yellow-400 hover:bg-yellow-500 hover:text-black"
    }`

  return (
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
      <nav className="flex flex-col space-y-3">

        <Link href="/" className={linkStyle("/")}>
          Dashboard
        </Link>

        <Link href="/incassi" className={linkStyle("/incassi")}>
          Incassi
        </Link>

        <Link href="/spese" className={linkStyle("/spese")}>
          Spese
        </Link>

        <Link href="/insegnanti" className={linkStyle("/insegnanti")}>
          Insegnanti
        </Link>

        <Link href="/versamenti" className={linkStyle("/versamenti")}>
          Versamenti Soci
        </Link>

        <Link href="/affitto" className={linkStyle("/affitto")}>
          Affitto
        </Link>

        <Link href="/banca" className={linkStyle("/banca")}>
          Banca
        </Link>

        <Link href="/cassa" className={linkStyle("/cassa")}>
          Cassa
        </Link>

      </nav>
    </aside>
  )
}

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

            <Sidebar />

            <main className="flex-1 p-8 bg-gradient-to-br from-black via-neutral-900 to-black">
              {children}
            </main>

          </div>

        </MeseProvider>

      </body>
    </html>
  )
}
