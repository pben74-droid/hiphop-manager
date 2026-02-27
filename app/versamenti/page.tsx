"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { verificaMeseAperto, calcolaQuotaSoci } from "@/lib/gestioneMese"
import { useMese } from "@/lib/MeseContext"

export default function VersamentiPage() {
  const { mese } = useMese()

  const [soci, setSoci] = useState<any[]>([])
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
    const { data: sociData } = await supabase
      .from("soci")
      .select("*")
      .order("nome")

    setSoci(sociData || [])

    const quota = await calcolaQuotaSoci(mese)
    setQuotaData(quota)

    const { data: vers } = await supabase
      .from("versamenti_soci")
      .select("*")
      .eq("mese", mese)
      .order("data", { ascending: false })

    setVersamenti(vers || [])
  }

  const getResiduo = (id: string) => {
    const socioQuota = quotaData?.soci?.find((s: any) => s.id === id)
    return socioQuota ? Number(socioQuota.differenza) : 0
  }

  const handleSubmit = async () => {
    if (!socioId || !importo) return

    await verificaMeseAperto(mese)

    const residuo = getResiduo(socioId)

    if (residuo <= 0) return

    if (Number(importo) > residuo) {
      alert(`Il massimo versabile è ${residuo} €`)
      return
    }

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

  const perdita = quotaData?.perdita ?? 0

  return (
    <div className="space-y-10">

      <h1 className="text-3xl font-bold text-yellow-500">
        Versamenti Soci
      </h1>

      <div className="border border-yellow-500 p-6 rounded">

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

          {soci.map((s) => {
            const residuo = getResiduo(s.id)
            const disabilitato = perdita === 0 || residuo <= 0

            return (
              <option
                key={s.id}
                value={s.id}
                disabled={disabilitato}
              >
                {s.nome} | Residuo: {residuo} €
                {disabilitato ? " (Coperto)" : ""}
              </option>
            )
          })}
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
            <th className="p-2">Data</th>
            <th className="p-2">Mese</th>
            <th className="p-2">Socio</th>
            <th className="p-2">Importo</th>
          </tr>
        </thead>
        <tbody>
          {versamenti.map((v) => {
            const socio = soci.find((s) => s.id === v.socio_id)
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
