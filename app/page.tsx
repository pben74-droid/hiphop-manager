"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { calcolaQuotaSoci, inizializzaMese } from "@/lib/gestioneMese"
import { useMese } from "@/lib/MeseContext"

export default function Dashboard() {
  const { mese, setMese } = useMese()

  const [riepilogo, setRiepilogo] = useState<any>(null)
  const [movimenti, setMovimenti] = useState<any[]>([])
  const [affitto, setAffitto] = useState<any[]>([])
  const [versamenti, setVersamenti] = useState<any[]>([])
  const [mesiDisponibili, setMesiDisponibili] = useState<string[]>([])

  useEffect(() => {
    caricaMesi()
  }, [])

  useEffect(() => {
    caricaDati()
  }, [mese])

  const caricaMesi = async () => {
    const { data } = await supabase
      .from("mesi")
      .select("mese")
      .order("mese", { ascending: false })

    if (data) setMesiDisponibili(data.map((m) => m.mese))
  }

  const caricaDati = async () => {
    await inizializzaMese(mese)

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

    const { data: vers } = await supabase
      .from("versamenti_soci")
      .select("*")
      .eq("mese", mese)
      .order("data", { ascending: false })

    setVersamenti(vers || [])
  }

  if (!riepilogo) return <div className="p-10">Caricamento...</div>

  const totaleIncassi = movimenti
    .filter((m) => m.tipo === "incasso")
    .reduce((acc, m) => acc + Number(m.importo), 0)

  const totaleSpese = movimenti
    .filter((m) => m.tipo === "spesa")
    .reduce((acc, m) => acc + Number(m.importo), 0)

  const saldoCassaOperativa = movimenti
    .filter((m) => m.contenitore === "cassa_operativa")
    .reduce((acc, m) => acc + Number(m.importo), 0)

  const saldoBanca = movimenti
    .filter((m) => m.contenitore === "banca")
    .reduce((acc, m) => acc + Number(m.importo), 0)

  const saldoCassaAffitto = affitto.reduce(
    (acc, a) => acc + Number(a.versato || 0),
    0
  )

  return (
    <div className="space-y-10">

      <h1 className="text-4xl font-bold text-yellow-500">
        Dashboard Finanziaria
      </h1>

      {/* SELETTORE MESE */}
      <div>
        <label className="mr-4">Seleziona mese:</label>
        <select
          value={mese}
          onChange={(e) => setMese(e.target.value)}
          className="bg-black border border-yellow-500 p-2 rounded"
        >
          {mesiDisponibili.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* OPERATIVO */}
      <div className="border border-yellow-500 p-6 rounded">
        <h2 className="text-xl mb-4">Operativo</h2>
        <p>Incassi: {totaleIncassi} €</p>
        <p>Spese: {totaleSpese} €</p>
        <p>
          Risultato:{" "}
          <span className={riepilogo.risultato_operativo >= 0 ? "text-green-400" : "text-red-400"}>
            {riepilogo.risultato_operativo} €
          </span>
        </p>
      </div>

      {/* CONTENITORI */}
      <div className="grid grid-cols-3 gap-6">
        <div className="border border-yellow-500 p-6 rounded">
          <h3>Cassa Operativa</h3>
          <p>{saldoCassaOperativa} €</p>
        </div>

        <div className="border border-yellow-500 p-6 rounded">
          <h3>Banca</h3>
          <p>{saldoBanca} €</p>
        </div>

        <div className="border border-yellow-500 p-6 rounded">
          <h3>Cassa Affitto</h3>
          <p>{saldoCassaAffitto} €</p>
        </div>
      </div>

      {/* SITUAZIONE SOCI */}
      <div className="border border-yellow-500 p-6 rounded">
        <h2 className="text-xl mb-4">Situazione Soci</h2>

        {riepilogo.perdita > 0 ? (
          riepilogo.soci.map((s: any) => (
            <div key={s.id} className="flex justify-between mb-2">
              <span>{s.nome}</span>
              <span>
                Dovuto: {s.quota_calcolata} € | Versato: {s.versato} € | Diff: {s.differenza} €
              </span>
            </div>
          ))
        ) : (
          <p>Nessuna perdita</p>
        )}
      </div>

      {/* RIEPILOGO VERSAMENTI */}
      <div className="border border-yellow-500 p-6 rounded">
        <h2 className="text-xl mb-4">Versamenti del Mese</h2>

        <table className="w-full border border-yellow-500">
          <thead>
            <tr className="bg-yellow-500 text-black">
              <th className="p-2">Data</th>
              <th className="p-2">Socio</th>
              <th className="p-2">Importo</th>
            </tr>
          </thead>
          <tbody>
            {versamenti.map((v) => {
              const socio = riepilogo.soci.find((s: any) => s.id === v.socio_id)
              return (
                <tr key={v.id} className="border-t border-yellow-500">
                  <td className="p-2">{v.data}</td>
                  <td className="p-2">{socio?.nome}</td>
                  <td className="p-2">{v.importo} €</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}
