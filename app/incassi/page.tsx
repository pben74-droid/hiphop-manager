"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { inizializzaMese } from "@/lib/gestioneMese";

export default function IncassiPage() {
  const [mese, setMese] = useState("2026-02");
  const [statoMese, setStatoMese] = useState("aperto");
  const [importo, setImporto] = useState("");
  const [metodo, setMetodo] = useState("contanti");
  const [incassi, setIncassi] = useState<any[]>([]);

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
      .eq("tipo", "incasso");

    setIncassi(data || []);
  };

  const salva = async () => {
    if (statoMese === "chiuso") return alert("Mese chiuso");

    await supabase.from("movimenti_finanziari").insert({
      tipo: "incasso",
      contenitore: metodo === "contanti" ? "cassa_operativa" : "banca",
      importo: Number(importo),
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
      <h1>Incassi</h1>

      <input type="month" value={mese} onChange={(e)=>setMese(e.target.value)} />
      <p>Stato: {statoMese}</p>

      <input type="number" value={importo} onChange={(e)=>setImporto(e.target.value)} />
      <select value={metodo} onChange={(e)=>setMetodo(e.target.value)}>
        <option value="contanti">Contanti</option>
        <option value="banca">Banca</option>
      </select>

      <button onClick={salva}>Salva</button>

      {incassi.map(i=>(
        <div key={i.id}>
          € {i.importo}
          {statoMese==="aperto" && <button onClick={()=>elimina(i.id)}>X</button>}
        </div>
      ))}
    </div>
  );
}
