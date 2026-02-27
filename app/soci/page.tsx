"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function SociPage() {
  const [soci, setSoci] = useState<any[]>([])
  const [nome, setNome] = useState("")
  const [percentuale, setPercentuale] = useState("")
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
      setErrore("Errore caricamento soci")
      return
    }

    setSoci(data || [])
  }

  const handleSubmit = async () => {
    setErrore("")

    if (!nome || !percentuale) {
      setErrore("Compila tutti i campi")
      return
    }

    if (editId) {
      const { error } = await supabase
        .from("soci")
        .update({
          nome,
          percentuale: Number(percentuale),
        })
        .eq("id", editId)

      if (error) {
        console.error(error)
        setErrore("Errore aggiornamento socio")
        return
      }

      setEditId(null)
    } else {
      const { error } = await supabase
        .from("soci")
        .insert([
          {
            nome,
            percentuale: Number(percentuale),
            credito_affitto: 0,
          },
        ])

      if (error) {
        console.error(error)
        setErrore("Errore inserimento socio")
        return
      }
    }

    setNome("")
    setPercentuale("")
    await caricaSoci()
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("soci")
      .delete()
      .eq("id", id)

    if (error) {
      console.error(error)
      setErrore("Errore eliminazione socio")
      return
    }

    caricaSoci()
  }

  const handleEdit = (s: any) => {
    setEditId(s.id)
    setNome(s.nome)
    setPercentuale(String(s.percentuale))
  }

  const totalePercentuali = soci.reduce(
    (acc, s) => acc + Number(s.percentuale),
    0
  )

  return (
    <div className="p-10 text-white">
      <h1 className="text-3xl font-bold mb-6">Gestione Soci</h1>

      {errore && (
        <div className="mb-4 text-red-400">
          {errore}
        </div>
      )}

      <div className="bg-black p-6 border border-yellow-500 rounded mb-10">
        <input
          type="text"
          placeholder="Nome socio"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="block mb-4 p-3 bg-black border border-yellow-500 rounded w-full"
        />

        <input
          type="number"
          placeholder="Percentuale"
          value={percentuale}
          onChange={(e) => setPercentuale(e.target.value)}
          className="block mb-4 p-3 bg-black border border-yellow-500 rounded w-full"
        />

        <button
          onClick={handleSubmit}
          className="bg-yellow-500 text-black px-6 py-3 rounded hover:bg-yellow-400 transition"
        >
          {editId ? "Aggiorna Socio" : "Aggiungi Socio"}
        </button>
      </div>

      <h2 className="text-xl mb-4">
        Totale Percentuali: {totalePercentuali}%
      </h2>

      <table className="w-full border border-yellow-500">
        <thead>
          <tr className="bg-yellow-500 text-black">
            <th className="p-2">Nome</th>
            <th className="p-2">Percentuale</th>
            <th className="p-2">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {soci.map((s) => (
            <tr key={s.id} className="border-t border-yellow-500">
              <td className="p-2">{s.nome}</td>
              <td className="p-2">{s.percentuale}%</td>
              <td className="p-2 space-x-2">
                <button
                  onClick={() => handleEdit(s)}
                  className="bg-blue-500 px-3 py-1 rounded"
                >
                  Modifica
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
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
