import { supabase } from "./supabaseClient"

export async function sincronizzaCompensi(mese: string) {

  await supabase
    .from("movimenti_finanziari")
    .delete()
    .eq("mese", mese)
    .eq("categoria", "insegnante")

  const { data: lezioni } = await supabase
    .from("lezioni_insegnanti")
    .select("*")
    .eq("mese", mese)
    .eq("pagato", false)
    .neq("stato", "annullata")

  if (!lezioni || lezioni.length === 0) return

  const totali: Record<string, number> = {}

  lezioni.forEach(l => {

    if (!totali[l.insegnante_id]) {
      totali[l.insegnante_id] = 0
    }

    const costo =
      Number(l.ore) * Number(l.costo_orario) +
      Number(l.rimborso_benzina || 0)

    totali[l.insegnante_id] += costo
  })

  const { data: insegnanti } = await supabase
    .from("insegnanti")
    .select("id,nome")

  const movimenti = Object.entries(totali).map(([id,tot]) => {

    const ins = insegnanti?.find(i => i.id === id)

    return {
      mese,
      tipo: "spesa",
      categoria: "insegnante",
      descrizione: `Compenso ${ins?.nome}`,
      contenitore: "cassa_operativa",
      importo: -Math.abs(Number(tot)),
      data: new Date().toISOString().slice(0,10)
    }
  })

  await supabase
    .from("movimenti_finanziari")
    .insert(movimenti)
}
