"use client"

import { useEffect, useState } from "react"
import { useMese } from "@/lib/MeseContext"
import { supabase } from "@/lib/supabaseClient"
import {
  calcolaSaldi,
  calcolaQuotaSoci,
  calcolaRiepilogoOperativo,
  generaSezioneAffitto
} from "@/lib/gestioneMese"

export default function DashboardPage() {

  const { mese, setMese } = useMese()

  const [saldoCassa, setSaldoCassa] = useState(0)
  const [saldoBanca, setSaldoBanca] = useState(0)
  const [riepilogo, setRiepilogo] = useState<any>(null)
  const [operativo, setOperativo] = useState<any>(null)
  const [affitto, setAffitto] = useState<any>(null)
  const [statoMese, setStatoMese] = useState<"aperto" | "chiuso">("aperto")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!mese) return
    caricaDati()
  }, [mese])

  const caricaDati = async () => {

    setLoading(true)

    const { data: meseData } = await supabase
      .from("mesi")
      .select("stato")
      .eq("mese", mese)
      .single()

    if (meseData) {
      setStatoMese(meseData.stato)
    }

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

  const chiudiMese = async () => {

    if (riepilogo.differenza_finale !== 0) {
      alert("Impossibile chiudere il mese: differenza finale diversa da 0")
      return
    }

    await supabase
      .from("mesi")
      .update({ stato: "chiuso" })
      .eq("mese", mese)

    setStatoMese("chiuso")
  }

  if (!mese || loading) {
    return <div className="p-6 text-yellow-500">Caricamento...</div>
  }

  return (
    <div className="space-y-8 p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">

        <h1 className="text-3xl font-bold text-yellow-500">
          Dashboard – {mese}
        </h1>

        <div className="flex gap-4 items-center">

          <input
            type="month"
            value={mese}
            onChange={(e) => setMese(e.target.value)}
            className="bg-black text-white border border-yellow-500 p-2 rounded"
          />

          <button
            onClick={() => window.open(`/api/report?mese=${mese}`, "_blank")}
            className="bg-yellow-500 text-black px-4 py-2 rounded"
          >
            Stampa Report
          </button>

        </div>
      </div>

      {/* STATO MESE */}
      <div className="border border-yellow-500 p-4 rounded">
        <h2 className="text-xl mb-2">Stato Mese</h2>
        <p className={statoMese === "chiuso" ? "text-red-400" : "text-green-400"}>
          {statoMese.toUpperCase()}
        </p>

        {statoMese === "aperto" && (
          <button
            onClick={chiudiMese}
            className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
          >
            Chiudi Mese
          </button>
        )}
      </div>

      {/* CONTROLLO OPERATIVO */}
      <div className="border border-yellow-500 p-4 rounded">
        <h2 className="text-xl mb-2">Controllo Operativo</h2>
        <p>Totale Incassi: {operativo.totale_incassi.toFixed(2)} €</p>
        <p>Totale Spese: {operativo.totale_spese.toFixed(2)} €</p>
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

      {/* CONTROLLO DIFFERENZA SOCI */}
      <div className="border border-yellow-500 p-4 rounded">
        <h2 className="text-xl mb-2">Controllo Versamenti Soci</h2>

        <p>Totale Versamenti: {riepilogo.totale_versamenti.toFixed(2)} €</p>

        <p>
          Differenza Finale:{" "}
          <span className={
            riepilogo.differenza_finale === 0
              ? "text-green-400"
              : "text-red-400 font-bold"
          }>
            {riepilogo.differenza_finale.toFixed(2)} €
          </span>
        </p>

        {riepilogo.differenza_finale !== 0 && (
          <p className="text-red-500 mt-2">
            ⚠️ ATTENZIONE: Il mese non può essere chiuso
          </p>
        )}
      </div>

      {/* CONTROLLO AFFITTO */}
      {affitto && (
        <div className="border border-yellow-500 p-4 rounded">
          <h2 className="text-xl mb-2">Controllo Affitto</h2>

          <p>Costo Mensile: {affitto.costo_mensile.toFixed(2)} €</p>

          <p>
            Totale Versato:{" "}
            {affitto.soci
              .reduce((acc: number, s: any) => acc + s.versato, 0)
              .toFixed(2)} €
          </p>
        </div>
      )}

      {/* SALDI FINALI */}
      <div className="border border-yellow-500 p-4 rounded">
        <h2 className="text-xl mb-2">Saldi Finali</h2>

        <p className={saldoCassa < 0 ? "text-red-400" : "text-green-400"}>
          Cassa Operativa: {saldoCassa.toFixed(2)} €
        </p>

        <p className={saldoBanca < 0 ? "text-red-400" : "text-green-400"}>
          Banca: {saldoBanca.toFixed(2)} €
        </p>
      </div>

    </div>
  )
}
