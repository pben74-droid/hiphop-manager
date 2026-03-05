 "use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useMese } from "@/lib/MeseContext"
import { sincronizzaCompensi } from "@/lib/syncCompensi"

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

  const [insegnanti,setInsegnanti] = useState<any[]>([])
  const [fasceDb,setFasceDb] = useState<any[]>([])
  const [lezioni,setLezioni] = useState<any[]>([])

  const [nome,setNome] = useState("")
  const [rimborso,setRimborso] = useState("")
  const [fasce,setFasce] = useState<any[]>([])

  const [insegnanteId,setInsegnanteId] = useState("")
  const [data,setData] = useState("")
  const [ore,setOre] = useState("")
  const [costo,setCosto] = useState("")
  const [benzina,setBenzina] = useState("")

  const [loading,setLoading] = useState(true)

  useEffect(()=>{
    if(mese) carica()
  },[mese])

  const carica = async () => {

    const {data:ins} = await supabase
      .from("insegnanti")
      .select("*")
      .order("nome")

    const {data:f} = await supabase
      .from("insegnanti_fasce")
      .select("*")

    const {data:lez} = await supabase
      .from("lezioni_insegnanti")
      .select("*")
      .eq("mese",mese)
      .order("data")

    setInsegnanti(ins || [])
    setFasceDb(f || [])
    setLezioni(lez || [])

    setLoading(false)

  }

  const aggiungiFascia = () => {

    setFasce([
      ...fasce,
      {giorno_settimana:1,ore:"",costo_orario:""}
    ])

  }

  const aggiornaFascia = (index:number,campo:string,valore:any) => {

    const nuove=[...fasce]
    nuove[index][campo]=valore
    setFasce(nuove)

  }

  const salvaInsegnante = async () => {

    if(!nome){
      alert("Inserisci nome insegnante")
      return
    }

    const {data:nuovo,error} = await supabase
      .from("insegnanti")
      .insert({
        nome,
        rimborso_benzina:Number(rimborso)||0,
        attivo:true
      })
      .select()
      .single()

    if(error){
      alert(error.message)
      return
    }

    for(const f of fasce){

      await supabase
        .from("insegnanti_fasce")
        .insert({
          insegnante_id:nuovo.id,
          giorno_settimana:f.giorno_settimana,
          ore:Number(f.ore),
          costo_orario:Number(f.costo_orario)
        })

    }

    setNome("")
    setRimborso("")
    setFasce([])

    carica()

  }

  const eliminaInsegnante = async (id:string) => {

    if(!confirm("Eliminare insegnante?")) return

    await supabase
      .from("insegnanti")
      .delete()
      .eq("id",id)

    await supabase
      .from("insegnanti_fasce")
      .delete()
      .eq("insegnante_id",id)

    carica()

  }

  const generaCalendario = async () => {

    const {data:ins} = await supabase
      .from("insegnanti")
      .select("*")
      .eq("attivo",true)

    const {data:fasce} = await supabase
      .from("insegnanti_fasce")
      .select("*")

    const [anno,meseNumero]=mese.split("-").map(Number)

    const giorniNelMese =
      new Date(anno,meseNumero,0).getDate()

    const nuoveLezioni:any[]=[]

    for(let giorno=1;giorno<=giorniNelMese;giorno++){

      const dataLezione =
        new Date(anno,meseNumero-1,giorno)

      const giornoSettimana =
        dataLezione.getDay()===0
          ?7
          :dataLezione.getDay()

      ins?.forEach(i=>{

        const fasceInsegnante =
          fasce?.filter(
            f =>
              f.insegnante_id===i.id &&
              f.giorno_settimana===giornoSettimana
          ) || []

        fasceInsegnante.forEach((f,index)=>{

          nuoveLezioni.push({

            mese,
            insegnante_id:i.id,
            data:dataLezione.toISOString().slice(0,10),
            ore:f.ore,
            costo_orario:f.costo_orario,
            rimborso_benzina:index===0 ? i.rimborso_benzina : 0,
            stato:"programmata"

          })

        })

      })

    }

    await supabase
      .from("lezioni_insegnanti")
      .delete()
      .eq("mese",mese)

    await supabase
      .from("lezioni_insegnanti")
      .insert(nuoveLezioni)

    await sincronizzaCompensi(mese)

    carica()

  }
    const salvaLezione = async () => {

    if(!insegnanteId || !data){
      alert("Inserisci insegnante e data")
      return
    }

    await supabase
      .from("lezioni_insegnanti")
      .insert({
        mese,
        insegnante_id:insegnanteId,
        data,
        ore:Number(ore),
        costo_orario:Number(costo),
        rimborso_benzina:Number(benzina),
        stato:"svolta"
      })

    await sincronizzaCompensi(mese)

    carica()

  }

  const eliminaLezione = async (id:string) => {

    await supabase
      .from("lezioni_insegnanti")
      .delete()
      .eq("id",id)

    await sincronizzaCompensi(mese)

    carica()

  }

  if(loading)
    return <div className="p-6">Caricamento...</div>

  return (

    <div className="p-6 space-y-10">

      <h1 className="text-2xl font-bold">
        Gestione Insegnanti
      </h1>

      {/* CREAZIONE INSEGNANTE */}

      <div className="border p-4 rounded bg-white space-y-4">

        <h2 className="font-bold">
          Nuovo Insegnante
        </h2>

        <input
          type="text"
          placeholder="Nome insegnante"
          value={nome}
          onChange={e=>setNome(e.target.value)}
          className="border p-2 w-full"
        />

        <input
          type="number"
          placeholder="Rimborso benzina"
          value={rimborso}
          onChange={e=>setRimborso(e.target.value)}
          className="border p-2 w-full"
        />

        {fasce.map((f,index)=>(

          <div key={index} className="flex gap-2">

            <select
              value={f.giorno_settimana}
              onChange={e =>
                aggiornaFascia(
                  index,
                  "giorno_settimana",
                  Number(e.target.value)
                )
              }
              className="border p-2"
            >

              {giorniSettimana.map(g=>(
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}

            </select>

            <input
              type="number"
              placeholder="Ore"
              value={f.ore}
              onChange={e =>
                aggiornaFascia(index,"ore",e.target.value)
              }
              className="border p-2 w-24"
            />

            <input
              type="number"
              placeholder="Costo orario"
              value={f.costo_orario}
              onChange={e =>
                aggiornaFascia(index,"costo_orario",e.target.value)
              }
              className="border p-2 w-32"
            />

          </div>

        ))}

        <button
          onClick={aggiungiFascia}
          className="bg-gray-700 text-white px-4 py-2 rounded"
        >
          Aggiungi Fascia
        </button>

        <button
          onClick={salvaInsegnante}
          className="bg-black text-white px-6 py-2 rounded"
        >
          Salva Insegnante
        </button>

      </div>

      {/* ELENCO INSEGNANTI */}

      <div className="border p-4 rounded bg-white space-y-2">

        <h2 className="font-bold">
          Insegnanti registrati
        </h2>

        {insegnanti.map(ins=>{

          const fasce =
            fasceDb.filter(
              f=>f.insegnante_id===ins.id
            )

          return(

            <div
              key={ins.id}
              className="border p-2 space-y-1"
            >

              <div className="flex justify-between">

                <strong>{ins.nome}</strong>

                <button
                  onClick={()=>eliminaInsegnante(ins.id)}
                  className="text-red-600"
                >
                  Elimina
                </button>

              </div>

              <div className="text-sm">
                Rimborso benzina: {ins.rimborso_benzina} €
              </div>

              {fasce.map(f=>(
                <div key={f.id} className="text-sm">

                  {giorniSettimana.find(
                    g=>g.value===f.giorno_settimana
                  )?.label}

                  {" — "}

                  {f.ore}h × {f.costo_orario}€

                </div>
              ))}

            </div>

          )

        })}

      </div>

      {/* GENERA CALENDARIO */}

      <button
        onClick={generaCalendario}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Genera Calendario Mese
      </button>

      {/* ELENCO LEZIONI */}

      <div className="space-y-2">

        {lezioni.map(l=>{

          const ins =
            insegnanti.find(
              i=>i.id===l.insegnante_id
            )

          return(

            <div
              key={l.id}
              className="flex justify-between border p-2"
            >

              <span>
                {l.data} — {ins?.nome} —
                {l.ore}h × {l.costo_orario}€
              </span>

              <button
                onClick={()=>eliminaLezione(l.id)}
                className="text-red-600"
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
