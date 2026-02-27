"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { verificaMeseAperto, inizializzaMese } from "@/lib/gestioneMese"

export default function SpesePage() {
  const [mese] = useState("2026-02")
  const [movimenti, setMovimenti] = useState<any[]>([])
  const [descrizione, setDescrizione] = useState("")
  const [importo, setImporto] = useState<string>("")
  const [contenitore, setContenitore] = useState("cassa_operativa")
  const [dataSpesa, setDataSpesa] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [loading, setLoading] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  useEffect(() => {
    inizializzaMese(mese)
    caricaMovimenti()
  }, [mese])

  const caricaMovimenti = async () => {
    const { data } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese)
      .eq("tipo", "spesa")
      .order("data", { ascending: false })

    setMovimenti(data || [])
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      await verificaMeseAperto(mese)

      const importoNegativo = -Math.abs(Number(importo))

      if (editId) {
        await supabase
          .from("movimenti_finanziari")
          .update({
            descrizione,
            importo: importoNegativo,
            contenitore,
            data: dataSpesa,
          })
          .eq("id", editId)

        setEditId(null)
      } else {
        await supabase.from("movimenti_finanziari").insert([
          {
            tipo: "spesa",
            categoria: "spesa_generica",
            descrizione,
            importo: importoNegativo,
            contenitore,
            mese,
            data: dataSpesa,
          },
        ])
      }

      setDescrizione("")
      setImporto("")
      caricaMovimenti()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await verificaMeseAperto(mese)

      await supabase
        .from("movimenti_finanziari")
        .delete()
        .eq("id", id)

      caricaMovimenti()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleEdit = (mov: any) => {
    setEditId(mov.id)
    setDescrizione(mov.descrizione)
    setImporto(String(Math.abs(mov.importo))) // 🔥 FIX QUI
    setContenitore(mov.contenitore)
    setDataSpesa(mov.data)
  }

  return (
    <div className="p-10 text-white">
      <h1 className="text-3xl font-bold mb-6">Spese Operative</h1>

      <div className="bg-black p-6 rounded mb-10 border border-yellow-500">
        <input
          type="date"
          value={dataSpesa}
          onChange={(e) => setDataSpesa(e.target.value)}
          className="block mb-4 p-3 bg-black border border-yellow-500 rounded w-full"
        />

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
          {editId ? "Aggiorna Spesa" : "Registra Spesa"}
        </button>
      </div>

      <h2 className="text-2xl mb-4">Spese del mese</h2>

      <table className="w-full border border-yellow-500">
        <thead>
          <tr className="bg-yellow-500 text-black">
            <th className="p-2">Data</th>
            <th className="p-2">Descrizione</th>
            <th className="p-2">Importo</th>
            <th className="p-2">Contenitore</th>
            <th className="p-2">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {movimenti.map((mov) => (
            <tr key={mov.id} className="border-t border-yellow-500">
              <td className="p-2">{mov.data}</td>
              <td className="p-2">{mov.descrizione}</td>
              <td className="p-2">{mov.importo} €</td>
              <td className="p-2">{mov.contenitore}</td>
              <td className="p-2 space-x-2">
                <button
                  onClick={() => handleEdit(mov)}
                  className="bg-blue-500 px-3 py-1 rounded"
                >
                  Modifica
                </button>
                <button
                  onClick={() => handleDelete(mov.id)}
                  className="bg-red-500 px-3 py-1 rounded"
                >
                  Elimina
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
