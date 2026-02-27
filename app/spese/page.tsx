"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { verificaMeseAperto } from "@/lib/gestioneMese"
import { useMese } from "@/lib/MeseContext"

export default function SpesePage() {

  const { mese } = useMese()

  const [categorie, setCategorie] = useState<any[]>([])
  const [categoriaSelezionata, setCategoriaSelezionata] = useState("")
  const [importo, setImporto] = useState("")
  const [dataSpesa, setDataSpesa] = useState("")
  const [contenitore, setContenitore] = useState("cassa_operativa")
  const [lista, setLista] = useState<any[]>([])
  const [nuovaCategoria, setNuovaCategoria] = useState("")
  const [errore, setErrore] = useState("")

  useEffect(() => {
    caricaCategorie()
  }, [])

  useEffect(() => {
    caricaSpese()
  }, [mese])

  const caricaCategorie = async () => {
    const { data } = await supabase
      .from("categorie_spese")
      .select("*")
      .eq("attiva", true)
      .order("nome")

    setCategorie(data || [])
  }

  const caricaSpese = async () => {

    const { data } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese)
      .in("categoria", ["spesa_generica", "trasferimento"])
      .order("data", { ascending: false })

    // Mostriamo solo la riga banca nei trasferimenti
    const filtrate = (data || []).filter((m) => {
      if (m.categoria !== "trasferimento") return true
      return m.contenitore === "banca"
    })

    setLista(filtrate)
  }

  const aggiungiCategoria = async () => {

    if (!nuovaCategoria) return

    const { error } = await supabase
      .from("categorie_spese")
      .insert([{ nome: nuovaCategoria }])

    if (!error) {
      setNuovaCategoria("")
      caricaCategorie()
    }
  }

  const registraSpesa = async () => {

    try {

      setErrore("")
      await verificaMeseAperto(mese)

      if (!categoriaSelezionata || !importo) {
        setErrore("Compila tutti i campi")
        return
      }

      const imp = Number(importo)

      if (categoriaSelezionata === "Prelevamento banca") {

        // Movimento banca negativo
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

        // Movimento cassa positivo
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

  const elimina = async (id: string, categoria: string) => {

    await verificaMeseAperto(mese)

    if (categoria === "trasferimento") {

      // elimina entrambe le righe
      const { data } = await supabase
        .from("movimenti_finanziari")
        .select("*")
        .eq("id", id)
        .single()

      if (!data) return

      await supabase
        .from("movimenti_finanziari")
        .delete()
        .eq("mese", mese)
        .eq("categoria", "trasferimento")
        .eq("data", data.data)
        .eq("importo", Math.abs(data.importo))

    } else {

      await supabase
        .from("movimenti_finanziari")
        .delete()
        .eq("id", id)

    }

    caricaSpese()
  }

  return (
    <div className="space-y-10">

      <h1 className="text-3xl font-bold text-yellow-500">
        Spese Generiche
      </h1>

      {errore && <div className="text-red-400">{errore}</div>}

      {/* INSERIMENTO */}

      <div className="border border-yellow-500 p-6 rounded space-y-4">

        <select
          value={categoriaSelezionata}
          onChange={(e) => setCategoriaSelezionata(e.target.value)}
          className="p-2 bg-black border border-yellow-500 rounded w-full"
        >
          <option value="">Seleziona categoria</option>
          {categorie.map((c) => (
            <option key={c.id}>{c.nome}</option>
          ))}
        </select>

        {categoriaSelezionata !== "Prelevamento banca" && (
          <select
            value={contenitore}
            onChange={(e) => setContenitore(e.target.value)}
            className="p-2 bg-black border border-yellow-500 rounded w-full"
          >
            <option value="cassa_operativa">Cassa Operativa</option>
            <option value="banca">Banca</option>
          </select>
        )}

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

      {/* AGGIUNGI CATEGORIA */}

      <div className="border border-yellow-500 p-6 rounded space-y-4">

        <h2>Aggiungi Nuova Categoria</h2>

        <input
          type="text"
          placeholder="Nome categoria"
          value={nuovaCategoria}
          onChange={(e) => setNuovaCategoria(e.target.value)}
          className="p-2 bg-black border border-yellow-500 rounded w-full"
        />

        <button
          onClick={aggiungiCategoria}
          className="bg-yellow-500 text-black px-4 py-2 rounded"
        >
          Aggiungi Categoria
        </button>

      </div>

      {/* ELENCO */}

      <div className="border border-yellow-500 p-6 rounded">

        <h2 className="mb-4">Elenco Spese</h2>

        <table className="w-full border border-yellow-500">

          <thead>
            <tr className="bg-yellow-500 text-black">
              <th className="p-2">Data</th>
              <th className="p-2">Descrizione</th>
              <th className="p-2">Contenitore</th>
              <th className="p-2">Importo</th>
              <th className="p-2">Azioni</th>
            </tr>
          </thead>

          <tbody>
            {lista.map((s) => (
              <tr key={s.id} className="border-t border-yellow-500">
                <td className="p-2">{s.data}</td>
                <td className="p-2">{s.descrizione}</td>
                <td className="p-2">{s.contenitore}</td>
                <td className="p-2">
                  {Math.abs(Number(s.importo)).toFixed(2)} €
                </td>
                <td className="p-2">
                  <button
                    onClick={() => elimina(s.id, s.categoria)}
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
