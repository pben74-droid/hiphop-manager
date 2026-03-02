"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useMese } from "@/lib/MeseContext"
import { verificaMeseChiuso, calcolaQuotaSoci } from "@/lib/gestioneMese"

export default function VersamentiPage() {

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

    const { error: erroreVersamento } = await supabase
      .from("versamenti_soci")
      .insert({
        mese,
        socio_id: socioSelezionato,
        importo: valore,
        tipo: "contanti",
        data: oggi
      })

    if (erroreVersamento) {
      alert("Errore salvataggio versamento: " + erroreVersamento.message)
      return
    }

    const { error: erroreMovimento } = await supabase
      .from("movimenti_finanziari")
      .insert({
        mese,
        tipo: "incasso",
        categoria: "versamento_socio",
        contenitore: "cassa_operativa",
        importo: valore,
        data: oggi,
        descrizione: "Versamento socio"
      })

    if (erroreMovimento) {
      alert("Errore salvataggio movimento cassa: " + erroreMovimento.message)
      return
    }

    setImporto("")
    inizializza()
  }

  const elimina = async (id: string) => {

    if (bloccato) return

    // 1️⃣ Recupero il versamento prima di eliminarlo
    const { data: versamento } = await supabase
      .from("versamenti_soci")
      .select("*")
      .eq("id", id)
      .single()

    if (!versamento) return

    // 2️⃣ Elimino movimento finanziario collegato
    await supabase
      .from("movimenti_finanziari")
      .delete()
      .eq("mese", versamento.mese)
      .eq("categoria", "versamento_socio")
      .eq("importo", versamento.importo)
      .eq("data", versamento.data)

    // 3️⃣ Elimino versamento socio
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
