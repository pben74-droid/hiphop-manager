"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useMese } from "@/lib/MeseContext"
import { verificaMeseChiuso } from "@/lib/gestioneMese"

function contaGiorniNelMese(meseString: string, giorno: number) {

  const [anno, mese] = meseString.split("-").map(Number)

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

    const { data: fasce } = await supabase
      .from("insegnanti_fasce")
      .select("*")

    const calcolati = (insegnanti || []).map(ins => {

      const fasceInsegnante =
        (fasce || []).filter(f => f.insegnante_id === ins.id)

      // 🔹 Giorni distinti (compatibile ES5)
      const giorniUnici: number[] = []

      fasceInsegnante.forEach(f => {
        if (giorniUnici.indexOf(f.giorno_settimana) === -1) {
          giorniUnici.push(f.giorno_settimana)
        }
      })

      let totaleGiornate = 0

      giorniUnici.forEach(giorno => {
        totaleGiornate += contaGiorniNelMese(mese, giorno)
      })

      let totaleOre = 0
      let compensoOre = 0

      fasceInsegnante.forEach(f => {

        const lezioni = contaGiorniNelMese(
          mese,
          f.giorno_settimana
        )

        totaleOre += lezioni * Number(f.ore)

        compensoOre +=
          lezioni *
          Number(f.ore) *
          Number(f.costo_orario)
      })

      // 🔹 Rimborso benzina PER GIORNATA
      const compensoBenzina =
        totaleGiornate * Number(ins.rimborso_benzina || 0)

      const totale = compensoOre + compensoBenzina

      return {
        id: ins.id,
        nome: ins.nome,
        totaleGiornate,
        totaleOre,
        compensoOre,
        compensoBenzina,
        totaleCalcolato: totale,
        override: totale
      }

    })

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
              <th className="p-2">Giornate</th>
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

                <td className="p-2">{r.totaleGiornate}</td>

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

    </div>
  )
}
