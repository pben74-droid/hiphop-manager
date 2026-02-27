"use client"

import { useState } from "react"

export default function ChiusuraPage() {
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const mese = "2026-02" // rendiamo dinamico dopo

  const handleChiusura = async () => {
    try {
      setLoading(true)

      const res = await fetch("/api/chiudi-mese", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mese, password })
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error)
        return
      }

      alert("Mese chiuso correttamente")

    } catch (err: any) {
      alert("Errore imprevisto")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-10 text-white">
      <h1 className="text-3xl font-bold mb-6">Chiusura Mese</h1>

      <input
        type="password"
        placeholder="Password riapertura"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mb-4 p-2 bg-black border border-yellow-500 rounded w-full"
      />

      <button
        onClick={handleChiusura}
        disabled={loading}
        className="bg-yellow-500 text-black px-6 py-3 rounded hover:bg-yellow-400"
      >
        {loading ? "Chiusura..." : "Chiudi Mese"}
      </button>
    </div>
  )
}
