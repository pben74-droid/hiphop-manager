"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { verificaMeseAperto, calcolaQuotaSoci } from "@/lib/gestioneMese"
import { useMese } from "@/lib/MeseContext"

export default function VersamentiPage() {
  const { mese } = useMese()

  const [quotaData, setQuotaData] = useState<any>(null)
  const [versamenti, setVersamenti] = useState<any[]>([])
  const [socioId, setSocioId] = useState("")
  const [importo, setImporto] = useState("")
  const [dataVersamento, setDataVersamento] = useState(
    new Date().toISOString().split("T")[0]
  )

  useEffect(() => {
    caricaTutto()
  }, [mese])

  const caricaTutto = async () => {
    const quota = await calcolaQuotaSoci(mese)
    setQuotaData(quota)

    const { data } = await supabase
      .from("versamenti_soci")
      .select("*")
      .eq("mese", mese)
      .order("data", { ascending: false })

    setVersamenti(data || [])
  }

  const handleSubmit = async () => {
    await verificaMeseAperto(mese)

    await supabase.from("versamenti_soci").insert([
      {
        socio_id: socioId,
        importo: Number(importo),
        mese,
        data: dataVersamento,
      },
    ])

    setImporto("")
    setSocioId("")
    caricaTutto()
  }

  return (
    <div className="p-10">
      <h1 className="text-3xl mb-6">Versamenti Soci</h1>

      <div className="border border-yellow-500 p-6 rounded mb-10">
        <input
          type="date"
          value={dataVersamento}
          onChange={(e) => setDataVersamento(e.target.value)}
          className="block mb-4 p-2 bg-black border border-yellow-500 rounded w-full"
        />

        <select
          value={socioId}
          onChange={(e) => setSocioId(e.target.value)}
          className="block mb-4 p-2 bg-black border border-yellow-500 rounded w-full"
        >
          <option value="">Seleziona socio</option>
          {quotaData?.soci?.map((s: any) => (
            <option key={s.id} value={s.id}>
              {s.nome} | Residuo: {s.differenza} €
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Importo"
          value={importo}
          onChange={(e) => setImporto(e.target.value)}
          className="block mb-4 p-2 bg-black border border-yellow-500 rounded w-full"
        />

        <button
          onClick={handleSubmit}
          className="bg-yellow-500 text-black px-6 py-3 rounded"
        >
          Registra
        </button>
      </div>

      <table className="w-full border border-yellow-500">
        <thead>
          <tr className="bg-yellow-500 text-black">
            <th className="p-2">Data Versamento</th>
            <th className="p-2">Mese</th>
            <th className="p-2">Socio</th>
            <th className="p-2">Importo</th>
          </tr>
        </thead>
        <tbody>
          {versamenti.map((v) => {
            const socio = quotaData?.soci?.find((s: any) => s.id === v.socio_id)
            return (
              <tr key={v.id}>
                <td className="p-2">{v.data}</td>
                <td className="p-2">{v.mese}</td>
                <td className="p-2">{socio?.nome}</td>
                <td className="p-2">{v.importo} €</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
