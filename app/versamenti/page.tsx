"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { inizializzaMese } from "@/lib/gestioneMese";

export default function VersamentiPage() {
  const [mese, setMese] = useState("2026-02");
  const [statoMese, setStatoMese] = useState("aperto");
  const [importo, setImporto] = useState("");
  const [versamenti, setVersamenti] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [mese]);

  const loadData = async () => {
    await inizializzaMese(mese);

    const { data: meseData } = await supabase
      .from("mesi")
      .select("*")
      .eq("mese", mese)
      .single();

    if (meseData) setStatoMese(meseData.stato);

    const { data } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese)
      .eq("tipo", "versamento_operativo");

    setVersamenti(data || []);
  };

  const salva = async () => {
    if (statoMese === "chiuso") return alert("Mese chiuso");

    await supabase.from("movimenti_finanziari").insert({
      tipo: "versamento_operativo",
      contenitore: "cassa_operativa",
      importo: Number(importo),
      mese,
      data: new Date().toISOString().split("T")[0],
    });

    setImporto("");
    loadData();
  };

  return (
    <div>
      <h1>Versamenti Soci</h1>

      <input type="month" value={mese} onChange={(e)=>setMese(e.target.value)} />
      <p>Stato: {statoMese}</p>

      <input type="number" value={importo} onChange={(e)=>setImporto(e.target.value)} />
      <button onClick={salva}>Salva</button>

      {versamenti.map(v=>(
        <div key={v.id}>€ {v.importo}</div>
      ))}
    </div>
  );
}
