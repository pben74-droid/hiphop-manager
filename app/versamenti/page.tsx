"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { verificaMeseAperto, inizializzaMese } from "@/lib/gestioneMese"

export default function VersamentiPage() {
  const oggi = new Date()
  const meseCorrente = `${oggi.getFullYear()}-${String(
    oggi.getMonth() + 1
  ).padStart(2, "0")}`

  const [mese] = useState(meseCorrente)
  const [soci, setSoci] = useState<any[]>([])
  const [versamenti, setVersamenti] = useState<any[]>([])
  const [socioId, setSocioId] = useState("")
  const [importo, setImporto] = useState("")
  const [dataVersamento, setDataVersamento] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [editId, setEditId] = useState<string | null>(null)
  const [errore, setErrore] = useState("")

  useEffect(() => {
    inizializzaMese(mese)
    caricaSoci()
    caricaVersamenti()
  }, [])

  const caricaSoci = async () => {
    const { data } = await supabase
      .from("soci")
      .select("*")
      .order("nome")

    setSoci(data || [])
  }

  const caricaVersamenti = async () => {
    const { data } = await supabase
      .from("versamenti_soci")
      .select("*")
      .eq("mese", mese)
      .order("data", { ascending: false })

    setVersamenti(data || [])
  }

  const handleSubmit = async () => {
    setErrore("")

    if (!socioId || !importo) {
      setErrore("Compila tutti i campi")
      return
    }

    try {
      await verificaMeseAperto(mese)

      if (editId) {
        await supabase
          .from("versamenti_soci")
          .update({
            socio_id: socioId,
            importo: Number(importo),
            data: dataVersamento,
          })
          .eq("id", editId)

        setEditId(null)
      } else {
        await supabase
          .from("versamenti_soci")
          .insert([
            {
              socio_id: socioId,
              importo: Number(importo),
              mese,
              data: dataVersamento,
            },
          ])
      }

      setImporto("")
      setSocioId("")
      caricaVersamenti()
    } catch (err: any) {
      setErrore(err.message)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await verificaMeseAperto(mese)

      await supabase
        .from("versamenti_soci")
        .delete()
        .eq("id", id)

      caricaVersamenti()
    } catch (err: any) {
      setErrore(err.message)
    }
  }

  const handleEdit = (v: any) => {
    setEditId(v.id)
    setSocioId(v.socio_id)
    setImporto(String(v.importo))
    setDataVersamento(v.data)
  }

  const getNomeSocio = (id: string) => {
    const socio = soci.find((s) => s.id === id)
    return socio ? socio.nome : ""
  }

  return (
    <div className="p-10 text-white">
      <h1 className="text-3xl font-bold mb-6">Versamenti Soci</h1>

      {errore && <div className="mb-4 text-red-400">{errore}</div>}

      <div className="bg-black p-6 border border-yellow-500 rounded mb-10">

        <input
          type="date"
          value={dataVersamento}
          onChange={(e) => setDataVersamento(e.target.value)}
          className="block mb-4 p-3 bg-black border border-yellow-500 rounded w-full"
        />

        <select
          value={socioId}
          onChange={(e) => setSocioId(e.target.value)}
          className="block mb-4 p-3 bg-black border border-yellow-500 rounded w-full"
        >
          <option value="">Seleziona socio</option>
          {soci.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Importo"
          value={importo}
          onChange={(e) => setImporto(e.target.value)}
          className="block mb-4 p-3 bg-black border border-yellow-500 rounded w-full"
        />

        <button
          onClick={handleSubmit}
          className="bg-yellow-500 text-black px-6 py-3 rounded hover:bg-yellow-400 transition"
        >
          {editId ? "Aggiorna Versamento" : "Registra Versamento"}
        </button>
      </div>

      <h2 className="text-xl mb-4">Versamenti del mese</h2>

      <table className="w-full border border-yellow-500">
        <thead>
          <tr className="bg-yellow-500 text-black">
            <th className="p-2">Data</th>
            <th className="p-2">Socio</th>
            <th className="p-2">Importo</th>
            <th className="p-2">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {versamenti.map((v) => (
            <tr key={v.id} className="border-t border-yellow-500">
              <td className="p-2">{v.data}</td>
              <td className="p-2">{getNomeSocio(v.socio_id)}</td>
              <td className="p-2">{v.importo} €</td>
              <td className="p-2 space-x-2">
                <button
                  onClick={() => handleEdit(v)}
                  className="bg-blue-500 px-3 py-1 rounded"
                >
                  Modifica
                </button>
                <button
                  onClick={() => handleDelete(v.id)}
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
