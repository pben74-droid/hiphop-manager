"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useMese } from "@/lib/MeseContext"
import { verificaMeseChiuso } from "@/lib/gestioneMese"

export default function IncassiPage() {

  const { mese } = useMese()

  const [descrizione, setDescrizione] = useState("")
  const [importo, setImporto] = useState("")
  const [contenitore, setContenitore] = useState("cassa_operativa")
  const [dataIncasso, setDataIncasso] = useState("")
  const [incassi, setIncassi] = useState<any[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [meseChiuso, setMeseChiuso] = useState(false)

  useEffect(() => {
    caricaIncassi()
    controllaMese()
  }, [mese])

  const controllaMese = async () => {
    const chiuso = await verificaMeseChiuso(mese)
    setMeseChiuso(chiuso)
  }

  const caricaIncassi = async () => {
    const { data } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese)
      .eq("tipo", "incasso")
      .order("data", { ascending: false })

    setIncassi(data || [])
  }

  const resetForm = () => {
    setDescrizione("")
    setImporto("")
    setContenitore("cassa_operativa")
    setDataIncasso("")
    setEditId(null)
  }

  const salvaIncasso = async () => {

    if (!descrizione || !importo || !dataIncasso) return

    const valore = Math.abs(Number(importo))

    if (editId) {

      await supabase
        .from("movimenti_finanziari")
        .update({
          descrizione,
          importo: valore,
          contenitore,
          data: dataIncasso
        })
        .eq("id", editId)

    } else {

      await supabase
        .from("movimenti_finanziari")
        .insert({
          mese,
          tipo: "incasso",
          categoria: "atleta",
          descrizione,
          importo: valore,
          contenitore,
          data: dataIncasso
        })
    }

    resetForm()
    caricaIncassi()
  }

  const eliminaIncasso = async (id: string) => {
    await supabase
      .from("movimenti_finanziari")
      .delete()
      .eq("id", id)

    caricaIncassi()
  }

  const modificaIncasso = (mov: any) => {
    setEditId(mov.id)
    setDescrizione(mov.descrizione)
    setImporto(Number(mov.importo).toFixed(2))
    setContenitore(mov.contenitore)
    setDataIncasso(mov.data)
  }

  const formatData = (dataString: string) => {
    const data = new Date(dataString)
    return data.toLocaleDateString("it-IT")
  }

  const incassiCassa = incassi.filter(i => i.contenitore === "cassa_operativa")
  const incassiBanca = incassi.filter(i => i.contenitore === "banca")

  const totaleCassa = incassiCassa.reduce((acc, i) => acc + Number(i.importo), 0)
  const totaleBanca = incassiBanca.reduce((acc, i) => acc + Number(i.importo), 0)

  return (
    <div className="space-y-8">

      <h1 className="text-3xl font-bold text-yellow-500">
        Gestione Incassi
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
          step="0.01"
          placeholder="Importo"
          value={importo}
          onChange={(e) => setImporto(e.target.value)}
          disabled={meseChiuso}
          className="bg-white text-gray-900 border border-gray-300 p-2 rounded w-full"
        />

        <input
          type="date"
          value={dataIncasso}
          onChange={(e) => setDataIncasso(e.target.value)}
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
          onClick={salvaIncasso}
          disabled={meseChiuso}
          className="bg-green-600 text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {editId ? "Aggiorna Incasso" : "Registra Incasso"}
        </button>

      </div>

      {/* RIEPILOGO */}
      <div className="border border-gray-300 p-6 rounded bg-white">

        <h2 className="text-xl mb-4">Riepilogo Incassi</h2>

        <p>Totale Incassi Cassa: {totaleCassa.toFixed(2)} €</p>
        <p>Totale Incassi Banca: {totaleBanca.toFixed(2)} €</p>

      </div>

      {/* TABELLA */}
      <div className="border border-gray-300 p-6 rounded bg-white">

        <h2 className="text-xl mb-4">Elenco Incassi</h2>

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

            {incassi.map((mov) => (

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

                <td className="py-2 text-right text-green-600 font-semibold">
                  {Number(mov.importo).toFixed(2)} €
                </td>

                {!meseChiuso && (
                  <td className="py-2 text-right space-x-3">

                    <button
                      onClick={() => modificaIncasso(mov)}
                      className="text-yellow-600 hover:underline"
                    >
                      Modifica
                    </button>

                    <button
                      onClick={() => eliminaIncasso(mov.id)}
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
