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

  // 3️⃣ Carica movimenti del mese
  const { data: movimenti, error: movError } = await supabase
    .from("movimenti_finanziari")
    .select("*")
    .eq("mese", mese)

  if (movError || !movimenti) {
    throw new Error("Errore caricamento movimenti")
  }

  // 4️⃣ Calcolo risultato operativo
  const risultato_operativo = movimenti.reduce(
    (acc, m) => acc + Number(m.importo),
    0
  )

  const risultatoArrotondato = Number(risultato_operativo.toFixed(2))

  let perdita = 0

  if (risultatoArrotondato < 0) {
    perdita = Math.abs(risultatoArrotondato)
  }

  // 5️⃣ Carica versamenti soci del mese
  const { data: versamenti, error: versError } = await supabase
    .from("versamenti_soci")
    .select("*")
    .eq("mese", mese)

  if (versError) {
    throw new Error("Errore caricamento versamenti")
  }

  return {
    risultato_operativo: risultatoArrotondato,
    perdita,
    soci,
    movimenti,
    versamenti: versamenti ?? [],
    errori
  }
}
