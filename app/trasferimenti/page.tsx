"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useMese } from "@/lib/MeseContext"
import { verificaMeseChiuso } from "@/lib/gestioneMese"
import useRequireAuth from "@/lib/useRequireAuth"

export default function TrasferimentiPage() {
useRequireAuth()
  const { mese } = useMese()

  const [importo, setImporto] = useState("")
  const [direzione, setDirezione] = useState<"banca_cassa" | "cassa_banca">("banca_cassa")
  const [trasferimenti, setTrasferimenti] = useState<any[]>([])
  const [meseChiuso, setMeseChiuso] = useState(false)

  // ✅ AGGIUNTI
  const [rettifiche, setRettifiche] = useState<any[]>([])
  const [rettificaImporto, setRettificaImporto] = useState("")
  const [rettificaConto, setRettificaConto] = useState<"cassa_operativa" | "banca">("cassa_operativa")

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

    // ✅ AGGIUNTO
    const { data: rett } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese)
      .eq("tipo", "rettifica")
      .order("data", { ascending: false })

    setRettifiche(rett || [])
  }

  const salvaTrasferimento = async () => {

    if (!importo) return

    const valore = Number(importo)

    if (valore <= 0) {
      alert("Importo non valido")
      return
    }

    const oggi = new Date().toISOString().slice(0, 10)

    let movimentoUscita
    let movimentoEntrata

    if (direzione === "banca_cassa") {
      movimentoUscita = {
        mese,
        tipo: "trasferimento",
        categoria: "trasferimento",
        contenitore: "banca",
        importo: -Math.abs(valore),
        data: oggi
      }

      movimentoEntrata = {
        mese,
        tipo: "trasferimento",
        categoria: "trasferimento",
        contenitore: "cassa_operativa",
        importo: Math.abs(valore),
        data: oggi
      }
    } else {
      movimentoUscita = {
        mese,
        tipo: "trasferimento",
        categoria: "trasferimento",
        contenitore: "cassa_operativa",
        importo: -Math.abs(valore),
        data: oggi
      }

      movimentoEntrata = {
        mese,
        tipo: "trasferimento",
        categoria: "trasferimento",
        contenitore: "banca",
        importo: Math.abs(valore),
        data: oggi
      }
    }

    const { error } = await supabase
      .from("movimenti_finanziari")
      .insert([movimentoUscita, movimentoEntrata])

    if (error) {
      console.error(error)
      alert("Errore nel salvataggio")
      return
    }

    setImporto("")
    caricaTrasferimenti()
  }

  // ✅ AGGIUNTA
  const salvaRettifica = async () => {

    if (!rettificaImporto) return

    const valore = Number(rettificaImporto)
    if (valore === 0) return

    const oggi = new Date().toISOString().slice(0, 10)

    await supabase
      .from("movimenti_finanziari")
      .insert({
        mese,
        tipo: "rettifica",
        categoria: "rettifica",
        contenitore: rettificaConto,
        importo: valore,
        data: oggi,
        descrizione: "Rettifica contabile"
      })

    setRettificaImporto("")
    caricaTrasferimenti()
  }

  const eliminaMovimento = async (id: string) => {

    if (meseChiuso) return

    const conferma = confirm("Vuoi cancellare questo movimento?")
    if (!conferma) return

    const { error } = await supabase
      .from("movimenti_finanziari")
      .delete()
      .eq("id", id)

    if (error) {
      alert("Errore nella cancellazione")
      return
    }

    caricaTrasferimenti()
  }

  return (
    <div className="space-y-8">

      <h1 className="text-3xl text-yellow-500 font-bold">
        Trasferimenti
      </h1>

      <div className="border border-yellow-500 p-6 rounded space-y-4">

        <select
          value={direzione}
          onChange={(e) => setDirezione(e.target.value as any)}
          disabled={meseChiuso}
          className="bg-black text-white border border-yellow-500 p-2 rounded"
        >
          <option value="banca_cassa">Banca → Cassa</option>
          <option value="cassa_banca">Cassa → Banca</option>
        </select>

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

      {/* ✅ RETTIFICA */}
      <div className="border border-yellow-500 p-6 rounded space-y-4">

        <h2 className="text-xl">Rettifica Contabile</h2>

        <select
          value={rettificaConto}
          onChange={(e) => setRettificaConto(e.target.value as any)}
          disabled={meseChiuso}
          className="bg-black text-white border border-yellow-500 p-2 rounded"
        >
          <option value="cassa_operativa">Cassa</option>
          <option value="banca">Banca</option>
        </select>

        <input
          type="number"
          placeholder="Importo (+ o -)"
          value={rettificaImporto}
          onChange={(e) => setRettificaImporto(e.target.value)}
          disabled={meseChiuso}
          className="bg-black text-white border border-yellow-500 p-2 rounded"
        />

        <button
          onClick={salvaRettifica}
          disabled={meseChiuso}
          className="bg-yellow-600 text-black px-4 py-2 rounded disabled:opacity-50"
        >
          Registra Rettifica
        </button>

      </div>

      <div className="border border-yellow-500 p-6 rounded">

        <h2 className="text-xl mb-4">Elenco Trasferimenti</h2>

        {trasferimenti.map((t) => (
          <div
            key={t.id}
            className="flex justify-between items-center border-b border-yellow-500 py-2 text-blue-400"
          >
            <span>{t.data}</span>
            <span>{t.contenitore}</span>
            <span>{Number(t.importo).toFixed(2)} €</span>

            {!meseChiuso && (
              <button
                onClick={() => eliminaMovimento(t.id)}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm"
              >
                Cancella
              </button>
            )}
          </div>
        ))}

      </div>

      {/* ✅ ELENCO RETTIFICHE */}
      <div className="border border-yellow-500 p-6 rounded">

        <h2 className="text-xl mb-4">Elenco Rettifiche</h2>

        {rettifiche.map((r) => (
          <div
            key={r.id}
            className="flex justify-between items-center border-b border-yellow-500 py-2 text-yellow-400"
          >
            <span>{r.data}</span>
            <span>{r.contenitore}</span>
            <span>{Number(r.importo).toFixed(2)} €</span>

            {!meseChiuso && (
              <button
                onClick={() => eliminaMovimento(r.id)}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm"
              >
                Cancella
              </button>
            )}
          </div>
        ))}

      </div>

    </div>
  )
}
