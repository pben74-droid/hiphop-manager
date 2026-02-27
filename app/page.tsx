"use client"

import { useEffect, useState } from "react"
import { useMese } from "@/lib/MeseContext"
import { calcolaSaldi, calcolaQuotaSoci } from "@/lib/gestioneMese"

export default function DashboardPage() {

  const { mese } = useMese()

  const [saldoCassa, setSaldoCassa] = useState(0)
  const [saldoBanca, setSaldoBanca] = useState(0)
  const [riepilogo, setRiepilogo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!mese) return
    caricaDati()
  }, [mese])

  const caricaDati = async () => {
    try {

      setLoading(true)

      const saldi = await calcolaSaldi(mese)
      setSaldoCassa(saldi.saldo_cassa)
      setSaldoBanca(saldi.saldo_banca)

      const quota = await calcolaQuotaSoci(mese)
      setRiepilogo(quota)

      setLoading(false)

    } catch (error) {
      console.error("Errore Dashboard:", error)
      setLoading(false)
    }
  }

  if (!mese) {
    return <div className="text-yellow-500">Caricamento mese...</div>
  }

  if (loading || !riepilogo) {
    return <div className="text-yellow-500">Caricamento dati...</div>
  }

  return (
    <div className="space-y-10">

      <h1 className="text-3xl font-bold text-yellow-500">
        Dashboard – {mese}
      </h1>

      {/* SALDI */}
      <div className="border border-yellow-500 p-6 rounded space-y-2">
        <h2 className="text-xl mb-4">Saldi</h2>

        <p>
          Cassa Operativa:{" "}
          <span className="text-green-400">
            {Number(saldoCassa).toFixed(2)} €
          </span>
        </p>

        <p>
          Banca:{" "}
          <span className="text-green-400">
            {Number(saldoBanca).toFixed(2)} €
          </span>
        </p>
      </div>

      {/* OPERATIVO */}
      <div className="border border-yellow-500 p-6 rounded space-y-2">
        <h2 className="text-xl mb-4">Risultato Operativo</h2>

        <p>
          Risultato:{" "}
          <span
            className={
              riepilogo.risultato_operativo >= 0
                ? "text-green-400"
                : "text-red-400"
            }
          >
            {Number(riepilogo.risultato_operativo).toFixed(2)} €
          </span>
        </p>

        <p>
          Totale Versamenti Soci:{" "}
          {Number(riepilogo.totale_versamenti || 0).toFixed(2)} €
        </p>
      </div>

      {/* RIPARTIZIONE SOCI */}
      {riepilogo.perdita > 0 && (
        <div className="border border-yellow-500 p-6 rounded">
          <h2 className="text-xl mb-4">Ripartizione Soci</h2>

          <table className="w-full border border-yellow-500">
            <thead>
              <tr className="bg-yellow-500 text-black">
                <th className="p-2">Socio</th>
                <th className="p-2">Quota</th>
                <th className="p-2">Versato</th>
                <th className="p-2">Differenza</th>
              </tr>
            </thead>
            <tbody>
              {riepilogo.soci.map((s: any) => (
                <tr key={s.id} className="border-t border-yellow-500">
                  <td className="p-2">{s.nome}</td>
                  <td className="p-2">
                    {Number(s.quota_calcolata).toFixed(2)} €
                  </td>
                  <td className="p-2">
                    {Number(s.versato).toFixed(2)} €
                  </td>
                  <td
                    className={`p-2 ${
                      s.differenza === 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {Number(s.differenza).toFixed(2)} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
