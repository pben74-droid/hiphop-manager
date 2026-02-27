"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { verificaMeseAperto } from "@/lib/gestioneMese"
import { useMese } from "@/lib/MeseContext"

export default function SpesePage() {

  const meseContext = useMese()
  const mese = meseContext?.mese

  const [categorie, setCategorie] = useState<any[]>([])
  const [categoriaSelezionata, setCategoriaSelezionata] = useState("")
  const [importo, setImporto] = useState("")
  const [dataSpesa, setDataSpesa] = useState("")
  const [contenitore, setContenitore] = useState("cassa_operativa")
  const [lista, setLista] = useState<any[]>([])
  const [nuovaCategoria, setNuovaCategoria] = useState("")
  const [errore, setErrore] = useState("")
  const [loading, setLoading] = useState(true)

  /* ===========================
     DEBUG
  =========================== */
  useEffect(() => {
    console.log("Mese ricevuto:", mese)
  }, [mese])

  /* ===========================
     CARICAMENTO DATI
  =========================== */
  useEffect(() => {
    if (!mese) return
    caricaCategorie()
    caricaSpese()
  }, [mese])

  const caricaCategorie = async () => {
    const { data, error } = await supabase
      .from("categorie_spese")
      .select("*")
      .eq("attiva", true)
      .order("nome")

    if (error) {
      console.error("Errore categorie:", error.message)
      setErrore(error.message)
      return
    }

    setCategorie(data || [])
  }

  const caricaSpese = async () => {

    const { data, error } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese)
      .in("categoria", ["spesa_generica", "trasferimento"])
      .order("data", { ascending: false })

    if (error) {
      console.error("Errore spese:", error.message)
      setErrore(error.message)
      return
    }

    const filtrate = (data || []).filter((m) => {
      if (m.categoria !== "trasferimento") return true
      return m.contenitore === "banca"
    })

    setLista(filtrate)
    setLoading(false)
  }

  /* ===========================
     AGGIUNGI CATEGORIA
  =========================== */
  const aggiungiCategoria = async () => {

    if (!nuovaCategoria) return

    const { error } = await supabase
      .from("categorie_spese")
      .insert([{ nome: nuovaCategoria }])

    if (error) {
      setErrore(error.message)
      return
    }

    setNuovaCategoria("")
    caricaCategorie()
  }

  /* ===========================
     REGISTRA SPESA
  =========================== */
  const registraSpesa = async () => {

    try {

      if (!mese) return
      await verificaMeseAperto(mese)

      if (!categoriaSelezionata || !importo) {
        setErrore("Compila tutti i campi")
        return
      }

      const imp = Number(importo)

      if (categoriaSelezionata === "Prelevamento banca") {

        await supabase.from("movimenti_finanziari").insert([
          {
            tipo: "spesa",
            categoria: "trasferimento",
            descrizione: "Prelevamento banca",
            importo: -imp,
            contenitore: "banca",
            mese,
            data: dataSpesa
          }
        ])

        await supabase.from("movimenti_finanziari").insert([
          {
            tipo: "incasso",
            categoria: "trasferimento",
            descrizione: "Prelevamento banca",
            importo: imp,
            contenitore: "cassa_operativa",
            mese,
            data: dataSpesa
          }
        ])

      } else {

        await supabase.from("movimenti_finanziari").insert([
          {
            tipo: "spesa",
            categoria: "spesa_generica",
            descrizione: categoriaSelezionata,
            importo: -imp,
            contenitore,
            mese,
            data: dataSpesa
          }
        ])
      }

      setImporto("")
      setCategoriaSelezionata("")
      setDataSpesa("")

      caricaSpese()

    } catch (err: any) {
      setErrore(err.message)
    }
  }

  /* ===========================
     ELIMINA
  =========================== */
  const elimina = async (id: string) => {

    if (!mese) return

    await verificaMeseAperto(mese)

    const { data } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("id", id)
      .single()

    if (!data) return

    if (data.categoria === "trasferimento") {

      await supabase
        .from("movimenti_finanziari")
        .delete()
        .eq("mese", mese)
        .eq("categoria", "trasferimento")
        .eq("data", data.data)

    } else {

      await supabase
        .from("movimenti_finanziari")
        .delete()
        .eq("id", id)

    }

    caricaSpese()
  }

  if (!mese) {
    return <div className="text-yellow-500">Caricamento mese...</div>
  }

  if (loading) {
    return <div className="text-yellow-500">Caricamento spese...</div>
  }

  return (
    <div className="space-y-10">

      <h1 className="text-3xl font-bold text-yellow-500">
        Spese Generiche
      </h1>

      {errore && <div className="text-red-400">{errore}</div>}

      <div className="border border-yellow-500 p-6 rounded space-y-4">

        <select
          value={categoriaSelezionata}
          onChange={(e) => setCategoriaSelezionata(e.target.value)}
          className="p-2 bg-black border border-yellow-500 rounded w-full"
        >
          <option value="">Seleziona categoria</option>
          {categorie.map((c) => (
            <option key={c.id} value={c.nome}>
              {c.nome}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Importo"
          value={importo}
          onChange={(e) => setImporto(e.target.value)}
          className="p-2 bg-black border border-yellow-500 rounded w-full"
        />

        <input
          type="date"
          value={dataSpesa}
          onChange={(e) => setDataSpesa(e.target.value)}
          className="p-2 bg-black border border-yellow-500 rounded w-full"
        />

        <button
          onClick={registraSpesa}
          className="bg-yellow-500 text-black px-4 py-2 rounded"
        >
          Registra Spesa
        </button>

      </div>

      <div className="border border-yellow-500 p-6 rounded">

        <h2 className="mb-4">Elenco Spese</h2>

        <table className="w-full border border-yellow-500">

          <thead>
            <tr className="bg-yellow-500 text-black">
              <th className="p-2">Data</th>
              <th className="p-2">Descrizione</th>
              <th className="p-2">Importo</th>
              <th className="p-2">Azioni</th>
            </tr>
          </thead>

          <tbody>
            {lista.map((s) => (
              <tr key={s.id} className="border-t border-yellow-500">
                <td className="p-2">{s.data}</td>
                <td className="p-2">{s.descrizione}</td>
                <td className="p-2">
                  {Math.abs(Number(s.importo)).toFixed(2)} €
                </td>
                <td className="p-2">
                  <button
                    onClick={() => elimina(s.id)}
                    className="bg-red-500 px-3 py-1 rounded"
                  >
                    Elimina
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

        </table>

      </div>

    </div>
  )
}
