"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useMese } from "@/lib/MeseContext"
import { verificaMeseChiuso } from "@/lib/gestioneMese"

export default function SpesePage() {

  const { mese } = useMese()

  const [descrizione, setDescrizione] = useState("")
  const [importo, setImporto] = useState("")
  const [contenitore, setContenitore] = useState("cassa_operativa")
  const [dataSpesa, setDataSpesa] = useState("")
  const [spese, setSpese] = useState<any[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [meseChiuso, setMeseChiuso] = useState(false)

  useEffect(() => {
    caricaSpese()
    controllaMese()
  }, [mese])

  const controllaMese = async () => {
    const chiuso = await verificaMeseChiuso(mese)
    setMeseChiuso(chiuso)
  }

  const caricaSpese = async () => {
    const { data } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese)
      .eq("tipo", "spesa")
      .order("data", { ascending: false })

    setSpese(data || [])
  }

  const resetForm = () => {
    setDescrizione("")
    setImporto("")
    setContenitore("cassa_operativa")
    setDataSpesa("")
    setEditId(null)
  }

  const salvaSpesa = async () => {

    if (!descrizione || !importo || !dataSpesa) return

    const valore = -Math.abs(Number(importo))

    if (editId) {
      await supabase
        .from("movimenti_finanziari")
        .update({
          descrizione,
          importo: valore,
          contenitore,
          data: dataSpesa
        })
        .eq("id", editId)
    } else {
      await supabase
        .from("movimenti_finanziari")
        .insert({
          mese,
          tipo: "spesa",
          categoria: "spesa_generica",
          descrizione,
          importo: valore,
          contenitore,
          data: dataSpesa
        })
    }

    resetForm()
    caricaSpese()
  }

  const eliminaSpesa = async (id: string) => {
    await supabase
      .from("movimenti_finanziari")
      .delete()
      .eq("id", id)

    caricaSpese()
  }

  const modificaSpesa = (mov: any) => {
    setEditId(mov.id)
    setDescrizione(mov.descrizione)
    setImporto(Math.abs(mov.importo).toString())
    setContenitore(mov.contenitore)
    setDataSpesa(mov.data)
  }

  const formatData = (dataString: string) => {
    const data = new Date(dataString)
    return data.toLocaleDateString("it-IT")
  }

  const speseCassa = spese.filter(s => s.contenitore === "cassa_operativa")
  const speseBanca = spese.filter(s => s.contenitore === "banca")

  const totaleCassa = speseCassa.reduce((acc, s) => acc + Math.abs(Number(s.importo)), 0)
  const totaleBanca = speseBanca.reduce((acc, s) => acc + Math.abs(Number(s.importo)), 0)

  return (
    <div className="space-y-8">

      <h1 className="text-3xl font-bold text-yellow-500">
        Gestione Spese
      </h1>

      {/* FORM */}
      <div className="border border-gray-300 p-6 rounded bg-white space-y-4">

        <input
          type="text"
          placeholder="Descrizione"
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
          disabled={meseChiuso}
          className="bg-white text-gray-900 border border-gray-300 p-2 rounded w-full"
        />

        <input
          type="number"
          placeholder="Importo"
          value={importo}
          onChange={(e) => setImporto(e.target.value)}
          disabled={meseChiuso}
          className="bg-white text-gray-900 border border-gray-300 p-2 rounded w-full"
        />

        <input
          type="date"
          value={dataSpesa}
          onChange={(e) => setDataSpesa(e.target.value)}
          disabled={meseChiuso}
          className="bg-white text-gray-900 border border-gray-300 p-2 rounded w-full"
        />

        <select
          value={contenitore}
          onChange={(e) => setContenitore(e.target.value)}
          disabled={meseChiuso}
          className="bg-white text-gray-900 border border-gray-300 p-2 rounded w-full"
        >
          <option value="cassa_operativa">Cassa Operativa</option>
          <option value="banca">Banca</option>
        </select>

        <button
          onClick={salvaSpesa}
          disabled={meseChiuso}
          className="bg-red-600 text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {editId ? "Aggiorna Spesa" : "Registra Spesa"}
        </button>

      </div>

      {/* RIEPILOGO */}
      <div className="border border-gray-300 p-6 rounded bg-white">

        <h2 className="text-xl mb-4">Riepilogo Spese</h2>

        <p>Totale Spese Cassa: {totaleCassa.toFixed(2)} €</p>
        <p>Totale Spese Banca: {totaleBanca.toFixed(2)} €</p>

      </div>

      {/* TABELLA */}
      <div className="border border-gray-300 p-6 rounded bg-white">

        <h2 className="text-xl mb-4">Elenco Spese</h2>

        <table className="w-full border-collapse">

          <thead>
            <tr className="border-b border-gray-300 text-left">
              <th className="py-2">Data</th>
              <th className="py-2">Descrizione</th>
              <th className="py-2">Contenitore</th>
              <th className="py-2 text-right">Importo</th>
              {!meseChiuso && <th className="py-2 text-right">Azioni</th>}
            </tr>
          </thead>

          <tbody>

            {spese.map((mov) => (

              <tr key={mov.id} className="border-b border-gray-200">

                <td className="py-2">
                  {formatData(mov.data)}
                </td>

                <td className="py-2">
                  {mov.descrizione}
                </td>

                <td className="py-2">
                  {mov.contenitore}
                </td>

                <td className="py-2 text-right text-red-600 font-semibold">
                  {Math.abs(Number(mov.importo)).toFixed(2)} €
                </td>

                {!meseChiuso && (
                  <td className="py-2 text-right space-x-3">

                    <button
                      onClick={() => modificaSpesa(mov)}
                      className="text-yellow-600 hover:underline"
                    >
                      Modifica
                    </button>

                    <button
                      onClick={() => eliminaSpesa(mov.id)}
                      className="text-red-600 hover:underline"
                    >
                      Elimina
                    </button>

                  </td>
                )}

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  )
}
