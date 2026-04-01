"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ChiusuraPage() {
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [mese, setMese] = useState<string | null>(null)

  const router = useRouter()

  // 👉 carica mese attivo dal DB
  useEffect(() => {
    const caricaMese = async () => {
      const res = await fetch("/api/mese-attivo")
      const data = await res.json()
      setMese(data.mese)
    }

    caricaMese()
  }, [])

  if (!mese) {
    return <div className="p-10 text-white">Caricamento mese...</div>
  }

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

      // 👉 vai al nuovo mese
      router.push(`/dashboard?mese=${data.meseSuccessivo}`)

    } catch (err: any) {
      alert("Errore imprevisto")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-10 text-white">
      <h1 className="text-3xl font-bold mb-6">Chiusura Mese</h1>

      <p className="mb-4 text-yellow-400">
        Mese attuale: <strong>{mese}</strong>
      </p>

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
