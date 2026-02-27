import { supabase } from "./supabaseClient"

/* =========================================
   INIZIALIZZA MESE
========================================= */
export async function inizializzaMese(mese: string) {
  const { data, error } = await supabase
    .from("mesi")
    .select("*")
    .eq("mese", mese)
    .maybeSingle()

  if (error) {
    throw new Error("Errore verifica mese")
  }

  if (!data) {
    const { error: insertError } = await supabase
      .from("mesi")
      .insert([
        {
          mese,
          stato: "aperto",
          saldo_cassa: 0,
          saldo_banca: 0,
        },
      ])

    if (insertError) {
      throw new Error("Errore inizializzazione mese")
    }
  }

  return true
}

/* =========================================
   VERIFICA MESE APERTO
========================================= */
export async function verificaMeseAperto(mese: string) {
  const { data, error } = await supabase
    .from("mesi")
    .select("stato")
    .eq("mese", mese)
    .single()

  if (error || !data) {
    throw new Error("Mese non trovato")
  }

  if (data.stato === "chiuso") {
    throw new Error("Il mese è chiuso. Operazione non consentita.")
  }

  return true
}

/* =========================================
   CALCOLO QUOTA SOCI DEFINITIVO
========================================= */
export async function calcolaQuotaSoci(mese: string) {
  const errori: string[] = []

  const { data: meseData, error: meseError } = await supabase
    .from("mesi")
    .select("*")
    .eq("mese", mese)
    .single()

  if (meseError || !meseData) {
    throw new Error("Mese non trovato")
  }

  if (meseData.stato === "chiuso" && meseData.report_snapshot) {
    return meseData.report_snapshot
  }

  // 🔥 ORA USIAMO quota_percentuale
  const { data: soci, error: sociError } = await supabase
    .from("soci")
    .select("*")

  if (sociError || !soci) {
    throw new Error("Errore caricamento soci")
  }

  const sommaPercentuali = Number(
    soci.reduce(
      (acc, s) => acc + Number(s.quota_percentuale),
      0
    ).toFixed(2)
  )

  if (sommaPercentuali !== 100) {
    errori.push("Somma percentuali soci diversa da 100")
  }

  const { data: movimenti, error: movError } = await supabase
    .from("movimenti_finanziari")
    .select("*")
    .eq("mese", mese)

  if (movError || !movimenti) {
    throw new Error("Errore caricamento movimenti")
  }

  const risultato_operativo = Number(
    movimenti.reduce((acc, m) => acc + Number(m.importo), 0).toFixed(2)
  )

  let perdita = 0
  if (risultato_operativo < 0) {
    perdita = Math.abs(risultato_operativo)
  }

  const { data: versamenti } = await supabase
    .from("versamenti_soci")
    .select("*")
    .eq("mese", mese)

  const versamentiPuliti = versamenti ?? []

  if (perdita === 0) {
    return {
      risultato_operativo,
      perdita: 0,
      soci: [],
      totale_versamenti: 0,
      chiudibile: true,
      errori,
    }
  }

  let sommaQuote = 0

  const sociCalcolati = soci.map((s) => {
    const quota = Number(
      (perdita * (Number(s.quota_percentuale) / 100)).toFixed(2)
    )

    sommaQuote += quota

    const versato = Number(
      versamentiPuliti
        .filter((v) => v.socio_id === s.id)
        .reduce((acc, v) => acc + Number(v.importo), 0)
        .toFixed(2)
    )

    return {
      id: s.id,
      nome: s.nome,
      quota_percentuale: s.quota_percentuale,
      quota_calcolata: quota,
      versato,
      differenza: 0,
    }
  })

  const differenzaCentesimi = Number((perdita - sommaQuote).toFixed(2))

  if (differenzaCentesimi !== 0 && sociCalcolati.length > 0) {
    sociCalcolati[sociCalcolati.length - 1].quota_calcolata += differenzaCentesimi
  }

  let totaleVersamenti = 0
  let tuttoCoperto = true

  sociCalcolati.forEach((s) => {
    s.differenza = Number((s.quota_calcolata - s.versato).toFixed(2))
    totaleVersamenti += s.versato

    if (s.differenza !== 0) tuttoCoperto = false
    if (s.differenza < 0) {
      errori.push(`Il socio ${s.nome} ha versato più del dovuto`)
    }
  })

  totaleVersamenti = Number(totaleVersamenti.toFixed(2))

  const chiudibile =
    Number((risultato_operativo + totaleVersamenti).toFixed(2)) === 0 &&
    tuttoCoperto &&
    errori.length === 0

  return {
    risultato_operativo,
    perdita,
    soci: sociCalcolati,
    totale_versamenti: totaleVersamenti,
    chiudibile,
    errori,
  }
}

/* =========================================
   CHIUSURA MESE SERVER
========================================= */
export async function chiudiMeseServer(mese: string) {
  const risultato = await calcolaQuotaSoci(mese)

  if (!risultato.chiudibile) {
    throw new Error("Il mese non è chiudibile")
  }

  const { error } = await supabase
    .from("mesi")
    .update({
      stato: "chiuso",
      report_snapshot: risultato,
    })
    .eq("mese", mese)

  if (error) {
    throw new Error("Errore chiusura mese")
  }

  return { success: true }
}
