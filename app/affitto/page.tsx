"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { verificaMeseAperto } from "@/lib/gestioneMese"
import { useMese } from "@/lib/MeseContext"

function getMesePrecedente(mese: string) {
  const [anno, meseNum] = mese.split("-").map(Number)
  const data = new Date(anno, meseNum - 2)
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`
}

export default function AffittoPage() {
  const { mese } = useMese()

  const [soci, setSoci] = useState<any[]>([])
  const [costoMensile, setCostoMensile] = useState<number>(0)
  const [pagamenti, setPagamenti] = useState<any[]>([])
  const [creditiPrecedenti, setCreditiPrecedenti] = useState<any[]>([])

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

    if (affittoData) setCostoMensile(Number(affittoData.costo_mensile))

    const { data: pagamentiData } = await supabase
      .from("affitto_pagamenti")
      .select("*")
      .eq("mese", mese)

    setPagamenti(pagamentiData || [])

    const mesePrecedente = getMesePrecedente(mese)

    const { data: creditiData } = await supabase
      .from("affitto_crediti")
      .select("*")
      .eq("mese_destinazione", mese)

    setCreditiPrecedenti(creditiData || [])
  }

  const quotaSocio = (percentuale: number) =>
    Number((costoMensile * (percentuale / 100)).toFixed(2))

  const getVersato = (socioId: string) =>
    pagamenti
      .filter(p => p.socio_id === socioId)
      .reduce((acc, p) => acc + Number(p.importo), 0)

  const getCreditoPrecedente = (socioId: string) => {
    const credito = creditiPrecedenti.find(c => c.socio_id === socioId)
    return credito ? Number(credito.importo) : 0
  }

  const registraPagamento = async (socio: any) => {
    await verificaMeseAperto(mese)

    const quota = quotaSocio(Number(socio.quota_percentuale))
    const creditoPrec = getCreditoPrecedente(socio.id)
    const quotaNetta = Math.max(quota - creditoPrec, 0)

    await supabase.from("affitto_pagamenti").insert([
      {
        mese,
        socio_id: socio.id,
        importo: quotaNetta,
        data: new Date().toISOString().split("T")[0]
      }
    ])

    const nuovoCredito = creditoPrec > quota ? creditoPrec - quota : 0

    if (nuovoCredito > 0) {
      await supabase.from("affitto_crediti").insert([
        {
          socio_id: socio.id,
          mese_origine: mese,
          mese_destinazione: "",
          importo: nuovoCredito
        }
      ])
    }

    caricaDati()
  }

  return (
    <div className="space-y-10">

      <h1 className="text-3xl text-yellow-500 font-bold">
        Gestione Affitto
      </h1>

      <div className="border border-yellow-500 p-6 rounded">
        <input
          type="number"
          value={costoMensile}
          onChange={(e) => setCostoMensile(Number(e.target.value))}
          className="p-2 bg-black border border-yellow-500 rounded w-full mb-4"
        />
      </div>

      <table className="w-full border border-yellow-500">
        <thead>
          <tr className="bg-yellow-500 text-black">
            <th className="p-2">Socio</th>
            <th className="p-2">Quota</th>
            <th className="p-2">Credito Prec.</th>
            <th className="p-2">Da Pagare</th>
            <th className="p-2">Versato</th>
            <th className="p-2">Stato</th>
            <th className="p-2">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {soci.map((s) => {
            const quota = quotaSocio(Number(s.quota_percentuale))
            const creditoPrec = getCreditoPrecedente(s.id)
            const quotaNetta = Math.max(quota - creditoPrec, 0)
            const versato = getVersato(s.id)
            const pagato = versato >= quotaNetta

            return (
              <tr key={s.id} className="border-t border-yellow-500">
                <td className="p-2">{s.nome}</td>
                <td className="p-2">{quota} €</td>
                <td className="p-2 text-blue-400">{creditoPrec} €</td>
                <td className="p-2">{quotaNetta} €</td>
                <td className="p-2">{versato} €</td>
                <td className={`p-2 ${pagato ? "text-green-400" : "text-red-400"}`}>
                  {pagato ? "Pagato" : "Da Pagare"}
                </td>
                <td className="p-2">
                  <button
                    onClick={() => registraPagamento(s)}
                    className="bg-green-500 text-black px-3 py-1 rounded"
                  >
                    Registra
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

    </div>
  )
}
