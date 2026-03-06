"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useMese } from "@/lib/MeseContext"
import { verificaMeseChiuso } from "@/lib/gestioneMese"
import useRequireAuth from "@/lib/useRequireAuth"
export default function AffittoPage() {
useRequireAuth()
  const { mese } = useMese()

  const [bloccato, setBloccato] = useState(false)
  const [costoMensile, setCostoMensile] = useState("")
  const [soci, setSoci] = useState<any[]>([])
  const [pagamenti, setPagamenti] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!mese) return
    inizializza()
  }, [mese])

  const inizializza = async () => {

    setLoading(true)

    const chiuso = await verificaMeseChiuso(mese)
    setBloccato(chiuso)

    const { data: affittoMese } = await supabase
      .from("affitto_mese")
      .select("*")
      .eq("mese", mese)
      .maybeSingle()

    if (affittoMese) {
      setCostoMensile(String(affittoMese.costo_mensile))
    }

    const { data: sociData } = await supabase
      .from("soci")
      .select("*")

    setSoci(sociData || [])

    const { data: pagamentiData } = await supabase
      .from("affitto_pagamenti")
      .select("*")
      .eq("mese", mese)

    setPagamenti(pagamentiData || [])

    setLoading(false)
  }

  const salvaCosto = async () => {

    if (bloccato) return

    await supabase
      .from("affitto_mese")
      .upsert({
        mese,
        costo_mensile: Number(costoMensile)
      })

    alert("Costo affitto salvato")
  }

  const registraPagamento = async (socioId: string, importo: number) => {

    if (bloccato) return

    await supabase.from("affitto_pagamenti").insert({
      mese,
      socio_id: socioId,
      importo,
      data: new Date().toISOString().slice(0, 10)
    })

    inizializza()
  }

  const annullaPagamento = async (id: string) => {

    if (bloccato) return

    await supabase
      .from("affitto_pagamenti")
      .delete()
      .eq("id", id)

    inizializza()
  }

  if (loading) {
    return <div className="p-6 text-yellow-500">Caricamento...</div>
  }

  if (bloccato) {
    return (
      <div className="p-6 text-red-500 font-bold">
        Mese chiuso. Modifiche non consentite.
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-2xl text-yellow-500 font-bold">
        Gestione Affitto – {mese}
      </h1>

      {/* COSTO AFFITTO */}
      <div className="border border-yellow-500 p-4 rounded space-y-3">
        <h2 className="text-lg">Importo Affitto Mensile</h2>

        <input
          type="number"
          step="0.01"
          value={costoMensile}
          onChange={(e) => setCostoMensile(e.target.value)}
          className="bg-black text-white border border-yellow-500 p-2 rounded w-40"
        />

        <button
          onClick={salvaCosto}
          className="bg-yellow-500 text-black px-4 py-2 rounded"
        >
          Salva
        </button>
      </div>

      {/* ELENCO SOCI */}
      <div className="border border-yellow-500 p-4 rounded">
        <h2 className="text-lg mb-4">Ripartizione Soci</h2>

        {soci.map((s) => {

          const quota = Number(costoMensile || 0) *
            (Number(s.quota_percentuale) / 100)

          const versato = pagamenti
            .filter(p => p.socio_id === s.id)
            .reduce((acc, p) => acc + Number(p.importo), 0)

          return (
            <div
              key={s.id}
              className="flex justify-between items-center border-b border-yellow-500 py-2"
            >
              <div>
                <p className="font-bold">{s.nome}</p>
                <p>Quota: {quota.toFixed(2)} €</p>
                <p>Versato: {versato.toFixed(2)} €</p>
              </div>

              <div className="flex gap-2">

                <button
                  onClick={() => registraPagamento(s.id, quota)}
                  className="bg-green-500 px-3 py-1 rounded"
                >
                  Registra Pagamento
                </button>

                {pagamenti
                  .filter(p => p.socio_id === s.id)
                  .map(p => (
                    <button
                      key={p.id}
                      onClick={() => annullaPagamento(p.id)}
                      className="bg-red-500 px-3 py-1 rounded"
                    >
                      Annulla
                    </button>
                  ))
                }

              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
