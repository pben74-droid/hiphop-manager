"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { inizializzaMese } from "@/lib/gestioneMese";

export default function Versamenti() {
  const [mese, setMese] = useState("2026-02");
  const [nome, setNome] = useState("");
  const [importo, setImporto] = useState("");
  const [lista, setLista] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [meseChiuso, setMeseChiuso] = useState(false);

  useEffect(() => { load(); }, [mese]);

  const load = async () => {
    await inizializzaMese(mese);

    const { data: meseData } = await supabase.from("mesi").select("*").eq("mese", mese).single();
    setMeseChiuso(meseData?.stato === "chiuso");

    const { data } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese)
      .eq("categoria", "versamento_socio");

    setLista(data || []);
  };

  const salva = async () => {
    if (!nome || !importo) return alert("Compila i campi");
    if (meseChiuso) return alert("Mese chiuso");

    const payload = {
      tipo: "incasso",
      categoria: "versamento_socio",
      descrizione: nome,
      importo: Number(importo),
      contenitore: "cassa_operativa",
      mese,
      data: new Date().toISOString().split("T")[0],
    };

    if (editId) {
      await supabase.from("movimenti_finanziari").update(payload).eq("id", editId);
    } else {
      await supabase.from("movimenti_finanziari").insert(payload);
    }

    setNome("");
    setImporto("");
    setEditId(null);
    load();
  };

  const elimina = async (id: string) => {
    if (meseChiuso) return alert("Mese chiuso");
    await supabase.from("movimenti_finanziari").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-yellow-500">Versamenti Soci</h1>

      <input type="month" value={mese} onChange={e => setMese(e.target.value)} />

      <div className="bg-zinc-900 p-6 rounded-xl space-y-4">
        <input placeholder="Nome socio" value={nome} onChange={e => setNome(e.target.value)} disabled={meseChiuso} />
        <input type="number" placeholder="Importo versato" value={importo} onChange={e => setImporto(e.target.value)} disabled={meseChiuso} />

        <button onClick={salva} className="bg-yellow-500 text-black px-4 py-2 rounded">
          {editId ? "Aggiorna" : "Salva"}
        </button>
      </div>

      <div className="bg-zinc-900 p-6 rounded-xl space-y-3">
        {lista.map(row => (
          <div key={row.id} className="flex justify-between">
            <div className="text-yellow-400">
              {row.descrizione} — € {row.importo.toFixed(2)}
            </div>
            {!meseChiuso && (
              <button onClick={() => elimina(row.id)} className="text-red-500">Elimina</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
