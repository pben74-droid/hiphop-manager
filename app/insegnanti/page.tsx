"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useMese } from "@/lib/MeseContext"
import { verificaMeseChiuso } from "@/lib/gestioneMese"

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

  const { mese } = useMese()

  const [meseChiuso, setMeseChiuso] = useState(false)
  const [insegnanti, setInsegnanti] = useState<any[]>([])
  const [nome, setNome] = useState("")
  const [benzina, setBenzina] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)

  const [fasce, setFasce] = useState<{
    [giorno: number]: { ore: string; costo: string }[]
  }>({})

  useEffect(() => {
    if (!mese) return
    inizializza()
  }, [mese])

  const inizializza = async () => {

    const chiuso = await verificaMeseChiuso(mese)
    setMeseChiuso(chiuso)

    const { data } = await supabase
      .from("insegnanti")
      .select("*")
      .order("nome")

    setInsegnanti(data || [])
  }

  const aggiungiFascia = (giorno: number) => {
    setFasce(prev => ({
      ...prev,
      [giorno]: [...(prev[giorno] || []), { ore: "", costo: "" }]
    }))
  }

  const aggiornaFascia = (
    giorno: number,
    index: number,
    campo: "ore" | "costo",
    valore: string
  ) => {
    const nuove = [...(fasce[giorno] || [])]
    nuove[index][campo] = valore

    setFasce(prev => ({
      ...prev,
      [giorno]: nuove
    }))
  }

  const resetForm = () => {
    setNome("")
    setBenzina("")
    setEditingId(null)
    setFasce({})
  }

  const salva = async () => {

    if (meseChiuso) {
      alert("Mese chiuso")
      return
    }

    if (!nome.trim()) {
      alert("Inserisci nome insegnante")
      return
    }

    let insegnanteId = editingId

    try {

      // 🔹 UPDATE
      if (editingId) {

        const { error } = await supabase
          .from("insegnanti")
          .update({
            nome,
            rimborso_benzina: Number(benzina) || 0
          })
          .eq("id", editingId)

        if (error) {
          alert(error.message)
          return
        }

        // Elimina vecchie fasce
        await supabase
          .from("insegnanti_fasce")
          .delete()
          .eq("insegnante_id", editingId)

      } else {

        // 🔹 INSERT
        const { data, error } = await supabase
          .from("insegnanti")
          .insert({
            nome,
            rimborso_benzina: Number(benzina) || 0
          })
          .select()

        if (error) {
          alert(error.message)
          return
        }

        if (!data || data.length === 0) {
          alert("Errore creazione insegnante")
          return
        }

        insegnanteId = data[0].id
      }

      // 🔹 SALVATAGGIO FASCE
      for (const giorno in fasce) {

        const elencoFasce = fasce[Number(giorno)]

        for (const fascia of elencoFasce) {

          if (!fascia.ore || !fascia.costo) continue

          const { error } = await supabase
            .from("insegnanti_fasce")
            .insert({
              insegnante_id: insegnanteId,
              giorno_settimana: Number(giorno),
              ore: Number(fascia.ore),
              costo_orario: Number(fascia.costo)
            })

          if (error) {
            alert(error.message)
            return
          }
        }
      }

      alert("Insegnante salvato correttamente")

      resetForm()
      inizializza()

    } catch (err: any) {
      alert("Errore imprevisto")
      console.error(err)
    }
  }

  const modifica = async (ins: any) => {

    setEditingId(ins.id)
    setNome(ins.nome)
    setBenzina(ins.rimborso_benzina?.toString() || "")

    const { data } = await supabase
      .from("insegnanti_fasce")
      .select("*")
      .eq("insegnante_id", ins.id)

    const grouped: any = {}

    data?.forEach(f => {
      if (!grouped[f.giorno_settimana]) {
        grouped[f.giorno_settimana] = []
      }

      grouped[f.giorno_settimana].push({
        ore: f.ore.toString(),
        costo: f.costo_orario.toString()
      })
    })

    setFasce(grouped)
  }

  const elimina = async (id: string) => {
    if (meseChiuso) return
    await supabase.from("insegnanti").delete().eq("id", id)
    inizializza()
  }

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-2xl font-bold">
        Gestione Insegnanti
      </h1>

      {meseChiuso && (
        <div className="text-red-600 font-bold">
          Mese chiuso. Modifiche non consentite.
        </div>
      )}

      <div className="border p-4 rounded bg-white space-y-4">

        <input
          type="text"
          placeholder="Nome Insegnante"
          value={nome}
          onChange={e => setNome(e.target.value)}
          disabled={meseChiuso}
          className="border p-2 w-full"
        />

        <input
          type="number"
          placeholder="Rimborso Benzina per lezione"
          value={benzina}
          onChange={e => setBenzina(e.target.value)}
          disabled={meseChiuso}
          className="border p-2 w-full"
        />

        <div>
          <h2 className="font-semibold mb-2">
            Fasce Orarie Settimanali
          </h2>

          {giorniSettimana.map(g => (
            <div key={g.value} className="mb-4 border-b pb-3">

              <div className="flex justify-between items-center">
                <span className="font-semibold">{g.label}</span>

                <button
                  type="button"
                  onClick={() => aggiungiFascia(g.value)}
                  disabled={meseChiuso}
                  className="text-sm bg-blue-600 text-white px-2 py-1 rounded"
                >
                  + Fascia
                </button>
              </div>

              {(fasce[g.value] || []).map((f, index) => (
                <div key={index} className="flex space-x-3 mt-2">

                  <input
                    type="number"
                    placeholder="Ore"
                    value={f.ore}
                    disabled={meseChiuso}
                    onChange={e =>
                      aggiornaFascia(g.value, index, "ore", e.target.value)
                    }
                    className="border p-1 w-24"
                  />

                  <input
                    type="number"
                    placeholder="Costo Orario"
                    value={f.costo}
                    disabled={meseChiuso}
                    onChange={e =>
                      aggiornaFascia(g.value, index, "costo", e.target.value)
                    }
                    className="border p-1 w-28"
                  />

                </div>
              ))}

            </div>
          ))}

        </div>

        <div className="flex space-x-4">
          <button
            onClick={salva}
            disabled={meseChiuso}
            className="bg-black text-white px-6 py-2 rounded"
          >
            {editingId ? "Aggiorna" : "Salva"}
          </button>

          {editingId && (
            <button
              onClick={resetForm}
              className="bg-gray-400 text-white px-6 py-2 rounded"
            >
              Annulla
            </button>
          )}
        </div>

      </div>

      <div className="border p-4 rounded bg-white">

        <h2 className="font-semibold mb-4">
          Elenco Insegnanti
        </h2>

        {insegnanti.map(ins => (
          <div
            key={ins.id}
            className="flex justify-between border-b py-2"
          >
            <span>{ins.nome}</span>

            <div className="space-x-2">
              <button
                onClick={() => modifica(ins)}
                className="bg-blue-500 text-white px-3 py-1 rounded"
              >
                Modifica
              </button>

              <button
                onClick={() => elimina(ins.id)}
                className="bg-red-600 text-white px-3 py-1 rounded"
              >
                Elimina
              </button>
            </div>
          </div>
        ))}

      </div>

    </div>
  )
}
