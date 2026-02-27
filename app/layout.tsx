"use client";

import Link from "next/link";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body style={{ margin: 0, fontFamily: "Arial" }}>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          
          {/* MENU LATERALE */}
          <div
            style={{
              width: 220,
              background: "#111",
              color: "#FFD700",
              padding: 20,
            }}
          >
            <h2>HIP HOP MANAGER</h2>

            <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link href="/">Dashboard</Link>
              <Link href="/incassi">Incassi</Link>
              <Link href="/spese">Spese</Link>
              <Link href="/soci">Soci</Link>
              <Link href="/affitto">Affitto</Link>
              <Link href="/finanza">Finanza</Link>
              <Link href="/certificati">Certificati</Link>
            </nav>
          </div>

          {/* CONTENUTO */}
          <div style={{ flex: 1, padding: 30 }}>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
