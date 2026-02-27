"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { calcolaQuotaSoci } from "@/lib/gestioneMese"

export default function Dashboard() {
  const [mese] = useState("2026-02")
  const [riepilogo, setRiepilogo] = useState<any>(null)
  const [movimenti, setMovimenti] = useState<any[]>([])
  const [affitto, setAffitto] = useState<any[]>([])

  useEffect(() => {
    caricaDati()
  }, [])

  const caricaDati = async () => {
    const risultato = await calcolaQuotaSoci(mese)
    setRiepilogo(risultato)

    const { data: mov } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese)

    setMovimenti(mov || [])

    const { data: aff } = await supabase
      .from("affitto")
      .select("*")
      .eq("mese", mese)

    setAffitto(aff || [])
  }

  if (!riepilogo) return <div className="p-10 text-white">Caricamento...</div>

  // 🔹 OPERATIVO
  const totaleIncassi = movimenti
    .filter(m => m.tipo === "incasso")
    .reduce((acc, m) => acc + Number(m.importo), 0)

  const totaleSpese = movimenti
    .filter(m => m.tipo === "spesa")
    .reduce((acc, m) => acc + Number(m.importo), 0)

  // 🔹 CONTENITORI
  const saldoCassa = movimenti
    .filter(m => m.contenitore === "cassa_operativa")
    .reduce((acc, m) => acc + Number(m.importo), 0)

  const saldoBanca = movimenti
    .filter(m => m.contenitore === "banca")
    .reduce((acc, m) => acc + Number(m.importo), 0)

  // 🔹 AFFITTO
  const totaleAffittoVersato = affitto.reduce(
    (acc, a) => acc + Number(a.versato || 0),
    0
  )

  return (
    <div className="p-10 text-white space-y-10">

      <h1 className="text-4xl font-bold">
        HIP HOP FAMILY MANAGER
      </h1>

      {/* OPERATIVO */}
      <div className="border border-yellow-500 p-6 rounded">
        <h2 className="text-2xl mb-4">📊 Operativo</h2>
        <p>Totale Incassi: <span className="text-green-400">{totaleIncassi} €</span></p>
        <p>Totale Spese: <span className="text-red-400">{totaleSpese} €</span></p>
        <p>
          Risultato Operativo:{" "}
          <span className={riepilogo.risultato_operativo >= 0 ? "text-green-400" : "text-red-400"}>
            {riepilogo.risultato_operativo} €
          </span>
        </p>
      </div>

      {/* CONTENITORI */}
      <div className="border border-yellow-500 p-6 rounded">
        <h2 className="text-2xl mb-4">🏦 Contenitori</h2>
        <p>Cassa Operativa: {saldoCassa} €</p>
        <p>Banca: {saldoBanca} €</p>
      </div>

      {/* AFFITTO */}
      <div className="border border-yellow-500 p-6 rounded">
        <h2 className="text-2xl mb-4">🏠 Affitto</h2>
        <p>Versato totale: {totaleAffittoVersato} €</p>
      </div>

      {/* SOCI */}
      <div className="border border-yellow-500 p-6 rounded">
        <h2 className="text-2xl mb-4">👥 Situazione Soci</h2>

        {riepilogo.perdita > 0 ? (
          riepilogo.soci.map((s: any) => (
            <div key={s.id} className="flex justify-between mb-2">
              <span>{s.nome}</span>
              <span>
                Quota: {s.quota_calcolata} € | Versato: {s.versato} € |{" "}
                <span className={s.differenza === 0 ? "text-green-400" : "text-red-400"}>
                  Diff: {s.differenza} €
                </span>
              </span>
            </div>
          ))
        ) : (
          <p className="text-green-400">Nessuna perdita da coprire</p>
        )}

        <p className="mt-4">
          Stato chiusura:{" "}
          <span className={riepilogo.chiudibile ? "text-green-400" : "text-red-400"}>
            {riepilogo.chiudibile ? "CHIUDIBILE" : "NON CHIUDIBILE"}
          </span>
        </p>
      </div>

      {/* NAV */}
      <div className="grid grid-cols-2 gap-6">
        <Link href="/incassi">
          <div className="bg-black border border-yellow-500 p-6 rounded hover:bg-yellow-500 hover:text-black transition cursor-pointer">
            💰 Incassi
          </div>
        </Link>

        <Link href="/spese">
          <div className="bg-black border border-yellow-500 p-6 rounded hover:bg-yellow-500 hover:text-black transition cursor-pointer">
            🧾 Spese
          </div>
        </Link>

        <Link href="/soci">
          <div className="bg-black border border-yellow-500 p-6 rounded hover:bg-yellow-500 hover:text-black transition cursor-pointer">
            👥 Soci
          </div>
        </Link>

        <Link href="/chiusura">
          <div className="bg-black border border-yellow-500 p-6 rounded hover:bg-yellow-500 hover:text-black transition cursor-pointer">
            🔒 Chiusura
          </div>
        </Link>
      </div>

    </div>
  )
}
