"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

const giorniSettimana = [
  { value: 1, label: "Lunedì" },
  { value: 2, label: "Martedì" },
  { value: 3, label: "Mercoledì" },
  { value: 4, label: "Giovedì" },
  { value: 5, label: "Venerdì" },
  { value: 6, label: "Sabato" },
  { value: 7, label: "Domenica" },
]

export default function InsegnantiPage() {

  const [insegnanti, setInsegnanti] = useState<any[]>([])
  const [fasceDb, setFasceDb] = useState<any[]>([])
  const [nome, setNome] = useState("")
  const [rimborso, setRimborso] = useState("")
  const [fasce, setFasce] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carica()
  }, [])

  const carica = async () => {

    const { data: ins } = await supabase
      .from("insegnanti")
      .select("*")
      .order("nome")

    const { data: f } = await supabase
      .from("insegnanti_fasce")
      .select("*")

    setInsegnanti(ins || [])
    setFasceDb(f || [])
    setLoading(false)
  }

  const aggiungiFascia = () => {
    setFasce([
      ...fasce,
      { giorno_settimana: 1, ore_per_giorno: "", costo_orario: "" }
    ])
  }

  const aggiornaFascia = (index: number, campo: string, valore: any) => {
    const nuove = [...fasce]
    nuove[index][campo] = valore
    setFasce(nuove)
  }

  const salva = async () => {

    if (!nome) {
      alert("Inserisci nome insegnante")
      return
    }

    const { data: nuovo, error } = await supabase
      .from("insegnanti")
      .insert({
        nome,
        rimborso_benzina: Number(rimborso) || 0,
        attivo: true
      })
      .select()
      .single()

    if (error) {
      alert(error.message)
      return
    }

    for (const f of fasce) {

      if (!f.ore_per_giorno || !f.costo_orario) continue

      await supabase.from("insegnanti_fasce").insert({
        insegnante_id: nuovo.id,
        giorno_settimana: f.giorno_settimana,
        ore_per_giorno: Number(f.ore_per_giorno),
        costo_orario: Number(f.costo_orario)
      })
    }

    setNome("")
    setRimborso("")
    setFasce([])
    carica()
  }

  const elimina = async (id: string) => {
    await supabase.from("insegnanti").delete().eq("id", id)
    carica()
  }

  if (loading) return <div className="p-6">Caricamento...</div>

  return (
    <div className="p-6 space-y-8">

      <h1 className="text-2xl font-bold">
        Gestione Insegnanti
      </h1>

      {/* FORM */}
      <div className="border p-4 rounded bg-white space-y-4">

        <input
          type="text"
          placeholder="Nome insegnante"
          value={nome}
          onChange={e => setNome(e.target.value)}
          className="border p-2 w-full"
        />

        <input
          type="number"
          placeholder="Rimborso benzina per lezione"
          value={rimborso}
          onChange={e => setRimborso(e.target.value)}
          className="border p-2 w-full"
        />

        {fasce.map((f, index) => (
          <div key={index} className="flex gap-2">

            <select
              value={f.giorno_settimana}
              onChange={e =>
                aggiornaFascia(index, "giorno_settimana", Number(e.target.value))
              }
              className="border p-2"
            >
              {giorniSettimana.map(g => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Ore"
              value={f.ore_per_giorno}
              onChange={e =>
                aggiornaFascia(index, "ore_per_giorno", e.target.value)
              }
              className="border p-2 w-24"
            />

            <input
              type="number"
              placeholder="Costo orario"
              value={f.costo_orario}
              onChange={e =>
                aggiornaFascia(index, "costo_orario", e.target.value)
              }
              className="border p-2 w-32"
            />

          </div>
        ))}

        <button
          onClick={aggiungiFascia}
          className="bg-gray-800 text-white px-4 py-2 rounded"
        >
          Aggiungi Fascia
        </button>

        <button
          onClick={salva}
          className="bg-black text-white px-6 py-2 rounded"
        >
          Salva Insegnante
        </button>

      </div>

      {/* ELENCO */}
      {insegnanti.map(ins => {

        const fasceInsegnante =
          fasceDb.filter(f => f.insegnante_id === ins.id)

        return (
          <div key={ins.id} className="border p-4 rounded bg-white">

            <div className="flex justify-between">
              <strong>{ins.nome}</strong>
              <button
                onClick={() => elimina(ins.id)}
                className="text-red-600"
              >
                Elimina
              </button>
            </div>

            {fasceInsegnante.map(f => (
              <div key={f.id} className="text-sm">
                Giorno {f.giorno_settimana} –
                {f.ore_per_giorno}h × {f.costo_orario}€
              </div>
            ))}

          </div>
        )
      })}

    </div>
  )
}
