"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function FinanzaPage() {
  const [mese, setMese] = useState("2026-02");
  const [saldoCassaOperativa, setSaldoCassaOperativa] = useState(0);
  const [saldoBanca, setSaldoBanca] = useState(0);
  const [saldoCassaAffitto, setSaldoCassaAffitto] = useState(0);

  const loadSaldi = async () => {
    const { data } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese);

    const cassaOperativa =
      data
        ?.filter((m) => m.contenitore === "cassa_operativa")
        .reduce((sum, m) => sum + Number(m.importo), 0) || 0;

    const banca =
      data
        ?.filter((m) => m.contenitore === "banca")
        .reduce((sum, m) => sum + Number(m.importo), 0) || 0;

    const cassaAffitto =
      data
        ?.filter((m) => m.contenitore === "cassa_affitto")
        .reduce((sum, m) => sum + Number(m.importo), 0) || 0;

    setSaldoCassaOperativa(cassaOperativa);
    setSaldoBanca(banca);
    setSaldoCassaAffitto(cassaAffitto);
  };

  useEffect(() => {
    loadSaldi();
  }, [mese]);

  const registraPrelievo = async () => {
    const importo = Number(prompt("Importo prelievo?"));

    if (!importo || importo <= 0) return;

    await supabase.from("movimenti_finanziari").insert([
      {
        tipo: "prelievo",
        contenitore: "banca",
        importo: -importo,
        data: new Date().toISOString().split("T")[0],
        mese
      },
      {
        tipo: "prelievo",
        contenitore: "cassa_operativa",
        importo: importo,
        data: new Date().toISOString().split("T")[0],
        mese
      }
    ]);

    loadSaldi();
  };

  return (
    <div style={{ padding: 30 }}>
      <h1>Gestione Finanziaria</h1>

      <input
        type="month"
        value={mese}
        onChange={(e) => setMese(e.target.value)}
      />

      <h2>Cassa Operativa: € {saldoCassaOperativa.toFixed(2)}</h2>
      <h2>Banca: € {saldoBanca.toFixed(2)}</h2>
      <h2>Cassa Affitto: € {saldoCassaAffitto.toFixed(2)}</h2>

      <button onClick={registraPrelievo}>
        Registra Prelievo Banca → Cassa
      </button>
    </div>
  );
}
