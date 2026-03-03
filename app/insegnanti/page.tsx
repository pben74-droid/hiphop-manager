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

function contaGiorniNelMese(meseString: string, giorno: number) {

  const parts = meseString.split("-")

  let anno: number
  let mese: number

  if (parts[0].length === 4) {
    anno = Number(parts[0])
    mese = Number(parts[1])
  } else {
    mese = Number(parts[0])
    anno = Number(parts[1])
  }

  let count = 0
  const date = new Date(anno, mese - 1, 1)

  while (date.getMonth() === mese - 1) {
    const jsDay = date.getDay() === 0 ? 7 : date.getDay()
    if (jsDay === giorno) count++
    date.setDate(date.getDate() + 1)
  }

  return count
}

export default function InsegnantiPage() {

  const { mese } = useMese()

  const [meseChiuso, setMeseChiuso] = useState(false)
  const [insegnanti, setInsegnanti] = useState<any[]>([])
  const [fasceDb, setFasceDb] = useState<any[]>([])

  useEffect(() => {
    if (!mese) return
    inizializza()
  }, [mese])

  const inizializza = async () => {

    const chiuso = await verificaMeseChiuso(mese)
    setMeseChiuso(chiuso)

    const { data: insegnantiData } = await supabase
      .from("insegnanti")
      .select("*")
      .order("nome")

    const { data: fasceData } = await supabase
      .from("insegnanti_fasce")
      .select("*")

    setInsegnanti(insegnantiData || [])
    setFasceDb(fasceData || [])
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

      <div className="space-y-6">

        {insegnanti.map(ins => {

          const fasceInsegnante =
            fasceDb.filter(f => f.insegnante_id === ins.id)

          let totaleSettimanale = 0
          let totaleMensile = 0
          let totaleLezioni = 0

          fasceInsegnante.forEach(f => {

            const costoFascia =
              Number(f.ore) * Number(f.costo_orario)

            totaleSettimanale += costoFascia

            const lezioni = contaGiorniNelMese(
              mese,
              f.giorno_settimana
            )

            totaleLezioni += lezioni

            totaleMensile +=
              lezioni *
              Number(f.ore) *
              Number(f.costo_orario)
          })

          const benzinaMensile =
            totaleLezioni * Number(ins.rimborso_benzina || 0)

          totaleMensile += benzinaMensile

          return (
            <div
              key={ins.id}
              className="border p-4 rounded bg-white space-y-3"
            >

              <div className="flex justify-between items-center">
                <h2 className="font-bold text-lg">
                  {ins.nome}
                </h2>

                <button
                  onClick={() => elimina(ins.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded"
                >
                  Elimina
                </button>
              </div>

              {/* A - FASCE */}
              <div>
                <h3 className="font-semibold mb-2">
                  Fasce settimanali
                </h3>

                {fasceInsegnante.map(f => {

                  const giornoLabel =
                    giorniSettimana.find(
                      g => g.value === f.giorno_settimana
                    )?.label

                  return (
                    <div
                      key={f.id}
                      className="text-sm flex justify-between border-b py-1"
                    >
                      <span>
                        {giornoLabel}
                      </span>
                      <span>
                        {f.ore}h × {f.costo_orario} €
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* B - TOTALE SETTIMANALE */}
              <div className="text-sm">
                <strong>Totale Settimanale:</strong>{" "}
                {totaleSettimanale.toFixed(2)} €
              </div>

              {/* C - TOTALE MENSILE REALE */}
              <div className="text-sm">
                <strong>Totale Mensile ({mese}):</strong>{" "}
                {totaleMensile.toFixed(2)} €
              </div>

            </div>
          )
        })}

      </div>

    </div>
  )
}
