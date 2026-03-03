"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useMese } from "@/lib/MeseContext"

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

  const [righe, setRighe] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!mese) return
    inizializza()
  }, [mese])

  const inizializza = async () => {

    setLoading(true)

    const { data: insegnanti } = await supabase
      .from("insegnanti")
      .select("*")
      .eq("attivo", true)

    const { data: fasce } = await supabase
      .from("insegnanti_fasce")
      .select("*")

    const calcolati = insegnanti?.map(ins => {

      const fasceInsegnante =
        fasce?.filter(f => f.insegnante_id === ins.id) || []

      let totaleLezioni = 0
      let totaleOre = 0
      let compensoOre = 0

      fasceInsegnante.forEach(f => {

        const lezioni = contaGiorniNelMese(
          mese,
          f.giorno_settimana
        )

        totaleLezioni += lezioni
        totaleOre += lezioni * Number(f.ore)

        compensoOre +=
          lezioni *
          Number(f.ore) *
          Number(f.costo_orario)
      })

      const compensoBenzina =
        totaleLezioni * Number(ins.rimborso_benzina || 0)

      const totale = compensoOre + compensoBenzina

      return {
        id: ins.id,
        nome: ins.nome,
        totaleLezioni,
        totaleOre,
        compensoOre,
        compensoBenzina,
        totale
      }
    }) || []

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

      <div className="border rounded overflow-x-auto">

        <table className="w-full text-sm">

          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 text-left">Nome</th>
              <th className="p-2">Lezioni</th>
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
                <td>{r.totaleLezioni}</td>
                <td>{r.totaleOre}</td>
                <td>{r.compensoOre.toFixed(2)} €</td>
                <td>{r.compensoBenzina.toFixed(2)} €</td>
                <td className="font-bold">
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
