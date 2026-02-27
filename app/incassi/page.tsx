"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { verificaMeseAperto, inizializzaMese } from "@/lib/gestioneMese"

export default function IncassiPage() {
  const [mese] = useState("2026-02") // rendiamo dinamico dopo
  const [descrizione, setDescrizione] = useState("")
  const [importo, setImporto] = useState("")
  const [contenitore, setContenitore] = useState("cassa_operativa")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    inizializzaMese(mese)
  }, [mese])

  const handleSubmit = async () => {
    try {
      setLoading(true)

      // 🔒 BLOCCO HARD
      await verificaMeseAperto(mese)

      const { error } = await supabase
        .from("movimenti_finanziari")
        .insert([
          {
            tipo: "incasso",
            categoria: "atleta",
            descrizione,
            importo: Number(importo),
            contenitore,
            mese,
            data: new Date().toISOString(),
          },
        ])

      if (error) throw error

      alert("Incasso registrato correttamente")

      setDescrizione("")
      setImporto("")

    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-10 text-white">
      <h1 className="text-3xl font-bold mb-6">Incassi</h1>

      <input
        type="text"
        placeholder="Descrizione"
        value={descrizione}
        onChange={(e) => setDescrizione(e.target.value)}
        className="block mb-4 p-3 bg-black border border-yellow-500 rounded w-full"
      />

      <input
        type="number"
        placeholder="Importo"
        value={importo}
        onChange={(e) => setImporto(e.target.value)}
        className="block mb-4 p-3 bg-black border border-yellow-500 rounded w-full"
      />

      <select
        value={contenitore}
        onChange={(e) => setContenitore(e.target.value)}
        className="block mb-6 p-3 bg-black border border-yellow-500 rounded w-full"
      >
        <option value="cassa_operativa">Cassa Operativa</option>
        <option value="banca">Banca</option>
      </select>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-yellow-500 text-black px-6 py-3 rounded hover:bg-yellow-400 transition"
      >
        {loading ? "Salvataggio..." : "Registra Incasso"}
      </button>
    </div>
  )
}
