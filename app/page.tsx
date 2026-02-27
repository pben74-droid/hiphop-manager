"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useMese } from "@/lib/MeseContext"
import {
  calcolaSaldi,
  calcolaQuotaSoci,
  calcolaRiepilogoOperativo,
  generaSezioneAffitto
} from "@/lib/gestioneMese"

export default function DashboardPage() {

  const router = useRouter()
  const { mese, setMese } = useMese()

  const [saldoCassa, setSaldoCassa] = useState(0)
  const [saldoBanca, setSaldoBanca] = useState(0)
  const [riepilogo, setRiepilogo] = useState<any>(null)
  const [operativo, setOperativo] = useState<any>(null)
  const [affitto, setAffitto] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!mese) return
    caricaDati()
  }, [mese])

  const caricaDati = async () => {

    setLoading(true)

    const saldi = await calcolaSaldi(mese)
    setSaldoCassa(saldi.saldo_cassa)
    setSaldoBanca(saldi.saldo_banca)

    const quota = await calcolaQuotaSoci(mese)
    setRiepilogo(quota)

    const op = await calcolaRiepilogoOperativo(mese)
    setOperativo(op)

    const aff = await generaSezioneAffitto(mese)
    setAffitto(aff)

    setLoading(false)
  }

  if (!mese || loading) {
    return <div className="text-yellow-500">Caricamento...</div>
  }

  return (
    <div className="space-y-10">

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-yellow-500">
          Dashboard – {mese}
        </h1>

        {/* SELETTORE MESE */}
        <input
          type="month"
          value={mese}
          onChange={(e) => setMese(e.target.value)}
          className="bg-black border border-yellow-500 p-2 rounded"
        />

        <button
          onClick={() => router.push("/report")}
          className="bg-yellow-500 text-black px-4 py-2 rounded"
        >
          Report PDF
        </button>
      </div>

      {/* SALDI */}
      <div className="border border-yellow-500 p-6 rounded">
        <h2 className="text-xl mb-4">Saldi</h2>

        <p className={saldoCassa < 0 ? "text-red-400" : "text-green-400"}>
          Cassa Operativa: {saldoCassa.toFixed(2)} €
        </p>

        <p className={saldoBanca < 0 ? "text-red-400" : "text-green-400"}>
          Banca: {saldoBanca.toFixed(2)} €
        </p>
      </div>

      {/* OPERATIVO */}
      <div className="border border-yellow-500 p-6 rounded">
        <h2 className="text-xl mb-4">Operativo</h2>

        <p>Totale Incassi: {operativo?.totale_incassi.toFixed(2)} €</p>
        <p>Totale Spese: {operativo?.totale_spese.toFixed(2)} €</p>

        <p>
          Risultato:{" "}
          <span className={
            riepilogo.risultato_operativo >= 0
              ? "text-green-400"
              : "text-red-400"
          }>
            {riepilogo.risultato_operativo.toFixed(2)} €
          </span>
        </p>
      </div>

      {/* AFFITTO */}
      {affitto && (
        <div className="border border-yellow-500 p-6 rounded">
          <h2 className="text-xl mb-4">Affitto</h2>

          <p>Costo mensile: {affitto.costo_mensile.toFixed(2)} €</p>

          <p>
            Totale versato:{" "}
            {affitto.soci
              .reduce((acc: number, s: any) => acc + s.versato, 0)
              .toFixed(2)} €
          </p>
        </div>
      )}

    </div>
  )
}
