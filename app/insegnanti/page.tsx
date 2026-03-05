"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useMese } from "@/lib/MeseContext"

const giorniSettimana = [
  { value: 1, label: "Lunedì" },
  { value: 2, label: "Martedì" },
  { value: 3, label: "Mercoledì" },
  { value: 4, label: "Giovedì" },
  { value: 5, label: "Venerdì" },
  { value: 6, label: "Sabato" },
  { value: 7, label: "Domenica" },
]

export default function InsegnantiPage() {

  const { mese } = useMese()

  const [insegnanti, setInsegnanti] = useState<any[]>([])
  const [fasceDb, setFasceDb] = useState<any[]>([])
  const [lezioni, setLezioni] = useState<any[]>([])

  const [nome, setNome] = useState("")
  const [rimborso, setRimborso] = useState("")
  const [fasce, setFasce] = useState<any[]>([])

  const [insegnanteId, setInsegnanteId] = useState("")
  const [data, setData] = useState("")
  const [ore, setOre] = useState("")
  const [costo, setCosto] = useState("")
  const [benzina, setBenzina] = useState("")

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carica()
  }, [mese])

  const carica = async () => {

    const { data: ins } = await supabase
      .from("insegnanti")
      .select("*")
      .order("nome")

    const { data: f } = await supabase
      .from("insegnanti_fasce")
      .select("*")

    const { data: lez } = await supabase
      .from("lezioni_insegnanti")
      .select("*")
      .eq("mese", mese)
      .order("data")

    setInsegnanti(ins || [])
    setFasceDb(f || [])
    setLezioni(lez || [])

    setLoading(false)
  }

  const aggiungiFascia = () => {
    setFasce([
      ...fasce,
      { giorno_settimana: 1, ore: "", costo_orario: "" }
    ])
  }

  const aggiornaFascia = (index: number, campo: string, valore: any) => {
    const nuove = [...fasce]
    nuove[index][campo] = valore
    setFasce(nuove)
  }

  const salva = async () => {

    if (!nome) {
      alert("Inserisci nome insegnante")
      return
    }

    const { data: nuovo, error } = await supabase
      .from("insegnanti")
      .insert({
        nome,
        rimborso_benzina: Number(rimborso) || 0,
        attivo: true
      })
      .select()
      .single()

    if (error) {
      alert(error.message)
      return
    }

    for (const f of fasce) {

      const { error: fasciaError } =
        await supabase.from("insegnanti_fasce").insert({
          insegnante_id: nuovo.id,
          giorno_settimana: f.giorno_settimana,
          ore: Number(f.ore),
          costo_orario: Number(f.costo_orario)
        })

      if (fasciaError) {
        alert(fasciaError.message)
        return
      }
    }

    setNome("")
    setRimborso("")
    setFasce([])

    carica()
  }

  const elimina = async (id: string) => {
    await supabase.from("insegnanti").delete().eq("id", id)
    carica()
  }

  const autoCompila = async (id: string, dataLezione: string) => {

    setInsegnanteId(id)
    setData(dataLezione)

    if (!id || !dataLezione) return

    const giorno =
      new Date(dataLezione).getDay() === 0
        ? 7
        : new Date(dataLezione).getDay()

    const { data: fasce } = await supabase
      .from("insegnanti_fasce")
      .select("*")
      .eq("insegnante_id", id)
      .eq("giorno_settimana", giorno)

    if (!fasce || fasce.length === 0) return

    const f = fasce[0]

    setOre(f.ore)
    setCosto(f.costo_orario)

    const { data: ins } = await supabase
      .from("insegnanti")
      .select("rimborso_benzina")
      .eq("id", id)
      .single()

    setBenzina(ins?.rimborso_benzina || 0)
  }

  const salvaLezione = async () => {

    if (!insegnanteId || !data) {
      alert("Inserisci insegnante e data")
      return
    }

    const { error } = await supabase
      .from("lezioni_insegnanti")
      .insert({
        mese,
        insegnante_id: insegnanteId,
        data,
        ore: Number(ore),
        costo_orario: Number(costo),
        rimborso_benzina: Number(benzina),
        stato: "svolta"
      })

    if (error) {
      alert(error.message)
      return
    }

    setInsegnanteId("")
    setData("")
    setOre("")
    setCosto("")
    setBenzina("")

    carica()
  }

  const eliminaLezione = async (id: string) => {
    await supabase
      .from("lezioni_insegnanti")
      .delete()
      .eq("id", id)

    carica()
  }

  const generaCalendario = async () => {

    if (!mese) return

    const { data: ins } = await supabase
      .from("insegnanti")
      .select("*")
      .eq("attivo", true)

    const { data: fasce } = await supabase
      .from("insegnanti_fasce")
      .select("*")

    const [anno, meseNumero] = mese.split("-").map(Number)
    const giorniNelMese = new Date(anno, meseNumero, 0).getDate()

    const nuoveLezioni: any[] = []

    for (let giorno = 1; giorno <= giorniNelMese; giorno++) {

      const data = new Date(anno, meseNumero - 1, giorno)
      const giornoSettimana = data.getDay() === 0 ? 7 : data.getDay()

      ins?.forEach(i => {

        const fasceInsegnante =
          fasce?.filter(
            f =>
              f.insegnante_id === i.id &&
              f.giorno_settimana === giornoSettimana
          ) || []

        fasceInsegnante.forEach((f, index) => {

          nuoveLezioni.push({
            mese,
            insegnante_id: i.id,
            data: data.toISOString().slice(0,10),
            ore: f.ore,
            costo_orario: f.costo_orario,
            rimborso_benzina:
              index === 0 ? i.rimborso_benzina : 0,
            stato: "programmata"
          })

        })

      })

    }

    await supabase
      .from("lezioni_insegnanti")
      .delete()
      .eq("mese", mese)

    await supabase
      .from("lezioni_insegnanti")
      .insert(nuoveLezioni)

    carica()
  }

  if (loading) return <div className="p-6">Caricamento...</div>

  return (
    <div className="p-6 space-y-10">

      <h1 className="text-2xl font-bold">
        Gestione Insegnanti
      </h1>

      <button
        onClick={generaCalendario}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Genera Calendario Mese
      </button>

      {/* resto della pagina identico al tuo codice */}

    </div>
  )
}
