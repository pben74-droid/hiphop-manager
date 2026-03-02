"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useMese } from "@/lib/MeseContext"
import { verificaMeseChiuso } from "@/lib/gestioneMese"

export default function TrasferimentiPage() {

  const { mese } = useMese()

  const [importo, setImporto] = useState("")
  const [trasferimenti, setTrasferimenti] = useState<any[]>([])
  const [meseChiuso, setMeseChiuso] = useState(false)

  useEffect(() => {
    caricaTrasferimenti()
    controllaMese()
  }, [mese])

  const controllaMese = async () => {
    const chiuso = await verificaMeseChiuso(mese)
    setMeseChiuso(chiuso)
  }

  const caricaTrasferimenti = async () => {
    const { data } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese)
      .eq("tipo", "trasferimento")
      .order("data", { ascending: false })

    setTrasferimenti(data || [])
  }

  const salvaTrasferimento = async () => {

    if (!importo) return

    const valore = Number(importo)

    // movimento uscita banca
    await supabase.from("movimenti_finanziari").insert({
      mese,
      tipo: "trasferimento",
      categoria: "trasferimento",
      contenitore: "banca",
      importo: valore,
      data: new Date().toISOString().slice(0, 10)
    })

    // movimento entrata cassa
    await supabase.from("movimenti_finanziari").insert({
      mese,
      tipo: "trasferimento",
      categoria: "trasferimento",
      contenitore: "cassa_operativa",
      importo: valore,
      data: new Date().toISOString().slice(0, 10)
    })

    setImporto("")
    caricaTrasferimenti()
  }

  return (
    <div className="space-y-8">

      <h1 className="text-3xl text-yellow-500 font-bold">
        Trasferimenti Banca → Cassa
      </h1>

      <div className="border border-yellow-500 p-6 rounded space-y-4">

        <input
          type="number"
          placeholder="Importo"
          value={importo}
          onChange={(e) => setImporto(e.target.value)}
          disabled={meseChiuso}
          className="bg-black text-white border border-yellow-500 p-2 rounded"
        />

        <button
          onClick={salvaTrasferimento}
          disabled={meseChiuso}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Registra Trasferimento
        </button>

      </div>

      <div className="border border-yellow-500 p-6 rounded">

        <h2 className="text-xl mb-4">Elenco Trasferimenti</h2>

        {trasferimenti.map((t) => (
          <div
            key={t.id}
            className="flex justify-between border-b border-yellow-500 py-2 text-blue-400"
          >
            <span>{t.data}</span>
            <span>{t.contenitore}</span>
            <span>{Number(t.importo).toFixed(2)} €</span>
          </div>
        ))}

      </div>

    </div>
  )
}
