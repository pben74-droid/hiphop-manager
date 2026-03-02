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

  const [anno, meseNumero] = mese ? mese.split("-") : ["2026", "02"]

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

    if (meseData) setStatoMese(meseData.stato)

    const saldi = await calcolaSaldi(mese)
    setSaldoCassa(saldi?.saldo_cassa ?? 0)
    setSaldoBanca(saldi?.saldo_banca ?? 0)

    const quota = await calcolaQuotaSoci(mese)
    setRiepilogo(quota ?? null)

    const op = await calcolaRiepilogoOperativo(mese)
    setOperativo(op ?? null)

    const aff = await generaSezioneAffitto(mese)
    setAffitto(aff ?? null)

    setLoading(false)
  }

  const cambiaMese = (nuovoAnno: string, nuovoMese: string) => {
    setMese(`${nuovoAnno}-${nuovoMese}`)
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

        <div className="flex gap-3 items-center">

          {/* SELETTORE MESE MANUALE */}
          <select
            value={meseNumero}
            onChange={(e) => cambiaMese(anno, e.target.value)}
            className="bg-black text-white border border-yellow-500 p-2 rounded"
          >
            {[
              "01","02","03","04","05","06",
              "07","08","09","10","11","12"
            ].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select
            value={anno}
            onChange={(e) => cambiaMese(e.target.value, meseNumero)}
            className="bg-black text-white border border-yellow-500 p-2 rounded"
          >
            {[2024,2025,2026,2027,2028].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

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
        <p className={statoMese === "chiuso" ? "text-red-500 font-bold" : "text-green-400"}>
          {statoMese.toUpperCase()}
        </p>
      </div>

      {/* OPERATIVO */}
      <div className="border border-yellow-500 p-4 rounded">
        <h2 className="text-xl mb-2">Controllo Operativo</h2>

        <p>Totale Incassi: {operativo?.totale_incassi?.toFixed(2) ?? "0.00"} €</p>

        <p className="text-red-400">
          Totale Spese: {operativo?.totale_spese?.toFixed(2) ?? "0.00"} €
        </p>

        <p>
          Risultato:{" "}
          <span className={
            (riepilogo?.risultato_operativo ?? 0) >= 0
              ? "text-green-400"
              : "text-red-500 font-bold"
          }>
            {riepilogo?.risultato_operativo?.toFixed(2) ?? "0.00"} €
          </span>
        </p>
      </div>

      {/* DIFFERENZA SOCI */}
      <div className="border border-yellow-500 p-4 rounded">
        <h2 className="text-xl mb-2">Controllo Versamenti Soci</h2>

        <p>
          Totale Versamenti: {riepilogo?.totale_versamenti?.toFixed(2) ?? "0.00"} €
        </p>

        <p>
          Differenza Finale:{" "}
          <span className={
            (riepilogo?.differenza_finale ?? 0) === 0
              ? "text-green-400"
              : "text-red-500 font-bold"
          }>
            {riepilogo?.differenza_finale?.toFixed(2) ?? "0.00"} €
          </span>
        </p>
      </div>

      {/* SALDI */}
      <div className="border border-yellow-500 p-4 rounded">
        <h2 className="text-xl mb-2">Saldi Finali</h2>

        <p className={saldoCassa < 0 ? "text-red-500 font-bold" : "text-green-400"}>
          Cassa Operativa: {saldoCassa.toFixed(2)} €
        </p>

        <p className={saldoBanca < 0 ? "text-red-500 font-bold" : "text-green-400"}>
          Banca: {saldoBanca.toFixed(2)} €
        </p>
      </div>

    </div>
  )
}
