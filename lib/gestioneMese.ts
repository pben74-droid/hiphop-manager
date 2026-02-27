import { supabase } from "./supabaseClient"

export async function calcolaQuotaSoci(mese: string) {
  const errori: string[] = []

  // 1️⃣ Carica soci
  const { data: soci, error: sociError } = await supabase
    .from("soci")
    .select("*")

  if (sociError || !soci) {
    throw new Error("Errore caricamento soci")
  }

  // 2️⃣ Verifica percentuali = 100
  const sommaPercentuali = soci.reduce(
    (acc, s) => acc + Number(s.percentuale),
    0
  )

  if (Number(sommaPercentuali.toFixed(2)) !== 100) {
    errori.push("La somma delle percentuali soci non è 100")
  }

  // 3️⃣ Movimenti mese
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

  // 4️⃣ Versamenti mese
  const { data: versamenti } = await supabase
    .from("versamenti_soci")
    .select("*")
    .eq("mese", mese)

  const versamentiPuliti = versamenti ?? []

  // Se non c'è perdita → nessuna quota
  if (perdita === 0) {
    return {
      risultato_operativo,
      perdita: 0,
      soci: [],
      totale_versamenti: 0,
      chiudibile: true,
      errori
    }
  }

  // 5️⃣ Calcolo quota proporzionale
  let sommaQuote = 0

  const sociCalcolati = soci.map((s, index) => {
    const quotaRaw = perdita * (Number(s.percentuale) / 100)
    const quota = Number(quotaRaw.toFixed(2))

    sommaQuote += quota

    const versato = versamentiPuliti
      .filter(v => v.socio_id === s.id)
      .reduce((acc, v) => acc + Number(v.importo), 0)

    return {
      id: s.id,
      nome: s.nome,
      percentuale: s.percentuale,
      quota_calcolata: quota,
      versato: Number(versato.toFixed(2)),
      differenza: 0
    }
  })

  // 6️⃣ Correzione centesimi sull'ultimo socio
  const differenzaCentesimi = Number((perdita - sommaQuote).toFixed(2))

  if (differenzaCentesimi !== 0 && sociCalcolati.length > 0) {
    sociCalcolati[sociCalcolati.length - 1].quota_calcolata += differenzaCentesimi
  }

  // 7️⃣ Calcolo differenze reali
  let totaleVersamenti = 0
  let tuttoCoperto = true

  sociCalcolati.forEach(s => {
    s.differenza = Number((s.quota_calcolata - s.versato).toFixed(2))
    totaleVersamenti += s.versato

    if (s.differenza !== 0) {
      tuttoCoperto = false
    }

    if (s.differenza < 0) {
      errori.push(`Il socio ${s.nome} ha versato più del dovuto`)
    }
  })

  const chiudibile =
    risultato_operativo + totaleVersamenti === 0 &&
    tuttoCoperto &&
    errori.length === 0

  return {
    risultato_operativo,
    perdita,
    soci: sociCalcolati,
    totale_versamenti: Number(totaleVersamenti.toFixed(2)),
    chiudibile,
    errori
  }
}
