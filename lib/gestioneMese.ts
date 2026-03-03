import { supabase } from "./supabaseClient"

/* =====================================================
   INIZIALIZZA MESE
===================================================== */
export async function inizializzaMese(mese: string) {

  const { data: meseEsistente } = await supabase
    .from("mesi")
    .select("id")
    .eq("mese", mese)
    .maybeSingle()

  if (meseEsistente) return

  const { data: ultimoChiuso } = await supabase
    .from("mesi")
    .select("*")
    .eq("stato", "chiuso")
    .order("mese", { ascending: false })
    .limit(1)
    .maybeSingle()

  let saldo_cassa = 0
  let saldo_banca = 0

  if (ultimoChiuso) {
    saldo_cassa = Number(ultimoChiuso.saldo_cassa) || 0
    saldo_banca = Number(ultimoChiuso.saldo_banca) || 0
  }

  await supabase.from("mesi").insert({
    mese,
    stato: "aperto",
    saldo_cassa,
    saldo_banca
  })
}

/* =====================================================
   CALCOLO SALDI
===================================================== */
export async function calcolaSaldi(mese: string) {

  // 1️⃣ Recupera saldo iniziale del mese
  const { data: meseData } = await supabase
    .from("mesi")
    .select("saldo_iniziale_cassa, saldo_iniziale_banca")
    .eq("mese", mese)
    .maybeSingle()

  let saldo_cassa = Number(meseData?.saldo_iniziale_cassa) || 0
  let saldo_banca = Number(meseData?.saldo_iniziale_banca) || 0

  // 2️⃣ Somma movimenti del mese
  const { data: movimenti } = await supabase
    .from("movimenti_finanziari")
    .select("*")
    .eq("mese", mese)

  movimenti?.forEach(m => {

    const importo = Number(m.importo) || 0

    if (m.contenitore === "cassa_operativa") {
      saldo_cassa += importo
    }

    if (m.contenitore === "banca") {
      saldo_banca += importo
    }
  })

  return {
    saldo_cassa: Number(saldo_cassa.toFixed(2)),
    saldo_banca: Number(saldo_banca.toFixed(2))
  }
}

/* =====================================================
   RIEPILOGO OPERATIVO
===================================================== */
export async function calcolaRiepilogoOperativo(mese: string) {

  const { data: movimenti } = await supabase
    .from("movimenti_finanziari")
    .select("*")
    .eq("mese", mese)

  const movimentiFiltrati = movimenti?.filter(m =>
    m.categoria !== "trasferimento" &&
    m.categoria !== "versamento_socio"
  ) || []

  const totale_incassi = movimentiFiltrati
    .filter(m => m.tipo === "incasso")
    .reduce((acc, m) => acc + Math.abs(Number(m.importo)), 0)

  const totale_spese = movimentiFiltrati
    .filter(m => m.tipo === "spesa")
    .reduce((acc, m) => acc + Math.abs(Number(m.importo)), 0)

  return {
    totale_incassi: Number(totale_incassi.toFixed(2)),
    totale_spese: Number(totale_spese.toFixed(2))
  }
}

/* =====================================================
   CALCOLO QUOTA SOCI
===================================================== */
export async function calcolaQuotaSoci(mese: string) {

  const { data: movimenti } = await supabase
    .from("movimenti_finanziari")
    .select("*")
    .eq("mese", mese)

  const { data: soci } = await supabase
    .from("soci")
    .select("*")

  const { data: versamenti } = await supabase
    .from("versamenti_soci")
    .select("*")
    .eq("mese", mese)

  const movimentiFiltrati = movimenti?.filter(m =>
    m.categoria !== "trasferimento" &&
    m.categoria !== "versamento_socio"
  ) || []

  const totale_incassi = movimentiFiltrati
    .filter(m => m.tipo === "incasso")
    .reduce((acc, m) => acc + Math.abs(Number(m.importo)), 0)

  const totale_spese = movimentiFiltrati
    .filter(m => m.tipo === "spesa")
    .reduce((acc, m) => acc + Math.abs(Number(m.importo)), 0)

 // Recupera saldo iniziale del mese
const { data: meseData } = await supabase
  .from("mesi")
  .select("saldo_iniziale_cassa")
  .eq("mese", mese)
  .maybeSingle()

const saldo_iniziale = Number(meseData?.saldo_iniziale_cassa) || 0

// Risultato reale considerando cassa iniziale
const risultato_reale =
  saldo_iniziale + totale_incassi - totale_spese

const perdita = risultato_reale < 0
  ? Math.abs(risultato_reale)
  : 0

  const sociCalcolo = soci?.map(s => {

    const percentuale = Number(s.quota_percentuale) || 0

    const quota_calcolata =
      perdita * (percentuale / 100)

    const versato = versamenti
      ?.filter(v => v.socio_id === s.id)
      .reduce((acc, v) => acc + Number(v.importo), 0) || 0

    const differenza = versato - quota_calcolata

    return {
      id: s.id,
      nome: s.nome,
      quota_calcolata: Number(quota_calcolata.toFixed(2)),
      versato: Number(versato.toFixed(2)),
      differenza: Number(differenza.toFixed(2))
    }
  }) || []

  const totale_versamenti =
    versamenti?.reduce((acc, v) => acc + Number(v.importo), 0) || 0

  return {
    risultato_operativo: Number(risultato_operativo.toFixed(2)),
    perdita: Number(perdita.toFixed(2)),
    totale_versamenti: Number(totale_versamenti.toFixed(2)),
    differenza_finale: Number((totale_versamenti - perdita).toFixed(2)),
    soci: sociCalcolo
  }
}

