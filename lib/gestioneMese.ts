import { supabase } from "./supabaseClient"

/* =====================================================
   INIZIALIZZA MESE (con riporto saldi e crediti affitto)
===================================================== */
export async function inizializzaMese(mese: string) {

  const { data: meseEsistente } = await supabase
    .from("mesi")
    .select("*")
    .eq("mese", mese)
    .maybeSingle()

  if (meseEsistente) return

  const { data: ultimoMese } = await supabase
    .from("mesi")
    .select("*")
    .order("mese", { ascending: false })
    .limit(1)
    .maybeSingle()

  let saldo_cassa = 0
  let saldo_banca = 0

  if (ultimoMese) {
    saldo_cassa = Number(ultimoMese.saldo_cassa) || 0
    saldo_banca = Number(ultimoMese.saldo_banca) || 0
  }

  await supabase.from("mesi").insert({
    mese,
    stato: "aperto",
    saldo_cassa,
    saldo_banca
  })

  // Riporto crediti affitto
  const { data: soci } = await supabase
    .from("soci")
    .select("id, credito_affitto")

  if (soci) {
    for (const socio of soci) {

      const credito = Number(socio.credito_affitto) || 0

      if (credito > 0) {
        await supabase.from("affitto_pagamenti").insert({
          mese,
          socio_id: socio.id,
          importo: -credito,
          data: new Date().toISOString().slice(0, 10)
        })
      }
    }
  }
}

/* =====================================================
   CALCOLO SALDI CASSA / BANCA
===================================================== */
export async function calcolaSaldi(mese: string) {

  const { data: movimenti } = await supabase
    .from("movimenti_finanziari")
    .select("*")
    .eq("mese", mese)

  let saldo_cassa = 0
  let saldo_banca = 0

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
   RIEPILOGO OPERATIVO (NO TRASFERIMENTI)
===================================================== */
export async function calcolaRiepilogoOperativo(mese: string) {

  const { data: movimenti } = await supabase
    .from("movimenti_finanziari")
    .select("*")
    .eq("mese", mese)

  const incassi = movimenti
    ?.filter(m => m.tipo === "incasso" && m.categoria !== "trasferimento")
    .reduce((acc, m) => acc + Number(m.importo), 0) || 0

  const spese = movimenti
    ?.filter(m => m.tipo === "spesa" && m.categoria !== "trasferimento")
    .reduce((acc, m) => acc + Math.abs(Number(m.importo)), 0) || 0

  return {
    totale_incassi: Number(incassi.toFixed(2)),
    totale_spese: Number(spese.toFixed(2))
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

  const risultato_operativo = movimenti
    ?.filter(m => m.categoria !== "trasferimento")
    .reduce((acc, m) => acc + Number(m.importo), 0) || 0

  const perdita = risultato_operativo < 0
    ? Math.abs(risultato_operativo)
    : 0

  const sociCalcolo = soci?.map(s => {

    const quota_calcolata = perdita *
      (Number(s.quota_percentuale) / 100)

    const versato = versamenti
      ?.filter(v => v.socio_id === s.id)
      .reduce((acc, v) => acc + Number(v.importo), 0) || 0

    const differenza = quota_calcolata - versato

    return {
      id: s.id,
      nome: s.nome,
      quota_calcolata: Number(quota_calcolata.toFixed(2)),
      versato: Number(versato.toFixed(2)),
      differenza: Number(differenza.toFixed(2))
    }
  }) || []

  const totale_versamenti = versamenti
    ?.reduce((acc, v) => acc + Number(v.importo), 0) || 0

  return {
    risultato_operativo: Number(risultato_operativo.toFixed(2)),
    perdita: Number(perdita.toFixed(2)),
    totale_versamenti: Number(totale_versamenti.toFixed(2)),
    differenza_finale: Number((perdita - totale_versamenti).toFixed(2)),
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

  const { data: soci } = await supabase
    .from("soci")
    .select("*")

  const { data: pagamenti } = await supabase
    .from("affitto_pagamenti")
    .select("*")
    .eq("mese", mese)

  if (!affittoMese) return null

  const sociAffitto = soci?.map(s => {

    const quota = Number(affittoMese.costo_mensile) *
      (Number(s.quota_percentuale) / 100)

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
