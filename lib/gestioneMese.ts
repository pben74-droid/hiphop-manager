import { supabase } from "./supabaseClient"

/* =====================================================
   INIZIALIZZA MESE
===================================================== */
export async function inizializzaMese(mese: string) {

  const { data: meseEsistente } = await supabase
    .from("mesi")
    .select("*")
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

  const incassi = movimentiFiltrati
    .filter(m => m.tipo === "incasso")
    .reduce((acc, m) => acc + Number(m.importo), 0)

  const spese = movimentiFiltrati
    .filter(m => m.tipo === "spesa")
    .reduce((acc, m) => acc + Number(m.importo), 0)

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

  const movimentiFiltrati = movimenti?.filter(m =>
    m.categoria !== "trasferimento" &&
    m.categoria !== "versamento_socio"
  ) || []

  const totale_incassi = movimentiFiltrati
    .filter(m => m.tipo === "incasso")
    .reduce((acc, m) => acc + Number(m.importo), 0)

  const totale_spese = movimentiFiltrati
    .filter(m => m.tipo === "spesa")
    .reduce((acc, m) => acc + Number(m.importo), 0)

  const risultato_operativo = totale_incassi - totale_spese

  const perdita = risultato_operativo < 0
    ? Math.abs(risultato_operativo)
    : 0

  const sociCalcolo = soci?.map(s => {

    const quota_calcolata =
      perdita * (Number(s.quota_percentuale) / 100)

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

  const riepilogo = await calcolaQuotaSoci(mese)

  if (riepilogo.differenza_finale < 0) {
    throw new Error("Mancano versamenti per coprire la perdita")
  }

  const saldi = await calcolaSaldi(mese)

  const { error } = await supabase
    .from("mesi")
    .update({
      stato: "chiuso",
      saldo_cassa: saldi.saldo_cassa,
      saldo_banca: saldi.saldo_banca
    })
    .eq("mese", mese)

  if (error) {
    throw new Error("Errore chiusura mese")
  }

  const [anno, meseNumero] = mese.split("-").map(Number)

  let nuovoAnno = anno
  let nuovoMese = meseNumero + 1

  if (nuovoMese === 13) {
    nuovoMese = 1
    nuovoAnno++
  }

  const meseSuccessivo = `${nuovoAnno}-${String(nuovoMese).padStart(2, "0")}`

  const { data: esiste } = await supabase
    .from("mesi")
    .select("id")
    .eq("mese", meseSuccessivo)
    .maybeSingle()

  if (!esiste) {
    await supabase.from("mesi").insert({
      mese: meseSuccessivo,
      stato: "aperto",
      saldo_cassa: saldi.saldo_cassa,
      saldo_banca: saldi.saldo_banca
    })
  }

  return { success: true }
}
