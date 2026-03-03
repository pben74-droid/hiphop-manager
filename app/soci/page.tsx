"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function SociPage() {
  const [soci, setSoci] = useState<any[]>([])
  const [nome, setNome] = useState("")
  const [quotaPercentuale, setQuotaPercentuale] = useState("")
  const [editId, setEditId] = useState<string | null>(null)
  const [errore, setErrore] = useState("")

  useEffect(() => {
    caricaSoci()
  }, [])

  const caricaSoci = async () => {
    const { data, error } = await supabase
      .from("soci")
      .select("*")
      .order("nome")

    if (error) {
      console.error(error)
      setErrore(error.message)
      return
    }

    setSoci(data || [])
  }

  const handleSubmit = async () => {
    setErrore("")

    if (!nome || !quotaPercentuale) {
      setErrore("Compila tutti i campi")
      return
    }

    if (editId) {
      const { error } = await supabase
        .from("soci")
        .update({
          nome,
          quota_percentuale: Number(quotaPercentuale),
        })
        .eq("id", editId)

      if (error) {
        console.error(error)
        setErrore(error.message)
        return
      }

      setEditId(null)
    } else {
      const { error } = await supabase
        .from("soci")
        .insert([
          {
            nome,
            quota_percentuale: Number(quotaPercentuale),
          },
        ])

      if (error) {
        console.error(error)
        setErrore(error.message)
        return
      }
    }

    setNome("")
    setQuotaPercentuale("")
    await caricaSoci()
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("soci")
      .delete()
      .eq("id", id)

    if (error) {
      console.error(error)
      setErrore(error.message)
      return
    }

    caricaSoci()
  }

  const handleEdit = (s: any) => {
    setEditId(s.id)
    setNome(s.nome)
    setQuotaPercentuale(String(s.quota_percentuale))
  }

  const totalePercentuali = soci.reduce(
    (acc, s) => acc + Number(s.quota_percentuale),
    0
  )

  return (
    <div className="p-10">

      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        Gestione Soci
      </h1>

      {errore && (
        <div className="mb-4 text-red-600 font-semibold">
          {errore}
        </div>
      )}

      {/* FORM */}
      <div className="bg-white p-6 border border-gray-300 rounded shadow-sm mb-10">

        <input
          type="text"
          placeholder="Nome socio"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="block mb-4 p-3 bg-white text-gray-900 border border-gray-300 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />

        <input
          type="number"
          placeholder="Quota percentuale"
          value={quotaPercentuale}
          onChange={(e) => setQuotaPercentuale(e.target.value)}
          className="block mb-4 p-3 bg-white text-gray-900 border border-gray-300 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />

        <button
          onClick={handleSubmit}
          className="bg-yellow-500 text-black px-6 py-3 rounded hover:bg-yellow-400 transition font-semibold"
        >
          {editId ? "Aggiorna Socio" : "Aggiungi Socio"}
        </button>

      </div>

      <h2 className="text-xl mb-4 font-semibold text-gray-900">
        Totale Percentuali: {totalePercentuali}%
      </h2>

      {/* TABELLA */}
      <div className="bg-white border border-gray-300 rounded shadow-sm overflow-hidden">
        <table className="w-full">

          <thead>
            <tr className="bg-gray-100 text-gray-800">
              <th className="p-3 text-left">Nome</th>
              <th className="p-3 text-left">Quota %</th>
              <th className="p-3 text-left">Azioni</th>
            </tr>
          </thead>

          <tbody>
            {soci.map((s) => (
              <tr key={s.id} className="border-t border-gray-200 hover:bg-gray-50">
                <td className="p-3 text-gray-900">
                  {s.nome}
                </td>
                <td className="p-3 text-gray-900">
                  {s.quota_percentuale}%
                </td>
                <td className="p-3 space-x-2">
                  <button
                    onClick={() => handleEdit(s)}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                  >
                    Modifica
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                  >
                    Elimina
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>

    </div>
  )
}
