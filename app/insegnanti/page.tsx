"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

const giorniSettimana = [
  { label: "Lunedì", value: 1 },
  { label: "Martedì", value: 2 },
  { label: "Mercoledì", value: 3 },
  { label: "Giovedì", value: 4 },
  { label: "Venerdì", value: 5 },
  { label: "Sabato", value: 6 },
  { label: "Domenica", value: 7 }
]

export default function InsegnantiPage() {

  const [insegnanti, setInsegnanti] = useState<any[]>([])
  const [programmazione, setProgrammazione] = useState<any[]>([])

  const [nome, setNome] = useState("")
  const [costoOrario, setCostoOrario] = useState("")
  const [benzina, setBenzina] = useState("")
  const [giorniSelezionati, setGiorniSelezionati] = useState<number[]>([])
  const [orePerGiorno, setOrePerGiorno] = useState<{ [key: number]: string }>({})

  useEffect(() => {
    carica()
  }, [])

  const carica = async () => {

    const { data: ins } = await supabase
      .from("insegnanti")
      .select("*")
      .order("nome")

    const { data: prog } = await supabase
      .from("insegnanti_programmazione")
      .select("*")

    setInsegnanti(ins || [])
    setProgrammazione(prog || [])
  }

  const toggleGiorno = (giorno: number) => {
    if (giorniSelezionati.includes(giorno)) {
      setGiorniSelezionati(giorniSelezionati.filter(g => g !== giorno))
    } else {
      setGiorniSelezionati([...giorniSelezionati, giorno])
    }
  }

  const salva = async () => {

    if (!nome || !costoOrario) {
      alert("Compila nome e costo orario")
      return
    }

    if (giorniSelezionati.length === 0) {
      alert("Seleziona almeno un giorno")
      return
    }

    for (const g of giorniSelezionati) {
      if (!orePerGiorno[g]) {
        alert("Inserisci le ore per tutti i giorni selezionati")
        return
      }
    }

    const { data: nuovo } = await supabase
      .from("insegnanti")
      .insert({
        nome,
        costo_orario: Number(costoOrario),
        rimborso_benzina: Number(benzina) || 0
      })
      .select()
      .single()

    for (const g of giorniSelezionati) {
      await supabase.from("insegnanti_programmazione").insert({
        insegnante_id: nuovo.id,
        giorno_settimana: g,
        ore_per_giorno: Number(orePerGiorno[g])
      })
    }

    setNome("")
    setCostoOrario("")
    setBenzina("")
    setGiorniSelezionati([])
    setOrePerGiorno({})

    carica()
  }

  return (
    <div className="p-6 space-y-8">

      <h1 className="text-2xl font-bold">
        Gestione Insegnanti
      </h1>

      <div className="border p-6 rounded space-y-4">

        <input
          placeholder="Nome"
          value={nome}
          onChange={e => setNome(e.target.value)}
          className="border p-2 rounded w-full"
        />

        <input
          type="number"
          placeholder="Costo Orario (€)"
          value={costoOrario}
          onChange={e => setCostoOrario(e.target.value)}
          className="border p-2 rounded w-full"
        />

        <input
          type="number"
          placeholder="Rimborso Benzina per giorno (€)"
          value={benzina}
          onChange={e => setBenzina(e.target.value)}
          className="border p-2 rounded w-full"
        />

        <div>
          <p className="font-semibold mb-2">
            Giorni Settimanali e Ore
          </p>

          {giorniSettimana.map(g => (
            <div key={g.value} className="flex items-center space-x-4 mb-2">

              <input
                type="checkbox"
                checked={giorniSelezionati.includes(g.value)}
                onChange={() => toggleGiorno(g.value)}
              />

              <span className="w-28">{g.label}</span>

              {giorniSelezionati.includes(g.value) && (
                <input
                  type="number"
                  placeholder="Ore"
                  value={orePerGiorno[g.value] || ""}
                  onChange={e =>
                    setOrePerGiorno({
                      ...orePerGiorno,
                      [g.value]: e.target.value
                    })
                  }
                  className="border p-1 rounded w-24"
                />
              )}
            </div>
          ))}
        </div>

        <button
          onClick={salva}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Salva Insegnante
        </button>
      </div>

      <div>
        <h2 className="font-semibold mb-4">
          Elenco Insegnanti
        </h2>

        {insegnanti.map(i => {

          const prog = programmazione.filter(
            p => p.insegnante_id === i.id
          )

          return (
            <div key={i.id} className="border-b py-3">

              <div className="font-semibold">
                {i.nome}
              </div>

              <div className="text-sm">
                Costo: {i.costo_orario}€/h | Benzina: {i.rimborso_benzina}€
              </div>

              <div className="text-sm text-gray-600">
                {prog.map(p => {
                  const giorno = giorniSettimana.find(
                    g => g.value === p.giorno_settimana
                  )?.label

                  return `${giorno} (${p.ore_per_giorno}h)`
                }).join(" • ")}
              </div>

            </div>
          )
        })}
      </div>

    </div>
  )
}
