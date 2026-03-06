"use client"

import { useEffect, useState } from "react"
import { useMese } from "@/lib/MeseContext"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import {
  inizializzaMese,
  calcolaSaldi,
  calcolaRiepilogoOperativo,
  calcolaQuotaSoci,
  generaSezioneAffitto,
  verificaMeseChiuso
} from "@/lib/gestioneMese"

export default function DashboardPage() {
const router = useRouter()
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

  const controllaUtente = async () => {

    const { data } = await supabase.auth.getUser()

    if (!data.user) {
      router.push("/login")
    }

  }

  controllaUtente()

}, [])
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

  const password = prompt("Inserisci password per chiudere il mese")

  if (!password) return

  try {

    const res = await fetch("/api/chiudi-mese", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mese, password })
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

      {/* HEADER */}
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

      {/* SALDI */}
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

      {/* OPERATIVO */}
      {riepilogo && quotaSoci && (
        <div className="border border-yellow-500 p-6 rounded space-y-2">
          <h2 className="text-xl">Operativo</h2>

          <p>
            Incassi:
            <span className="text-green-400 ml-2 font-bold">
              {riepilogo.totale_incassi.toFixed(2)} €
            </span>
          </p>

          <p>
            Spese:
            <span className="text-red-500 ml-2 font-bold">
              {riepilogo.totale_spese.toFixed(2)} €
            </span>
          </p>

          <p>
           Totale costi da ripartire:
  <span className={
    quotaSoci.perdita > 0
      ? "text-red-500 ml-2 font-bold"
      : "text-green-400 ml-2 font-bold"
  }>
    {quotaSoci.perdita.toFixed(2)} €
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

     {/* RIPARTIZIONE SOCI */}
{quotaSoci && (
  <div className="border border-yellow-500 p-6 rounded">

    <h2 className="text-xl mb-4">Ripartizione Soci</h2>

    {/* HEADER TABELLA */}
    <div className="grid grid-cols-6 font-bold border-b border-yellow-500 pb-2 mb-2 text-sm">
      <div>Socio</div>
      <div className="text-red-500">Spesa</div>
      <div className="text-green-400">Cassa</div>
      <div className="text-red-500">Da versare</div>
      <div className="text-green-400">Versato</div>
      <div>Diff</div>
    </div>

    {quotaSoci.soci.map((s: any) => (

      <div
        key={s.id}
        className="grid grid-cols-6 border-b border-yellow-500 py-2 text-sm"
      >

        <div>{s.nome}</div>

        <div className="text-red-500 font-bold">
          {(s.quota_spesa ?? 0).toFixed(2)} €
        </div>

        <div className="text-green-400 font-bold">
          {(s.quota_cassa ?? 0).toFixed(2)} €
        </div>

        <div className="text-red-500 font-bold">
          {(s.quota_calcolata ?? 0).toFixed(2)} €
        </div>

        <div className="text-green-400 font-bold">
          {(s.versato ?? 0).toFixed(2)} €
        </div>

        <div
          className={
            s.differenza > 0
              ? "text-green-400 font-bold"
              : s.differenza < 0
              ? "text-red-500 font-bold"
              : "text-gray-400"
          }
        >
          {(s.differenza ?? 0).toFixed(2)} €
        </div>

      </div>

    ))}

  </div>
)}

   {/* AFFITTO */}
{affitto && (
  <div className="border border-yellow-500 p-6 rounded">

    <h2 className="text-xl mb-4">Affitto</h2>

    <div className="mb-4">
      Costo mensile:
      <span className="text-red-500 font-bold ml-2">
        {(affitto.costo_mensile ?? 0).toFixed(2)} €
      </span>
    </div>

    {/* HEADER */}
    <div className="grid grid-cols-4 font-bold border-b border-yellow-500 pb-2 mb-2 text-sm">
      <div>Socio</div>
      <div className="text-red-500">Quota</div>
      <div className="text-green-400">Versato</div>
      <div>Diff</div>
    </div>

    {affitto.soci.map((s: any) => {

      const diff = (s.versato ?? 0) - (s.quota ?? 0)

      return (

        <div
          key={s.id}
          className="grid grid-cols-4 border-b border-yellow-500 py-2 text-sm"
        >

          <div>{s.nome}</div>

          <div className="text-red-500 font-bold">
            {(s.quota ?? 0).toFixed(2)} €
          </div>

          <div className="text-green-400 font-bold">
            {(s.versato ?? 0).toFixed(2)} €
          </div>

          <div
            className={
              diff > 0
                ? "text-green-400 font-bold"
                : diff < 0
                ? "text-red-500 font-bold"
                : "text-gray-400"
            }
          >
            {diff.toFixed(2)} €
          </div>

        </div>

      )

    })}

  </div>
)}

      {/* AZIONI */}
<div className="flex justify-between">

  <button
    onClick={chiudiMese}
    disabled={meseChiuso || quotaSoci?.differenza_finale < 0}
    className="bg-red-600 text-white px-6 py-2 rounded disabled:opacity-50"
  >
    Chiudi Mese
  </button>

  {meseChiuso && (
    <button
      onClick={async () => {

        const password = prompt("Inserisci password per riaprire il mese")
        if (!password) return

        const res = await fetch("/api/riapri-mese", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mese, password })
        })

        const data = await res.json()

        if (!res.ok) {
          alert(data.error || "Errore riapertura")
          return
        }

        alert("Mese riaperto correttamente")
        caricaDashboard()
      }}
      className="bg-blue-600 text-white px-6 py-2 rounded"
    >
      Riapri Mese
    </button>
  )}

</div>

    </div>
  )
}
