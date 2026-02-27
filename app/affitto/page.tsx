"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { verificaMeseAperto } from "@/lib/gestioneMese"
import { useMese } from "@/lib/MeseContext"

export default function AffittoPage() {
  const { mese } = useMese()

  const [soci, setSoci] = useState<any[]>([])
  const [affittoRecords, setAffittoRecords] = useState<any[]>([])
  const [costoMensile, setCostoMensile] = useState<number>(0)
  const [errore, setErrore] = useState("")

  useEffect(() => {
    caricaDati()
  }, [mese])

  const caricaDati = async () => {

    const { data: sociData } = await supabase
      .from("soci")
      .select("*")
      .order("nome")

    setSoci(sociData || [])

    const { data: affittoData } = await supabase
      .from("affitto")
      .select("*")
      .eq("mese", mese)

    setAffittoRecords(affittoData || [])

    if (affittoData && affittoData.length > 0) {
      setCostoMensile(Number(affittoData[0].costo_mensile))
    }
  }

  const getVersato = (socioId: string) => {
    const record = affittoRecords.find(a => a.socio_id === socioId)
    return record ? Number(record.versato) : 0
  }

  const quotaSocio = (percentuale: number) => {
    return Number((costoMensile * (percentuale / 100)).toFixed(2))
  }

  const registraPagamento = async (socio: any) => {
    try {
      await verificaMeseAperto(mese)

      const quota = quotaSocio(Number(socio.quota_percentuale))

      await supabase.from("affitto").upsert([
        {
          mese,
          socio_id: socio.id,
          costo_mensile: costoMensile,
          versato: quota,
          data: new Date().toISOString().split("T")[0],
        }
      ])

      caricaDati()
    } catch (err: any) {
      setErrore(err.message)
    }
  }

  const annullaPagamento = async (socioId: string) => {
    try {
      await verificaMeseAperto(mese)

      await supabase
        .from("affitto")
        .delete()
        .eq("mese", mese)
        .eq("socio_id", socioId)

      caricaDati()
    } catch (err: any) {
      setErrore(err.message)
    }
  }

  return (
    <div className="space-y-10">

      <h1 className="text-3xl font-bold text-yellow-500">
        Gestione Affitto
      </h1>

      {errore && <div className="text-red-400">{errore}</div>}

      {/* Importo affitto */}
      <div className="border border-yellow-500 p-6 rounded">
        <h2 className="text-xl mb-4">Importo Affitto Mensile</h2>

        <input
          type="number"
          value={costoMensile}
          onChange={(e) => setCostoMensile(Number(e.target.value))}
          className="p-2 bg-black border border-yellow-500 rounded w-full"
        />
      </div>

      {/* Elenco Soci */}
      <div className="border border-yellow-500 p-6 rounded">
        <h2 className="text-xl mb-4">Ripartizione Soci</h2>

        <table className="w-full border border-yellow-500">
          <thead>
            <tr className="bg-yellow-500 text-black">
              <th className="p-2">Socio</th>
              <th className="p-2">% Possesso</th>
              <th className="p-2">Quota Affitto</th>
              <th className="p-2">Versato</th>
              <th className="p-2">Stato</th>
              <th className="p-2">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {soci.map((s) => {
              const quota = quotaSocio(Number(s.quota_percentuale))
              const versato = getVersato(s.id)
              const pagato = versato >= quota && quota > 0

              return (
                <tr key={s.id} className="border-t border-yellow-500">
                  <td className="p-2">{s.nome}</td>
                  <td className="p-2">{s.quota_percentuale}%</td>
                  <td className="p-2">{quota} €</td>
                  <td className="p-2">{versato} €</td>
                  <td className={`p-2 ${pagato ? "text-green-400" : "text-red-400"}`}>
                    {pagato ? "Pagato" : "Da Pagare"}
                  </td>
                  <td className="p-2 space-x-2">
                    <button
                      onClick={() => registraPagamento(s)}
                      className="bg-green-500 text-black px-3 py-1 rounded"
                    >
                      Registra Pagamento
                    </button>

                    <button
                      onClick={() => annullaPagamento(s.id)}
                      className="bg-red-500 px-3 py-1 rounded"
                    >
                      Annulla Pagamento
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}
