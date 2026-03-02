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

  const [saldoCassa, setSaldoCassa] = useState(0)
  const [saldoBanca, setSaldoBanca] = useState(0)
  const [riepilogo, setRiepilogo] = useState<any>(null)
  const [quotaSoci, setQuotaSoci] = useState<any>(null)
  const [affitto, setAffitto] = useState<any>(null)
  const [meseChiuso, setMeseChiuso] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!mese) return
    caricaDashboard()
  }, [mese])

  const caricaDashboard = async () => {

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

    setLoading(false)
  }

  const chiudiMese = async () => {

    const res = await fetch("/api/chiudi-mese", {
      method: "POST",
      body: JSON.stringify({ mese })
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.error)
      return
    }

    alert("Mese chiuso correttamente")
    caricaDashboard()
  }

  if (loading)
    return <div className="p-6 text-yellow-500">Caricamento...</div>

  return (
    <div className="p-8 space-y-8">

      {/* HEADER */}
      <div className="flex justify-between items-center">

        <div>
          <h1 className="text-3xl font-bold text-yellow-500">
            Dashboard Controllo Amministrativo
          </h1>

          <div className="mt-2">
            Stato Mese:
            <span
              className={
                meseChiuso
                  ? "ml-2 text-red-500 font-bold"
                  : "ml-2 text-green-400 font-bold"
              }
            >
              {meseChiuso ? "CHIUSO" : "APERTO"}
            </span>
          </div>
        </div>

        <input
          type="month"
          value={mese}
          onChange={(e) => setMese(e.target.value)}
          className="bg-black text-white border border-yellow-500 p-2 rounded"
        />
      </div>

      {/* SALDI */}
      <div className="grid grid-cols-2 gap-6">

        <div className="border border-yellow-500 p-6 rounded">
          <h2 className="text-lg mb-2">Saldo Cassa</h2>
          <p className={
            saldoCassa < 0
              ? "text-red-500 text-2xl font-bold"
              : "text-green-400 text-2xl font-bold"
          }>
            {saldoCassa.toFixed(2)} €
          </p>
        </div>

        <div className="border border-yellow-500 p-6 rounded">
          <h2 className="text-lg mb-2">Saldo Banca</h2>
          <p className={
            saldoBanca < 0
              ? "text-red-500 text-2xl font-bold"
              : "text-green-400 text-2xl font-bold"
          }>
            {saldoBanca.toFixed(2)} €
          </p>
        </div>
      </div>

      {/* OPERATIVO */}
      <div className="border border-yellow-500 p-6 rounded">
        <h2 className="text-xl mb-4">Operativo</h2>

        <p>Totale Incassi: {riepilogo?.totale_incassi.toFixed(2)} €</p>
        <p>Totale Spese: {riepilogo?.totale_spese.toFixed(2)} €</p>

        <p className="mt-3">
          Risultato Operativo:
          <span className={
            quotaSoci?.risultato_operativo >= 0
              ? "text-green-400 ml-2 font-bold"
              : "text-red-500 ml-2 font-bold"
          }>
            {quotaSoci?.risultato_operativo.toFixed(2)} €
          </span>
        </p>

        <p className="mt-2">
          Totale Versamenti Soci: {quotaSoci?.totale_versamenti.toFixed(2)} €
        </p>

        <p className="mt-2">
          Differenza Finale:
          <span className={
            quotaSoci?.differenza_finale === 0
              ? "text-green-400 ml-2 font-bold"
              : "text-red-500 ml-2 font-bold"
          }>
            {quotaSoci?.differenza_finale.toFixed(2)} €
          </span>
        </p>
      </div>

      {/* RIPARTIZIONE SOCI */}
      <div className="border border-yellow-500 p-6 rounded">
        <h2 className="text-xl mb-4">Ripartizione Soci</h2>

        {quotaSoci?.soci.map((s: any) => (
          <div
            key={s.id}
            className="flex justify-between border-b border-yellow-500 py-2"
          >
            <span>{s.nome}</span>
            <span>
              Quota: {s.quota_calcolata.toFixed(2)} € | 
              Versato: {s.versato.toFixed(2)} € | 
              <span className={
                s.differenza === 0
                  ? "text-green-400"
                  : "text-red-500 font-bold"
              }>
                Diff: {s.differenza.toFixed(2)} €
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* AFFITTO */}
      {affitto && (
        <div className="border border-yellow-500 p-6 rounded">
          <h2 className="text-xl mb-4">Affitto (Separato)</h2>

          <p>Costo Mensile: {affitto.costo_mensile.toFixed(2)} €</p>

          {affitto.soci.map((s: any) => (
            <div
              key={s.id}
              className="flex justify-between border-b border-yellow-500 py-2"
            >
              <span>{s.nome}</span>
              <span>
                Quota: {s.quota.toFixed(2)} € | 
                Versato: {s.versato.toFixed(2)} €
              </span>
            </div>
          ))}
        </div>
      )}

      {/* AZIONI */}
      <div className="flex justify-between items-center">

        <button
          onClick={chiudiMese}
          disabled={meseChiuso || quotaSoci?.differenza_finale !== 0}
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
