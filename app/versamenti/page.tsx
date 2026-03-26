"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useMese } from "@/lib/MeseContext"
import { verificaMeseChiuso, calcolaQuotaSoci } from "@/lib/gestioneMese"
import useRequireAuth from "@/lib/useRequireAuth"

export default function VersamentiPage() {
  useRequireAuth()

  const { mese } = useMese()

  const [bloccato, setBloccato] = useState(false)
  const [soci, setSoci] = useState<any[]>([])
  const [socioSelezionato, setSocioSelezionato] = useState("")
  const [importo, setImporto] = useState("")
  const [versamenti, setVersamenti] = useState<any[]>([])
  const [riepilogo, setRiepilogo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!mese) return
    inizializza()
  }, [mese])

  const inizializza = async () => {
    setLoading(true)

    const chiuso = await verificaMeseChiuso(mese)
    setBloccato(chiuso)

    const { data: sociData } = await supabase
      .from("soci")
      .select("*")
      .order("nome")

    setSoci(sociData || [])

    const { data: versamentiData } = await supabase
      .from("versamenti_soci")
      .select("*")
      .eq("mese", mese)
      .order("data", { ascending: false })

    setVersamenti(versamentiData || [])

    const quota = await calcolaQuotaSoci(mese)
    setRiepilogo(quota)

    setLoading(false)
  }

  const salva = async () => {
    if (bloccato) return

    if (!socioSelezionato || !importo) {
      alert("Compila i campi")
      return
    }

    const valore = Number(importo)
    const oggi = new Date().toISOString().slice(0, 10)

    // 1️⃣ Salvo versamento (NON in cassa)
    const { error } = await supabase
      .from("versamenti_soci")
      .insert({
        mese,
        socio_id: socioSelezionato,
        importo: valore,
        tipo: "contanti",
        data: oggi
      })

    if (error) {
      alert("Errore salvataggio versamento: " + error.message)
      return
    }

    // 2️⃣ Recupero dati aggiornati
    const { data: sociList } = await supabase
      .from("soci")
      .select("id")

    const { data: versamentiAggiornati } = await supabase
      .from("versamenti_soci")
      .select("*")
      .eq("mese", mese)

    const quota = await calcolaQuotaSoci(mese)

    // 3️⃣ Controllo tutti pagati (FIX QUI)
    const tuttiPagati = sociList.every(s => {

      const totaleVersato = versamentiAggiornati
        .filter(v => v.socio_id === s.id)
        .reduce((acc, v) => acc + Number(v.importo), 0)

      const socioRiepilogo = quota.soci.find(x => x.id === s.id)
      const quotaSocio = socioRiepilogo?.quota_calcolata || 0

      return totaleVersato >= quotaSocio
    })

    // 4️⃣ Se tutti pagano → entra in cassa UNA VOLTA
    if (tuttiPagati) {

      const totaleVersamenti = versamentiAggiornati.reduce(
        (acc, v) => acc + Number(v.importo),
        0
      )

      const { data: giàInserito } = await supabase
        .from("movimenti_finanziari")
        .select("*")
        .eq("mese", mese)
        .eq("categoria", "versamenti_soci_batch")
        .maybeSingle()

      if (!giàInserito) {
        await supabase
          .from("movimenti_finanziari")
          .insert({
            mese,
            tipo: "incasso",
            categoria: "versamenti_soci_batch",
            contenitore: "cassa_operativa",
            importo: totaleVersamenti,
            data: oggi,
            descrizione: "Versamenti soci consolidati"
          })
      }
    }

    setImporto("")
    inizializza()
  }

  const elimina = async (id: string) => {
    if (bloccato) return

    await supabase
      .from("versamenti_soci")
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
        Versamenti Soci – {mese}
      </h1>

      <div className="border border-yellow-500 p-4 rounded space-y-3">

        <select
          value={socioSelezionato}
          onChange={(e) => setSocioSelezionato(e.target.value)}
          className="bg-black text-white border border-yellow-500 p-2 rounded w-full"
        >
          <option value="">Seleziona Socio</option>
          {soci.map(s => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>

        <input
          type="number"
          step="0.01"
          placeholder="Importo"
          value={importo}
          onChange={(e) => setImporto(e.target.value)}
          className="bg-black text-white border border-yellow-500 p-2 rounded w-full"
        />

        <button
          onClick={salva}
          className="bg-yellow-500 text-black px-4 py-2 rounded"
        >
          Registra Versamento
        </button>
      </div>

      {riepilogo && (
        <div className="border border-yellow-500 p-4 rounded">
          <h2 className="text-lg mb-4">Ripartizione</h2>

          {riepilogo.soci.map((s: any) => (
            <div
              key={s.id}
              className="flex justify-between border-b border-yellow-500 py-2"
            >
              <span>{s.nome}</span>
              <span>
                Quota: {s.quota_calcolata.toFixed(2)} € | 
                Versato: {s.versato.toFixed(2)} € | 
                <span className={
                  s.differenza > 0
                    ? "text-green-400 font-bold"
                    : s.differenza < 0
                    ? "text-red-500 font-bold"
                    : "text-gray-300"
                }>
                  Differenza: {s.differenza.toFixed(2)} €
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="border border-yellow-500 p-4 rounded">
        <h2 className="text-lg mb-4">Elenco Versamenti</h2>

        {versamenti.map(v => {
          const socio = soci.find(s => s.id === v.socio_id)

          return (
            <div
              key={v.id}
              className="flex justify-between items-center border-b border-yellow-500 py-2"
            >
              <div>
                <p>{socio?.nome}</p>
                <p>{Number(v.importo).toFixed(2)} €</p>
                <p className="text-sm text-gray-400">{v.data}</p>
              </div>

              <button
                onClick={() => elimina(v.id)}
                className="bg-red-500 px-3 py-1 rounded"
              >
                Elimina
              </button>
            </div>
          )
        })}
      </div>

    </div>
  )
}
