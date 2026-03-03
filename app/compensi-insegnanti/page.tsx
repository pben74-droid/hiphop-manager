"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useMese } from "@/lib/MeseContext"
import { verificaMeseChiuso } from "@/lib/gestioneMese"

function contaGiorniNelMese(anno: number, mese: number, giorno: number) {
  let count = 0
  const date = new Date(anno, mese - 1, 1)

  while (date.getMonth() === mese - 1) {
    const jsDay = date.getDay() === 0 ? 7 : date.getDay()
    if (jsDay === giorno) count++
    date.setDate(date.getDate() + 1)
  }

  return count
}

export default function CompensiInsegnantiPage() {

  const { mese } = useMese()

  const [meseChiuso, setMeseChiuso] = useState(false)
  const [righe, setRighe] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!mese) return
    inizializza()
  }, [mese])

  const inizializza = async () => {

    setLoading(true)

    const chiuso = await verificaMeseChiuso(mese)
    setMeseChiuso(chiuso)

    const { data: insegnanti } = await supabase
      .from("insegnanti")
      .select("*")
      .eq("attivo", true)

    const { data: programmazione } = await supabase
      .from("insegnanti_programmazione")
      .select("*")

    const [anno, meseNumero] = mese.split("-").map(Number)

    const calcolati = insegnanti?.map(ins => {

      const giorni = programmazione?.filter(
        p => p.insegnante_id === ins.id
      ) || []

      let totaleLezioni = 0
      let totaleOre = 0

      giorni.forEach(g => {
        const lezioni = contaGiorniNelMese(
          anno,
          meseNumero,
          g.giorno_settimana
        )

        totaleLezioni += lezioni
        totaleOre += lezioni * Number(g.ore_per_giorno)
      })

      const compensoOre = totaleOre * Number(ins.costo_orario)
      const compensoBenzina =
        totaleLezioni * Number(ins.rimborso_benzina)

      const totale = compensoOre + compensoBenzina

      return {
        id: ins.id,
        nome: ins.nome,
        totaleLezioni,
        totaleOre,
        compensoOre,
        compensoBenzina,
        totaleCalcolato: totale,
        override: totale
      }
    }) || []

    setRighe(calcolati)
    setLoading(false)
  }

  const aggiornaOverride = (id: string, valore: string) => {
    setRighe(prev =>
      prev.map(r =>
        r.id === id
          ? { ...r, override: Number(valore) }
          : r
      )
    )
  }

  const generaCompensi = async () => {

    if (meseChiuso) return

    const res = await fetch("/api/genera-compensi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mese,
        compensi: righe.map(r => ({
          nome: r.nome,
          importo: r.override
        }))
      })
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.error)
      return
    }

    alert("Compensi generati correttamente")
  }

  if (loading) {
    return <div className="p-6">Caricamento...</div>
  }

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-2xl font-bold">
        Calcolo Compensi Insegnanti – {mese}
      </h1>

      {meseChiuso && (
        <div className="text-red-600 font-bold">
          Mese chiuso. Modifiche non consentite.
        </div>
      )}

      <div className="border rounded overflow-x-auto">

        <table className="w-full text-sm">

          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 text-left">Nome</th>
              <th className="p-2">Lezioni</th>
              <th className="p-2">Ore Totali</th>
              <th className="p-2">Compenso Ore</th>
              <th className="p-2">Benzina</th>
              <th className="p-2">Totale Calcolato</th>
              <th className="p-2">Modifica</th>
            </tr>
          </thead>

          <tbody>
            {righe.map(r => (
              <tr key={r.id} className="border-t text-center">

                <td className="p-2 text-left font-semibold">
                  {r.nome}
                </td>

                <td className="p-2">{r.totaleLezioni}</td>
                <td className="p-2">{r.totaleOre}</td>

                <td className="p-2">
                  {r.compensoOre.toFixed(2)} €
                </td>

                <td className="p-2">
                  {r.compensoBenzina.toFixed(2)} €
                </td>

                <td className="p-2 font-bold">
                  {r.totaleCalcolato.toFixed(2)} €
                </td>

                <td className="p-2">
                  <input
                    type="number"
                    value={r.override}
                    disabled={meseChiuso}
                    onChange={e =>
                      aggiornaOverride(r.id, e.target.value)
                    }
                    className="border p-1 w-24 text-center disabled:bg-gray-200"
                  />
                </td>

              </tr>
            ))}
          </tbody>

        </table>

      </div>

      <button
        onClick={generaCompensi}
        disabled={meseChiuso}
        className="bg-black text-white px-6 py-2 rounded disabled:opacity-50"
      >
        Genera Movimenti
      </button>

    </div>
  )
}
