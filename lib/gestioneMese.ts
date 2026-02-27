import { supabase } from "./supabaseClient"

/* =========================================
   INIZIALIZZA MESE
========================================= */
export async function inizializzaMese(mese: string) {
  const { data } = await supabase
    .from("mesi")
    .select("*")
    .eq("mese", mese)
    .maybeSingle()

  if (!data) {
    await supabase.from("mesi").insert([
      {
        mese,
        stato: "aperto",
        saldo_cassa: 0,
        saldo_banca: 0,
      },
    ])
  }
}

/* =========================================
   VERIFICA MESE APERTO
========================================= */
export async function verificaMeseAperto(mese: string) {
  const { data } = await supabase
    .from("mesi")
    .select("stato")
    .eq("mese", mese)
    .single()

  if (!data) throw new Error("Mese non trovato")

  if (data.stato === "chiuso") {
    throw new Error("Il mese è chiuso. Operazione non consentita.")
  }
}

/* =========================================
   CALCOLO QUOTA SOCI
========================================= */
export async function calcolaQuotaSoci(mese: string) {
  const { data: soci } = await supabase.from("soci").select("*")

  const { data: movimenti } = await supabase
    .from("movimenti_finanziari")
    .select("*")
    .eq("mese", mese)

  const { data: versamenti } = await supabase
    .from("versamenti_soci")
    .select("*")
    .eq("mese", mese)

  const risultato_operativo = Number(
    movimenti?.reduce((acc, m) => acc + Number(m.importo), 0) || 0
  )

  if (risultato_operativo >= 0) {
    return {
      risultato_operativo,
      perdita: 0,
      soci: [],
      chiudibile: true,
    }
  }

  const perdita = Math.abs(risultato_operativo)

  const sociCalcolati = soci?.map((s) => {
    const quota = Number(
      (perdita * (Number(s.quota_percentuale) / 100)).toFixed(2)
    )

    const versato =
      versamenti
        ?.filter((v) => v.socio_id === s.id)
        .reduce((acc, v) => acc + Number(v.importo), 0) || 0

    return {
      id: s.id,
      nome: s.nome,
      quota_calcolata: quota,
      versato,
      differenza: Number((quota - versato).toFixed(2)),
    }
  })

  const totaleVersamenti =
    versamenti?.reduce((acc, v) => acc + Number(v.importo), 0) || 0

  const chiudibile =
    Number((risultato_operativo + totaleVersamenti).toFixed(2)) === 0 &&
    sociCalcolati?.every((s) => s.differenza === 0)

  return {
    risultato_operativo,
    perdita,
    soci: sociCalcolati,
    totale_versamenti: totaleVersamenti,
    chiudibile,
  }
}

/* =========================================
   CHIUSURA MESE (RPC SQL)
========================================= */
export async function chiudiMeseServer(mese: string) {
  const { data, error } = await supabase.rpc(
    "chiudi_mese_definitivo",
    { mese_input: mese }
  )

  if (error) throw new Error(error.message)

  return data
}

/* =========================================
   SEZIONE AFFITTO PER REPORT
========================================= */
export async function generaSezioneAffitto(mese: string) {

  const { data: affittoMese } = await supabase
    .from("affitto_mese")
    .select("*")
    .eq("mese", mese)
    .maybeSingle()

  if (!affittoMese) return null

  const { data: soci } = await supabase.from("soci").select("*")

  const { data: pagamenti } = await supabase
    .from("affitto_pagamenti")
    .select("*")
    .eq("mese", mese)

  const { data: crediti } = await supabase
    .from("affitto_crediti")
    .select("*")
    .eq("mese_origine", mese)

  const costo = Number(affittoMese.costo_mensile)

  const dettaglio = soci?.map((s) => {

    const quota = Number(
      (costo * (Number(s.quota_percentuale) / 100)).toFixed(2)
    )

    const versato =
      pagamenti
        ?.filter((p) => p.socio_id === s.id)
        .reduce((acc, p) => acc + Number(p.importo), 0) || 0

    const creditoTrasferito =
      crediti
        ?.filter((c) => c.socio_id === s.id)
        .reduce((acc, c) => acc + Number(c.importo), 0) || 0

    return {
      nome: s.nome,
      percentuale: s.quota_percentuale,
      quota,
      versato,
      credito_trasferito: creditoTrasferito,
    }
  })

  return {
    costo_mensile: costo,
    soci: dettaglio,
  }
}
