"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { verificaMeseAperto } from "@/lib/gestioneMese"
import { useMese } from "@/lib/MeseContext"

export default function AffittoPage() {
  const { mese } = useMese()

  const [soci, setSoci] = useState<any[]>([])
  const [costoMensile, setCostoMensile] = useState<number>(0)
  const [pagamenti, setPagamenti] = useState<any[]>([])

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
      .from("affitto_mese")
      .select("*")
      .eq("mese", mese)
      .maybeSingle()

    if (affittoData) {
      setCostoMensile(Number(affittoData.costo_mensile))
    }

    const { data: pagamentiData } = await supabase
      .from("affitto_pagamenti")
      .select("*")
      .eq("mese", mese)

    setPagamenti(pagamentiData || [])
  }

  const salvaCostoMensile = async () => {
    await verificaMeseAperto(mese)

    await supabase.from("affitto_mese").upsert([
      {
        mese,
        costo_mensile: costoMensile
      }
    ])
  }

  const quotaSocio = (percentuale: number) => {
    return Number((costoMensile * (percentuale / 100)).toFixed(2))
  }

  const getVersato = (socioId: string) => {
    return pagamenti
      .filter(p => p.socio_id === socioId)
      .reduce((acc, p) => acc + Number(p.importo), 0)
  }

  const registraPagamento = async (socio: any) => {
    await verificaMeseAperto(mese)

    const quota = quotaSocio(Number(socio.quota_percentuale))

    await supabase.from("affitto_pagamenti").insert([
      {
        mese,
        socio_id: socio.id,
        importo: quota,
        data: new Date().toISOString().split("T")[0]
      }
    ])

    caricaDati()
  }

  const annullaPagamento = async (socioId: string) => {
    await verificaMeseAperto(mese)

    await supabase
      .from("affitto_pagamenti")
      .delete()
      .eq("mese", mese)
      .eq("socio_id", socioId)

    caricaDati()
  }

  return (
    <div className="space-y-10">

      <h1 className="text-3xl text-yellow-500 font-bold">
        Gestione Affitto
      </h1>

      <div className="border border-yellow-500 p-6 rounded">
        <h2 className="mb-4">Importo Affitto Mensile</h2>

        <input
          type="number"
          value={costoMensile}
          onChange={(e) => setCostoMensile(Number(e.target.value))}
          className="p-2 bg-black border border-yellow-500 rounded w-full mb-4"
        />

        <button
          onClick={salvaCostoMensile}
          className="bg-yellow-500 text-black px-4 py-2 rounded"
        >
          Salva Importo
        </button>
      </div>

      <div className="border border-yellow-500 p-6 rounded">
        <h2 className="mb-4">Ripartizione Soci</h2>

        <table className="w-full border border-yellow-500">
          <thead>
            <tr className="bg-yellow-500 text-black">
              <th className="p-2">Socio</th>
              <th className="p-2">% Possesso</th>
              <th className="p-2">Quota</th>
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
                      Registra
                    </button>
                    <button
                      onClick={() => annullaPagamento(s.id)}
                      className="bg-red-500 px-3 py-1 rounded"
                    >
                      Annulla
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
