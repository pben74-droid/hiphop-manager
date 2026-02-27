"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ChiusuraPage() {
  const [mese, setMese] = useState("2026-02");

  const chiudiMese = async () => {
    // Prendo movimenti del mese
    const { data: movimenti } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese);

    if (!movimenti) return;

    const saldoCassa = movimenti
      .filter(m => m.contenitore === "cassa_operativa")
      .reduce((s,m)=>s+Number(m.importo),0);

    const saldoBanca = movimenti
      .filter(m => m.contenitore === "banca")
      .reduce((s,m)=>s+Number(m.importo),0);

    // Aggiorno mese come chiuso e salvo saldo finale
    await supabase
      .from("mesi")
      .update({
        stato: "chiuso",
        saldo_iniziale_cassa: saldoCassa,
        saldo_iniziale_banca: saldoBanca
      })
      .eq("mese", mese);

    alert("Mese chiuso correttamente");
  };

  return (
    <div>
      <h1>Chiusura Mese</h1>

      <input
        type="month"
        value={mese}
        onChange={(e)=>setMese(e.target.value)}
      />

      <button onClick={chiudiMese}>
        Chiudi Mese
      </button>
    </div>
  );
}
