"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useMese } from "@/lib/MeseContext"
import { verificaMeseChiuso } from "@/lib/gestioneMese"

export default function IncassiPage() {

  const { mese } = useMese()

  const [bloccato, setBloccato] = useState(false)
  const [descrizione, setDescrizione] = useState("")
  const [importo, setImporto] = useState("")
  const [contenitore, setContenitore] = useState("cassa_operativa")
  const [incassi, setIncassi] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!mese) return
    inizializza()
  }, [mese])

  const inizializza = async () => {

    setLoading(true)

    const chiuso = await verificaMeseChiuso(mese)
    setBloccato(chiuso)

    const { data } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese)
      .eq("tipo", "incasso")
      .order("data", { ascending: false })

    setIncassi(data || [])
    setLoading(false)
  }

  const salvaIncasso = async () => {

    if (bloccato) return

    if (!descrizione || !importo) {
      alert("Compila tutti i campi")
      return
    }

    await supabase.from("movimenti_finanziari").insert({
      tipo: "incasso",
      categoria: "atleta",
      descrizione,
      importo: Number(importo),
      contenitore,
      mese,
      data: new Date().toISOString().slice(0, 10)
    })

    setDescrizione("")
    setImporto("")
    inizializza()
  }

  const eliminaIncasso = async (id: string) => {

    if (bloccato) return

    await supabase
      .from("movimenti_finanziari")
      .delete()
      .eq("id", id)

    inizializza()
  }

  if (loading) {
    return <div className="p-6 text-yellow-500">Caricamento...</div>
  }

  if (bloccato) {
    return (
      <div className="p-6 text-red-500 font-bold">
        Mese chiuso. Modifiche non consentite.
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-2xl text-yellow-500 font-bold">
        Incassi – {mese}
      </h1>

      {/* FORM */}
      <div className="border border-yellow-500 p-4 rounded space-y-3">

        <input
          type="text"
          placeholder="Descrizione"
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
          className="bg-black text-white border border-yellow-500 p-2 rounded w-full"
        />

        <input
          type="number"
          step="0.01"
          placeholder="Importo"
          value={importo}
          onChange={(e) => setImporto(e.target.value)}
          className="bg-black text-white border border-yellow-500 p-2 rounded w-full"
        />

        <select
          value={contenitore}
          onChange={(e) => setContenitore(e.target.value)}
          className="bg-black text-white border border-yellow-500 p-2 rounded w-full"
        >
          <option value="cassa_operativa">Cassa Operativa</option>
          <option value="banca">Banca</option>
        </select>

        <button
          onClick={salvaIncasso}
          className="bg-yellow-500 text-black px-4 py-2 rounded"
        >
          Registra Incasso
        </button>

      </div>

      {/* ELENCO */}
      <div className="border border-yellow-500 p-4 rounded">
        <h2 className="text-lg mb-4">Elenco Incassi</h2>

        {incassi.map(i => (
          <div
            key={i.id}
            className="flex justify-between items-center border-b border-yellow-500 py-2"
          >
            <div>
              <p>{i.descrizione}</p>
              <p>{Number(i.importo).toFixed(2)} €</p>
            </div>

            <button
              onClick={() => eliminaIncasso(i.id)}
              className="bg-red-500 px-3 py-1 rounded"
            >
              Elimina
            </button>
          </div>
        ))}
      </div>

    </div>
  )
}
