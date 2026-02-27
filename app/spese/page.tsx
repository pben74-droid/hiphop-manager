"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { inizializzaMese } from "@/lib/gestioneMese";

export default function SpesePage() {
  const [mese, setMese] = useState("2026-02");
  const [statoMese, setStatoMese] = useState("aperto");
  const [importo, setImporto] = useState("");
  const [metodo, setMetodo] = useState("contanti");
  const [spese, setSpese] = useState<any[]>([]);

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
      .eq("tipo", "spesa");

    setSpese(data || []);
  };

  const salva = async () => {
    if (statoMese === "chiuso") return alert("Mese chiuso");

    await supabase.from("movimenti_finanziari").insert({
      tipo: "spesa",
      contenitore: metodo === "contanti" ? "cassa_operativa" : "banca",
      importo: -Number(importo),
      mese,
      data: new Date().toISOString().split("T")[0],
    });

    setImporto("");
    loadData();
  };

  const elimina = async (id: string) => {
    if (statoMese === "chiuso") return;
    await supabase.from("movimenti_finanziari").delete().eq("id", id);
    loadData();
  };

  return (
    <div>
      <h1>Spese</h1>

      <input type="month" value={mese} onChange={(e)=>setMese(e.target.value)} />
      <p>Stato: {statoMese}</p>

      <input type="number" value={importo} onChange={(e)=>setImporto(e.target.value)} />
      <select value={metodo} onChange={(e)=>setMetodo(e.target.value)}>
        <option value="contanti">Contanti</option>
        <option value="banca">Banca</option>
      </select>

      <button onClick={salva}>Salva</button>

      {spese.map(s=>(
        <div key={s.id}>
          € {Math.abs(s.importo)}
          {statoMese==="aperto" && <button onClick={()=>elimina(s.id)}>X</button>}
        </div>
      ))}
    </div>
  );
}
