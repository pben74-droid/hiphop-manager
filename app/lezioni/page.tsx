"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useMese } from "@/lib/MeseContext"
import { sincronizzaCompensi } from "@/lib/syncCompensi"
import useRequireAuth from "@/lib/useRequireAuth"
export default function LezioniPage() {
useRequireAuth()
  const { mese } = useMese()

  const [lezioni,setLezioni] = useState<any[]>([])
  const [insegnanti,setInsegnanti] = useState<any[]>([])
  const [loading,setLoading] = useState(true)

  useEffect(()=>{
    if(mese) carica()
  },[mese])

  const carica = async () => {

    const {data:lez} = await supabase
      .from("lezioni_insegnanti")
      .select("*")
      .eq("mese",mese)
      .order("data")

    const {data:ins} = await supabase
      .from("insegnanti")
      .select("*")

    setLezioni(lez || [])
    setInsegnanti(ins || [])

    setLoading(false)

  }

  const segnaSvolta = async (l:any) => {

    await supabase
      .from("lezioni_insegnanti")
      .update({
        stato:"svolta"
      })
      .eq("id",l.id)

    await sincronizzaCompensi(mese)

    carica()

  }

  const annullaLezione = async (l:any) => {

    await supabase
      .from("lezioni_insegnanti")
      .update({
        stato:"annullata"
      })
      .eq("id",l.id)

    await sincronizzaCompensi(mese)

    carica()

  }
    const pagaLezione = async (l:any) => {

    if(l.pagato) return

    const costo =
      Number(l.ore) * Number(l.costo_orario) +
      Number(l.rimborso_benzina || 0)

    const {data:ins} = await supabase
      .from("insegnanti")
      .select("nome")
      .eq("id",l.insegnante_id)
      .single()

    const nome = ins?.nome || "Insegnante"

    await supabase
      .from("lezioni_insegnanti")
      .update({
        pagato:true,
        data_pagamento:new Date().toISOString().slice(0,10)
      })
      .eq("id",l.id)

    await supabase
      .from("movimenti_finanziari")
      .insert({

        mese,
        tipo:"spesa",
        categoria:"pagamento_insegnante",
        descrizione:`Pagamento ${nome}`,
        contenitore:"cassa_operativa",
        importo:-Math.abs(costo),
        data:new Date().toISOString().slice(0,10)

      })

    carica()

  }

  if(loading)
    return <div className="p-6">Caricamento...</div>

  return (

    <div className="p-6 space-y-6">

      <h1 className="text-2xl font-bold">
        Gestione Lezioni Insegnanti
      </h1>

      <div className="space-y-2">

        {lezioni.map(l=>{

          const ins =
            insegnanti.find(
              i=>i.id===l.insegnante_id
            )

          return(

            <div
              key={l.id}
              className="flex justify-between border p-3 rounded"
            >

              <div>

                <div>

                  {new Date(l.data).toLocaleDateString(
                    "it-IT",
                    {
                      weekday:"long",
                      day:"2-digit",
                      month:"2-digit",
                      year:"numeric"
                    }
                  )}

                </div>

                <div className="text-sm">

                  {ins?.nome} — {l.ore}h × {l.costo_orario}€

                  {l.rimborso_benzina > 0 && (
                    <> + benzina {l.rimborso_benzina}€</>
                  )}

                </div>

                <div className="text-xs mt-1">

                  Stato:

                  {l.stato === "programmata" && (
                    <span className="text-yellow-600 ml-2">
                      programmata
                    </span>
                  )}

                  {l.stato === "svolta" && (
                    <span className="text-green-600 ml-2">
                      svolta
                    </span>
                  )}

                  {l.stato === "annullata" && (
                    <span className="text-red-600 ml-2">
                      annullata
                    </span>
                  )}

                  {l.pagato && (
                    <span className="text-blue-600 ml-2">
                      pagato
                    </span>
                  )}

                </div>

              </div>

              <div className="flex gap-2">

                {l.stato === "programmata" && (

                  <button
                    onClick={()=>segnaSvolta(l)}
                    className="bg-green-600 text-white px-3 py-1 rounded"
                  >
                    Svolta
                  </button>

                )}

                {l.stato === "programmata" && (

                  <button
                    onClick={()=>annullaLezione(l)}
                    className="bg-red-600 text-white px-3 py-1 rounded"
                  >
                    Annulla
                  </button>

                )}

                {l.stato === "svolta" && !l.pagato && (

                  <button
                    onClick={()=>pagaLezione(l)}
                    className="bg-blue-600 text-white px-3 py-1 rounded"
                  >
                    Paga
                  </button>

                )}

              </div>

            </div>

          )

        })}

      </div>

    </div>

  )

}
