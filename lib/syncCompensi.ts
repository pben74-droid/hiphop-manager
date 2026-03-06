import { supabase } from "./supabaseClient"

export async function sincronizzaCompensi(mese: string) {

  const { data: lezioni } = await supabase
    .from("lezioni_insegnanti")
    .select("*")
    .eq("mese", mese)
    .eq("pagato", false)
    .neq("stato", "annullata")

  if (!lezioni || lezioni.length === 0) {
    return []
  }

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

  const riepilogo = Object.entries(totali).map(([id,tot]) => {

    const ins = insegnanti?.find(i => i.id === id)

    return {
      insegnante_id: id,
      nome: ins?.nome,
      totale: Number(tot)
    }
  })

  return riepilogo
}
