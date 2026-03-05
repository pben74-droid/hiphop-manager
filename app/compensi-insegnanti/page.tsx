"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useMese } from "@/lib/MeseContext"
import { verificaMeseChiuso } from "@/lib/gestioneMese"

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

    const { data: lezioni } = await supabase
      .from("lezioni_insegnanti")
      .select("*")
      .eq("mese", mese)

    const calcolati = (insegnanti || []).map(ins => {

      const lezioniInsegnante =
        (lezioni || []).filter(
          l =>
            l.insegnante_id === ins.id &&
            l.stato !== "annullata"
        )

      let totaleOre = 0
      let compensoOre = 0

      const giorni: any = {}

      lezioniInsegnante.forEach(l => {

        totaleOre += Number(l.ore)

        compensoOre +=
          Number(l.ore) *
          Number(l.costo_orario)

        giorni[l.data] = true

      })

      const totaleGiornate =
        Object.keys(giorni).length

      const compensoBenzina =
        lezioniInsegnante.reduce(
          (acc, l) =>
            acc + Number(l.rimborso_benzina || 0),
          0
        )

      const totale =
        compensoOre + compensoBenzina

      return {
        id: ins.id,
        nome: ins.nome,
        totaleGiornate,
        totaleOre,
        compensoOre,
        compensoBenzina,
        totale
      }

    })

    setRighe(calcolati)
    setLoading(false)
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
              <th className="p-2">Totale</th>
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
                  {r.totale.toFixed(2)} €
                </td>

              </tr>
            ))}
          </tbody>

        </table>

      </div>

    </div>
  )
}
