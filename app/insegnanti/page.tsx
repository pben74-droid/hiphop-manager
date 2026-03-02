"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useMese } from "@/lib/MeseContext"
import { verificaMeseChiuso } from "@/lib/gestioneMese"

export default function InsegnantiPage() {

  const { mese } = useMese()

  const [bloccato, setBloccato] = useState(false)
  const [nome, setNome] = useState("")
  const [ore, setOre] = useState("")
  const [compensoOrario, setCompensoOrario] = useState("")
  const [benzina, setBenzina] = useState("")
  const [movimenti, setMovimenti] = useState<any[]>([])
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
      .eq("categoria", "insegnante")
      .order("data", { ascending: false })

    setMovimenti(data || [])
    setLoading(false)
  }

  const salva = async () => {

    if (bloccato) return

    if (!nome || !ore || !compensoOrario) {
      alert("Compila i campi obbligatori")
      return
    }

    const totale =
      Number(ore) * Number(compensoOrario) +
      Number(benzina || 0)

    await supabase.from("movimenti_finanziari").insert({
      tipo: "spesa",
      categoria: "insegnante",
      descrizione: nome,
      importo: -Number(totale),
      contenitore: "cassa_operativa",
      mese,
      data: new Date().toISOString().slice(0, 10),
      ore: Number(ore),
      compenso_orario: Number(compensoOrario),
      benzina: Number(benzina || 0)
    })

    setNome("")
    setOre("")
    setCompensoOrario("")
    setBenzina("")

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
        Compensi Insegnanti – {mese}
      </h1>

      {/* FORM */}
      <div className="border border-yellow-500 p-4 rounded space-y-3">

        <input
          type="text"
          placeholder="Nome insegnante"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="bg-black text-white border border-yellow-500 p-2 rounded w-full"
        />

        <input
          type="number"
          step="0.01"
          placeholder="Ore"
          value={ore}
          onChange={(e) => setOre(e.target.value)}
          className="bg-black text-white border border-yellow-500 p-2 rounded w-full"
        />

        <input
          type="number"
          step="0.01"
          placeholder="Compenso orario"
          value={compensoOrario}
          onChange={(e) => setCompensoOrario(e.target.value)}
          className="bg-black text-white border border-yellow-500 p-2 rounded w-full"
        />

        <input
          type="number"
          step="0.01"
          placeholder="Benzina"
          value={benzina}
          onChange={(e) => setBenzina(e.target.value)}
          className="bg-black text-white border border-yellow-500 p-2 rounded w-full"
        />

        <button
          onClick={salva}
          className="bg-yellow-500 text-black px-4 py-2 rounded"
        >
          Registra Compenso
        </button>
      </div>

      {/* ELENCO */}
      <div className="border border-yellow-500 p-4 rounded">
        <h2 className="text-lg mb-4">Elenco Compensi</h2>

        {movimenti.map(m => (
          <div
            key={m.id}
            className="flex justify-between items-center border-b border-yellow-500 py-2"
          >
            <div>
              <p className="font-bold">{m.descrizione}</p>
              <p className="text-red-500">
                {Number(m.importo).toFixed(2)} €
              </p>
            </div>

            <button
              onClick={() => elimina(m.id)}
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
