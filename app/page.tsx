"use client"

import { useEffect, useState } from "react"
import { useMese } from "@/lib/MeseContext"
import {
  inizializzaMese,
  calcolaSaldi,
  calcolaRiepilogoOperativo,
  calcolaQuotaSoci,
  generaSezioneAffitto,
  verificaMeseChiuso
} from "@/lib/gestioneMese"

export default function DashboardPage() {

  const { mese, setMese } = useMese()

  const [listaMesi, setListaMesi] = useState<string[]>([])
  const [saldoCassa, setSaldoCassa] = useState(0)
  const [saldoBanca, setSaldoBanca] = useState(0)
  const [riepilogo, setRiepilogo] = useState<any>(null)
  const [quotaSoci, setQuotaSoci] = useState<any>(null)
  const [affitto, setAffitto] = useState<any>(null)
  const [meseChiuso, setMeseChiuso] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    caricaListaMesi()
  }, [])

  useEffect(() => {
    if (!mese) return
    caricaDashboard()
  }, [mese])

  const caricaListaMesi = async () => {
    const res = await fetch("/api/mesi")
    const data = await res.json()
    setListaMesi(data.map((m: any) => m.mese))
  }

  const caricaDashboard = async () => {
    try {

      setLoading(true)

      await inizializzaMese(mese)

      const chiuso = await verificaMeseChiuso(mese)
      const saldi = await calcolaSaldi(mese)
      const riepilogoOperativo = await calcolaRiepilogoOperativo(mese)
      const quote = await calcolaQuotaSoci(mese)
      const affittoData = await generaSezioneAffitto(mese)

      setMeseChiuso(chiuso)
      setSaldoCassa(saldi.saldo_cassa)
      setSaldoBanca(saldi.saldo_banca)
      setRiepilogo(riepilogoOperativo)
      setQuotaSoci(quote)
      setAffitto(affittoData)

    } catch (err) {
      console.error("Errore caricamento dashboard:", err)
    } finally {
      setLoading(false)
    }
  }

  const chiudiMese = async () => {
    try {

      const res = await fetch("/api/chiudi-mese", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mese })
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || "Errore chiusura mese")
        return
      }

      alert("Mese chiuso correttamente")
      caricaDashboard()

    } catch (err) {
      console.error("Errore chiusura mese:", err)
    }
  }

  return (
    <div className="space-y-8">

      <div className="flex justify-between items-center">

        <div>
          <h1 className="text-3xl font-bold text-yellow-500">
            Dashboard Controllo Amministrativo
          </h1>

          <div className="mt-2">
            Stato:
            <span
              className={
                meseChiuso
                  ? "ml-2 text-red-500 font-bold"
                  : "ml-2 text-green-400 font-bold"
              }
            >
              {meseChiuso ? " CHIUSO" : " APERTO"}
            </span>
          </div>

          {loading && (
            <div className="text-yellow-500 mt-2">
              Caricamento dati...
            </div>
          )}
        </div>

        <select
          value={mese}
          onChange={(e) => setMese(e.target.value)}
          className="bg-black text-white border border-yellow-500 p-2 rounded"
        >
          {listaMesi.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

      </div>

      <div className="grid grid-cols-2 gap-6">

        <div className="border border-yellow-500 p-6 rounded">
          <h2>Saldo Cassa</h2>
          <p className={
            saldoCassa < 0
              ? "text-red-500 text-2xl font-bold"
              : "text-green-400 text-2xl font-bold"
          }>
            {saldoCassa.toFixed(2)} €
          </p>
        </div>

        <div className="border border-yellow-500 p-6 rounded">
          <h2>Saldo Banca</h2>
          <p className={
            saldoBanca < 0
              ? "text-red-500 text-2xl font-bold"
              : "text-green-400 text-2xl font-bold"
          }>
            {saldoBanca.toFixed(2)} €
          </p>
        </div>

      </div>

      {riepilogo && quotaSoci && (
        <div className="border border-yellow-500 p-6 rounded space-y-2">
          <h2 className="text-xl">Operativo</h2>

          <p>Incassi: {riepilogo.totale_incassi.toFixed(2)} €</p>
          <p>Spese: {riepilogo.totale_spese.toFixed(2)} €</p>

          <p>
            Risultato:
            <span className={
              quotaSoci.risultato_operativo >= 0
                ? "text-green-400 ml-2 font-bold"
                : "text-red-500 ml-2 font-bold"
            }>
              {quotaSoci.risultato_operativo.toFixed(2)} €
            </span>
          </p>

          <p>
            Versamenti Soci: {quotaSoci.totale_versamenti.toFixed(2)} €
          </p>

          <p>
            Differenza Finale:
            <span className={
              quotaSoci.differenza_finale > 0
                ? "text-green-400 ml-2 font-bold"
                : quotaSoci.differenza_finale < 0
                ? "text-red-500 ml-2 font-bold"
                : "text-gray-300 ml-2 font-bold"
            }>
              {quotaSoci.differenza_finale.toFixed(2)} €
            </span>
          </p>
        </div>
      )}

      <div className="flex justify-between">

        <button
          onClick={chiudiMese}
          disabled={meseChiuso || quotaSoci?.differenza_finale < 0}
          className="bg-red-600 text-white px-6 py-2 rounded disabled:opacity-50"
        >
          Chiudi Mese
        </button>

        <a
          href={`/api/report?mese=${mese}`}
          target="_blank"
          className="bg-yellow-500 text-black px-6 py-2 rounded"
        >
          Genera Report PDF
        </a>

      </div>

    </div>
  )
}
