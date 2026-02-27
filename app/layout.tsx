"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <html lang="it">
      <body className="bg-black text-white">

        <div className="flex min-h-screen">

          {/* SIDEBAR */}
          <aside className="w-64 bg-zinc-950 border-r border-yellow-500/40 p-6 flex flex-col">

            {/* LOGO */}
            <div className="flex items-center gap-3 mb-12">
              <img
                src="/LOGO_DEFINITIVO_TRASPARENTE.png"
                alt="Logo"
                className="w-16 h-auto object-contain drop-shadow-[0_0_12px_rgba(255,215,0,0.6)]"
              />
              <div>
                <p className="text-yellow-500 font-extrabold tracking-widest text-lg">
                  HIP HOP
                </p>
                <p className="text-zinc-400 text-xs tracking-widest">
                  FAMILY MANAGER
                </p>
              </div>
            </div>

            {/* MENU */}
            <nav className="flex flex-col gap-2 text-sm font-medium">

              <MenuLink href="/" label="Dashboard" pathname={pathname} />
              <MenuLink href="/incassi" label="Incassi" pathname={pathname} />
              <MenuLink href="/spese" label="Spese" pathname={pathname} />
              <MenuLink href="/insegnanti" label="Insegnanti" pathname={pathname} />
              <MenuLink href="/versamenti" label="Versamenti Soci" pathname={pathname} />
              <MenuLink href="/affitto" label="Affitto" pathname={pathname} />
              <MenuLink href="/report" label="Report PDF" pathname={pathname} />
              <MenuLink href="/certificati" label="Certificati Medici" pathname={pathname} />
              <MenuLink href="/chiusura" label="Chiusura Mese" pathname={pathname} red />

            </nav>

            <div className="mt-auto pt-10 text-xs text-zinc-500">
              © {new Date().getFullYear()} Hip Hop Family
            </div>

          </aside>

          {/* CONTENUTO */}
          <main className="flex-1 p-10 bg-gradient-to-br from-black to-zinc-900">
            {children}
          </main>

        </div>

      </body>
    </html>
  );
}

function MenuLink({
  href,
  label,
  pathname,
  red = false,
}: {
  href: string;
  label: string;
  pathname: string;
  red?: boolean;
}) {
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`
        px-3 py-2 rounded-md transition-all duration-200
        ${
          red
            ? active
              ? "bg-red-600/20 text-red-400 border-l-4 border-red-500"
              : "text-red-500 hover:bg-red-500/10 hover:text-red-400"
            : active
            ? "bg-yellow-500/10 text-yellow-400 border-l-4 border-yellow-500 shadow-gold"
            : "hover:bg-yellow-500/10 hover:text-yellow-500"
        }
      `}
    >
      {label}
    </Link>
  );
}
