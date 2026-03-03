"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useMese } from "@/lib/MeseContext"
import { verificaMeseChiuso } from "@/lib/gestioneMese"

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

  const { mese } = useMese()

  const [meseChiuso, setMeseChiuso] = useState(false)

  const [insegnanti, setInsegnanti] = useState<any[]>([])
  const [programmazione, setProgrammazione] = useState<any[]>([])

  const [editingId, setEditingId] = useState<string | null>(null)

  const [nome, setNome] = useState("")
  const [costoOrario, setCostoOrario] = useState("")
  const [benzina, setBenzina] = useState("")
  const [giorniSelezionati, setGiorniSelezionati] = useState<number[]>([])
  const [orePerGiorno, setOrePerGiorno] = useState<{ [key: number]: string }>({})

  useEffect(() => {
    inizializza()
  }, [mese])

  const inizializza = async () => {

    const chiuso = await verificaMeseChiuso(mese)
    setMeseChiuso(chiuso)

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

  const resetForm = () => {
    setEditingId(null)
    setNome("")
    setCostoOrario("")
    setBenzina("")
    setGiorniSelezionati([])
    setOrePerGiorno({})
  }

  const toggleGiorno = (giorno: number) => {
    if (giorniSelezionati.includes(giorno)) {
      setGiorniSelezionati(giorniSelezionati.filter(g => g !== giorno))
    } else {
      setGiorniSelezionati([...giorniSelezionati, giorno])
    }
  }

  const salva = async () => {

    if (meseChiuso) return

    if (!nome || !costoOrario) {
      alert("Compila nome e costo orario")
      return
    }

    let insegnanteId = editingId

    if (!editingId) {
      const { data } = await supabase
        .from("insegnanti")
        .insert({
          nome,
          costo_orario: Number(costoOrario),
          rimborso_benzina: Number(benzina) || 0
        })
        .select()
        .single()

      insegnanteId = data.id
    } else {
      await supabase
        .from("insegnanti")
        .update({
          nome,
          costo_orario: Number(costoOrario),
          rimborso_benzina: Number(benzina) || 0
        })
        .eq("id", editingId)

      await supabase
        .from("insegnanti_programmazione")
        .delete()
        .eq("insegnante_id", editingId)
    }

    for (const g of giorniSelezionati) {
      await supabase.from("insegnanti_programmazione").insert({
        insegnante_id: insegnanteId,
        giorno_settimana: g,
        ore_per_giorno: Number(orePerGiorno[g])
      })
    }

    resetForm()
    inizializza()
  }

  const modifica = (i: any) => {

    const prog = programmazione.filter(p => p.insegnante_id === i.id)

    setEditingId(i.id)
    setNome(i.nome)
    setCostoOrario(i.costo_orario)
    setBenzina(i.rimborso_benzina)

    const giorni = prog.map(p => p.giorno_settimana)
    setGiorniSelezionati(giorni)

    const ore: any = {}
    prog.forEach(p => {
      ore[p.giorno_settimana] = p.ore_per_giorno
    })
    setOrePerGiorno(ore)
  }

  const elimina = async (id: string) => {

    if (meseChiuso) return

    await supabase.from("insegnanti").delete().eq("id", id)
    inizializza()
  }

  return (
    <div className="p-6 space-y-8">

      <h1 className="text-2xl font-bold">
        Gestione Insegnanti – {mese}
      </h1>

      {meseChiuso && (
        <div className="text-red-600 font-bold">
          Mese chiuso. Modifiche non consentite.
        </div>
      )}

      <div className="border p-6 rounded space-y-4">

        <input
          placeholder="Nome"
          value={nome}
          onChange={e => setNome(e.target.value)}
          disabled={meseChiuso}
          className="border p-2 rounded w-full"
        />

        <input
          type="number"
          placeholder="Costo Orario"
          value={costoOrario}
          onChange={e => setCostoOrario(e.target.value)}
          disabled={meseChiuso}
          className="border p-2 rounded w-full"
        />

        <input
          type="number"
          placeholder="Rimborso Benzina"
          value={benzina}
          onChange={e => setBenzina(e.target.value)}
          disabled={meseChiuso}
          className="border p-2 rounded w-full"
        />

        <div>
          {giorniSettimana.map(g => (
            <div key={g.value} className="flex items-center space-x-3 mb-2">
              <input
                type="checkbox"
                checked={giorniSelezionati.includes(g.value)}
                onChange={() => toggleGiorno(g.value)}
                disabled={meseChiuso}
              />
              <span>{g.label}</span>

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
                  disabled={meseChiuso}
                  className="border p-1 rounded w-20"
                />
              )}
            </div>
          ))}
        </div>

        <button
          onClick={salva}
          disabled={meseChiuso}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {editingId ? "Aggiorna" : "Salva"}
        </button>
      </div>

      <div>
        {insegnanti.map(i => (
          <div key={i.id} className="border-b py-3 flex justify-between">

            <div>
              <div className="font-semibold">{i.nome}</div>
              <div className="text-sm">
                {i.costo_orario}€/h | Benzina: {i.rimborso_benzina}€
              </div>
            </div>

            {!meseChiuso && (
              <div className="space-x-2">
                <button
                  onClick={() => modifica(i)}
                  className="bg-blue-600 text-white px-3 py-1 rounded"
                >
                  Modifica
                </button>

                <button
                  onClick={() => elimina(i.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded"
                >
                  Elimina
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  )
}
