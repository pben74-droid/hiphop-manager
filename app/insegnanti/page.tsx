"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { verificaMeseAperto } from "@/lib/gestioneMese"
import { useMese } from "@/lib/MeseContext"

export default function InsegnantiPage() {

  const { mese } = useMese()

  const [nome, setNome] = useState("")
  const [ore, setOre] = useState("")
  const [compensoOrario, setCompensoOrario] = useState("")
  const [benzina, setBenzina] = useState("")
  const [lista, setLista] = useState<any[]>([])
  const [errore, setErrore] = useState("")

  useEffect(() => {
    caricaInsegnanti()
  }, [mese])

  const caricaInsegnanti = async () => {

    const { data, error } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese)
      .eq("categoria", "insegnante")
      .order("data", { ascending: false })

    if (error) {
      setErrore(error.message)
      return
    }

    setLista(data || [])
  }

  const registraCompenso = async () => {

    try {

      setErrore("")
      await verificaMeseAperto(mese)

      if (!nome || !ore || !compensoOrario) {
        setErrore("Compila tutti i campi obbligatori")
        return
      }

      const totale =
        Number(ore) * Number(compensoOrario) +
        Number(benzina || 0)

      const { error } = await supabase
        .from("movimenti_finanziari")
        .insert([
          {
            tipo: "spesa",
            categoria: "insegnante",
            descrizione: nome,
            importo: -totale,
            contenitore: "cassa_operativa",
            mese: mese,
            data: new Date().toISOString().split("T")[0],
            ore: Number(ore),
            compenso_orario: Number(compensoOrario),
            benzina: Number(benzina || 0)
          }
        ])

      if (error) {
        setErrore(error.message)
        return
      }

      setNome("")
      setOre("")
      setCompensoOrario("")
      setBenzina("")

      caricaInsegnanti()

    } catch (err: any) {
      setErrore(err.message)
    }
  }

  const elimina = async (id: string) => {

    try {
      await verificaMeseAperto(mese)

      const { error } = await supabase
        .from("movimenti_finanziari")
        .delete()
        .eq("id", id)

      if (error) {
        setErrore(error.message)
        return
      }

      caricaInsegnanti()

    } catch (err: any) {
      setErrore(err.message)
    }
  }

  const totaleInsegnanti =
    lista.reduce((acc, i) => acc + Math.abs(Number(i.importo)), 0)

  return (
    <div className="space-y-10">

      <h1 className="text-3xl font-bold text-yellow-500">
        Compensi Insegnanti
      </h1>

      {errore && (
        <div className="text-red-400">
          {errore}
        </div>
      )}

      {/* FORM INSERIMENTO */}

      <div className="border border-yellow-500 p-6 rounded space-y-4">

        <input
          type="text"
          placeholder="Nome insegnante"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="p-2 bg-black border border-yellow-500 rounded w-full"
        />

        <input
          type="number"
          placeholder="Ore"
          value={ore}
          onChange={(e) => setOre(e.target.value)}
          className="p-2 bg-black border border-yellow-500 rounded w-full"
        />

        <input
          type="number"
          placeholder="Compenso orario"
          value={compensoOrario}
          onChange={(e) => setCompensoOrario(e.target.value)}
          className="p-2 bg-black border border-yellow-500 rounded w-full"
        />

        <input
          type="number"
          placeholder="Benzina (opzionale)"
          value={benzina}
          onChange={(e) => setBenzina(e.target.value)}
          className="p-2 bg-black border border-yellow-500 rounded w-full"
        />

        <button
          onClick={registraCompenso}
          className="bg-yellow-500 text-black px-4 py-2 rounded"
        >
          Registra Compenso
        </button>

      </div>

      {/* RIEPILOGO */}

      <div className="border border-yellow-500 p-6 rounded">

        <h2 className="mb-4 text-xl">
          Riepilogo Insegnanti
        </h2>

        <table className="w-full border border-yellow-500">

          <thead>
            <tr className="bg-yellow-500 text-black">
              <th className="p-2">Data</th>
              <th className="p-2">Insegnante</th>
              <th className="p-2">Ore</th>
              <th className="p-2">Compenso Orario</th>
              <th className="p-2">Benzina</th>
              <th className="p-2">Totale</th>
              <th className="p-2">Azioni</th>
            </tr>
          </thead>

          <tbody>
            {lista.map((i) => (
              <tr key={i.id} className="border-t border-yellow-500">

                <td className="p-2">{i.data}</td>
                <td className="p-2">{i.descrizione}</td>
                <td className="p-2">{i.ore}</td>
                <td className="p-2">{i.compenso_orario} €</td>
                <td className="p-2">{i.benzina} €</td>
                <td className="p-2">{Math.abs(i.importo)} €</td>

                <td className="p-2">
                  <button
                    onClick={() => elimina(i.id)}
                    className="bg-red-500 px-3 py-1 rounded"
                  >
                    Elimina
                  </button>
                </td>

              </tr>
            ))}
          </tbody>

        </table>

        <div className="mt-6 text-right font-bold text-yellow-500">
          Totale Insegnanti: {totaleInsegnanti} €
        </div>

      </div>

    </div>
  )
}
