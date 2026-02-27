import { supabase } from "@/lib/supabaseClient";

export async function inizializzaMese(mese: string) {
  // Controllo se esiste già
  const { data: meseData } = await supabase
    .from("mesi")
    .select("*")
    .eq("mese", mese)
    .single();

  if (meseData) {
    return meseData;
  }

  // Creo il mese
  await supabase.from("mesi").insert({
    mese,
    stato: "aperto",
  });

  // Calcolo mese precedente
  const dataMese = new Date(mese + "-01");
  dataMese.setMonth(dataMese.getMonth() - 1);
  const mesePrecedente = dataMese.toISOString().slice(0, 7);

  const { data: prevData } = await supabase
    .from("mesi")
    .select("*")
    .eq("mese", mesePrecedente)
    .single();

  // Se mese precedente chiuso → trasferisco saldi
  if (prevData && prevData.stato === "chiuso") {

    if (prevData.saldo_iniziale_cassa > 0) {
      await supabase.from("movimenti_finanziari").insert({
        tipo: "saldo_iniziale",
        contenitore: "cassa_operativa",
        importo: prevData.saldo_iniziale_cassa,
        mese,
        data: new Date().toISOString().split("T")[0],
      });
    }

    if (prevData.saldo_iniziale_banca > 0) {
      await supabase.from("movimenti_finanziari").insert({
        tipo: "saldo_iniziale",
        contenitore: "banca",
        importo: prevData.saldo_iniziale_banca,
        mese,
        data: new Date().toISOString().split("T")[0],
      });
    }
  }

  return { mese, stato: "aperto" };
}