/* =====================================================
   SEZIONE AFFITTO
===================================================== */
export async function generaSezioneAffitto(mese: string) {

  const { data: affittoMese } = await supabase
    .from("affitto_mese")
    .select("*")
    .eq("mese", mese)
    .maybeSingle()

  if (!affittoMese) return null

  const { data: soci } = await supabase
    .from("soci")
    .select("*")

  const { data: pagamenti } = await supabase
    .from("affitto_pagamenti")
    .select("*")
    .eq("mese", mese)

  const sociAffitto = soci?.map(s => {

    const percentuale = Number(s.quota_percentuale) || 0

    const quota =
      Number(affittoMese.costo_mensile) *
      (percentuale / 100)

    const versato = pagamenti
      ?.filter(p => p.socio_id === s.id)
      .reduce((acc, p) => acc + Number(p.importo), 0) || 0

    return {
      id: s.id,
      nome: s.nome,
      quota: Number(quota.toFixed(2)),
      versato: Number(versato.toFixed(2))
    }
  }) || []

  return {
    costo_mensile: Number(affittoMese.costo_mensile),
    soci: sociAffitto
  }
}

/* =====================================================
   VERIFICA MESE CHIUSO
===================================================== */
export async function verificaMeseChiuso(mese: string) {

  const { data } = await supabase
    .from("mesi")
    .select("stato")
    .eq("mese", mese)
    .maybeSingle()

  return data?.stato === "chiuso"
}

/* =====================================================
   CHIUDI MESE
===================================================== */
export async function chiudiMeseServer(mese: string) {

  const { createClient } = await import("@supabase/supabase-js")

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const riepilogo = await calcolaQuotaSoci(mese)

  if (riepilogo.differenza_finale < 0) {
    throw new Error("Mancano versamenti per coprire la perdita")
  }

  // Calcola saldi finali
  const saldi = await calcolaSaldi(mese)

  // 1️⃣ Chiudi mese corrente
  const { error: closeError } = await supabaseAdmin
    .from("mesi")
    .update({ stato: "chiuso" })
    .eq("mese", mese)

  if (closeError) {
    throw new Error(closeError.message)
  }

  // 2️⃣ Calcola mese successivo
  const [anno, meseNumero] = mese.split("-").map(Number)

  let nuovoAnno = anno
  let nuovoMese = meseNumero + 1

  if (nuovoMese === 13) {
    nuovoMese = 1
    nuovoAnno++
  }

  const meseSuccessivo = `${nuovoAnno}-${String(nuovoMese).padStart(2, "0")}`

// 3️⃣ Verifica se esiste già
const { data: esiste } = await supabaseAdmin
  .from("mesi")
  .select("mese")
  .eq("mese", meseSuccessivo)
  .maybeSingle()

  if (!esiste) {
    const { error: insertError } = await supabaseAdmin
      .from("mesi")
      .insert({
        mese: meseSuccessivo,
        stato: "aperto",
        saldo_iniziale_cassa: saldi.saldo_cassa,
        saldo_iniziale_banca: saldi.saldo_banca
      })

    if (insertError) {
      throw new Error(insertError.message)
    }
  }

  return { success: true }
}
