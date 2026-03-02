"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useMese } from "@/lib/MeseContext"
import { verificaMeseChiuso } from "@/lib/gestioneMese"

export default function SpesePage() {

  const { mese } = useMese()

  const [bloccato, setBloccato] = useState(false)
  const [descrizione, setDescrizione] = useState("")
  const [importo, setImporto] = useState("")
  const [categoria, setCategoria] = useState("spesa_generica")
  const [contenitore, setContenitore] = useState("cassa_operativa")
  const [spese, setSpese] = useState<any[]>([])
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
      .eq("tipo", "spesa")
      .neq("categoria", "insegnante") // escludo insegnanti
      .order("data", { ascending: false })

    setSpese(data || [])
    setLoading(false)
  }

  const salva = async () => {

    if (bloccato) return

    if (!descrizione || !importo) {
      alert("Compila i campi")
      return
    }

    const valore = Number(importo)

    // 🔁 PRELEVAMENTO BANCA
    if (categoria === "prelevamento_banca") {

      // banca -X
      await supabase.from("movimenti_finanziari").insert({
        tipo: "spesa",
        categoria: "trasferimento",
        descrizione: "Prelevamento banca",
        importo: -valore,
        contenitore: "banca",
        mese,
        data: new Date().toISOString().slice(0, 10)
      })

      // cassa +X
      await supabase.from("movimenti_finanziari").insert({
        tipo: "incasso",
        categoria: "trasferimento",
        descrizione: "Prelevamento banca",
        importo: valore,
        contenitore: "cassa_operativa",
        mese,
        data: new Date().toISOString().slice(0, 10)
      })

    } else {

      await supabase.from("movimenti_finanziari").insert({
        tipo: "spesa",
        categoria,
        descrizione,
        importo: -valore,
        contenitore,
        mese,
        data: new Date().toISOString().slice(0, 10)
      })
    }

    setDescrizione("")
    setImporto("")
    inizializza()
  }

  const elimina = async (id: string) => {

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
        Spese – {mese}
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
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="bg-black text-white border border-yellow-500 p-2 rounded w-full"
        >
          <option value="spesa_generica">Spesa Generica</option>
          <option value="commissione_pos">Commissione POS</option>
          <option value="tessera_socio">Emissione Tessera</option>
          <option value="cancelleria">Acquisto Cancelleria</option>
          <option value="prelevamento_banca">Prelevamento Banca</option>
        </select>

        {categoria !== "prelevamento_banca" && (
          <select
            value={contenitore}
            onChange={(e) => setContenitore(e.target.value)}
            className="bg-black text-white border border-yellow-500 p-2 rounded w-full"
          >
            <option value="cassa_operativa">Cassa Operativa</option>
            <option value="banca">Banca</option>
          </select>
        )}

        <button
          onClick={salva}
          className="bg-yellow-500 text-black px-4 py-2 rounded"
        >
          Registra Spesa
        </button>
      </div>

      {/* ELENCO */}
      <div className="border border-yellow-500 p-4 rounded">
        <h2 className="text-lg mb-4">Elenco Spese</h2>

        {spese.map(s => (
          <div
            key={s.id}
            className="flex justify-between items-center border-b border-yellow-500 py-2"
          >
            <div>
              <p>{s.descrizione}</p>
              <p className="text-red-500">
                {Number(s.importo).toFixed(2)} €
              </p>
            </div>

            <button
              onClick={() => elimina(s.id)}
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
