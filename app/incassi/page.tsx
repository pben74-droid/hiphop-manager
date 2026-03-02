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

  const salva = async () => {

    if (bloccato) return

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

  const elimina = async (id: string) => {
    if (bloccato) return
    await supabase.from("movimenti_finanziari").delete().eq("id", id)
    inizializza()
  }

  const incassiCassa = incassi.filter(i => i.contenitore === "cassa_operativa")
  const incassiBanca = incassi.filter(i => i.contenitore === "banca")

  const totale = (lista: any[]) =>
    lista.reduce((acc, i) => acc + Number(i.importo), 0)

  if (loading) return <div className="p-6 text-yellow-500">Caricamento...</div>

  if (bloccato)
    return <div className="p-6 text-red-500 font-bold">Mese chiuso</div>

  return (
    <div className="p-6 space-y-8">

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
          onClick={salva}
          className="bg-yellow-500 text-black px-4 py-2 rounded"
        >
          Registra Incasso
        </button>
      </div>

      {/* CASSA */}
      <div className="border border-yellow-500 p-4 rounded">
        <h2 className="text-lg font-bold mb-2">
          Incassi Cassa – Totale {totale(incassiCassa).toFixed(2)} €
        </h2>

        {incassiCassa.map(i => (
          <div key={i.id} className="flex justify-between py-1">
            <span>{i.descrizione}</span>
            <span>{Number(i.importo).toFixed(2)} €</span>
          </div>
        ))}
      </div>

      {/* BANCA */}
      <div className="border border-yellow-500 p-4 rounded">
        <h2 className="text-lg font-bold mb-2">
          Incassi Banca – Totale {totale(incassiBanca).toFixed(2)} €
        </h2>

        {incassiBanca.map(i => (
          <div key={i.id} className="flex justify-between py-1">
            <span>{i.descrizione}</span>
            <span>{Number(i.importo).toFixed(2)} €</span>
          </div>
        ))}
      </div>

    </div>
  )
}
