"use client"

import Link from "next/link"

export default function Dashboard() {
  return (
    <div className="p-10 text-white">
      <h1 className="text-4xl font-bold mb-10">
        HIP HOP FAMILY MANAGER
      </h1>

      <div className="grid grid-cols-2 gap-6">

        <Link href="/incassi">
          <div className="bg-black border border-yellow-500 p-6 rounded hover:bg-yellow-500 hover:text-black transition cursor-pointer">
            💰 Incassi
          </div>
        </Link>

        <Link href="/spese">
          <div className="bg-black border border-yellow-500 p-6 rounded hover:bg-yellow-500 hover:text-black transition cursor-pointer">
            🧾 Spese
          </div>
        </Link>

        <Link href="/soci">
          <div className="bg-black border border-yellow-500 p-6 rounded hover:bg-yellow-500 hover:text-black transition cursor-pointer">
            👥 Gestione Soci
          </div>
        </Link>

        <Link href="/chiusura">
          <div className="bg-black border border-yellow-500 p-6 rounded hover:bg-yellow-500 hover:text-black transition cursor-pointer">
            🔒 Chiusura Mese
          </div>
        </Link>

      </div>
    </div>
  )
}
