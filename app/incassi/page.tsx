"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { inizializzaMese } from "@/lib/gestioneMese";

export default function Incassi() {
  const [mese, setMese] = useState("2026-02");
  const [descrizione, setDescrizione] = useState("");
  const [importo, setImporto] = useState("");
  const [contenitore, setContenitore] = useState("cassa_operativa");
  const [incassi, setIncassi] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [meseChiuso, setMeseChiuso] = useState(false);

  useEffect(() => {
    load();
  }, [mese]);

  const load = async () => {
    await inizializzaMese(mese);

    const { data: meseData } = await supabase
      .from("mesi")
      .select("*")
      .eq("mese", mese)
      .single();

    setMeseChiuso(meseData?.stato === "chiuso");

    const { data } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese)
      .eq("tipo", "incasso")
      .order("data", { ascending: false });

    setIncassi(data || []);
  };

  const salva = async () => {
    if (!descrizione || !importo) return alert("Compila i campi");

    if (meseChiuso) return alert("Mese chiuso");

    if (editId) {
      await supabase
        .from("movimenti_finanziari")
        .update({ descrizione, importo: Number(importo), contenitore })
        .eq("id", editId);
    } else {
      await supabase.from("movimenti_finanziari").insert({
        tipo: "incasso",
        descrizione,
        importo: Number(importo),
        contenitore,
        mese,
        data: new Date().toISOString().split("T")[0],
      });
    }

    reset();
    load();
  };

  const elimina = async (id: string) => {
    if (meseChiuso) return alert("Mese chiuso");

    await supabase.from("movimenti_finanziari").delete().eq("id", id);
    load();
  };

  const modifica = (row: any) => {
    setEditId(row.id);
    setDescrizione(row.descrizione);
    setImporto(row.importo.toString());
    setContenitore(row.contenitore);
  };

  const reset = () => {
    setEditId(null);
    setDescrizione("");
    setImporto("");
    setContenitore("cassa_operativa");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-yellow-500">Incassi</h1>

      <input type="month" value={mese} onChange={e => setMese(e.target.value)} />

      <div className="bg-zinc-900 p-6 rounded-xl space-y-4">

        <input
          placeholder="Descrizione incasso"
          value={descrizione}
          onChange={e => setDescrizione(e.target.value)}
          disabled={meseChiuso}
        />

        <input
          type="number"
          placeholder="Importo"
          value={importo}
          onChange={e => setImporto(e.target.value)}
          disabled={meseChiuso}
        />

        <select
          value={contenitore}
          onChange={e => setContenitore(e.target.value)}
          disabled={meseChiuso}
        >
          <option value="cassa_operativa">Contanti</option>
          <option value="banca">Banca / POS</option>
        </select>

        <button
          onClick={salva}
          className="bg-yellow-500 text-black px-4 py-2 rounded"
        >
          {editId ? "Aggiorna" : "Salva"}
        </button>
      </div>

      <div className="bg-zinc-900 p-6 rounded-xl space-y-3">
        {incassi.map(row => (
          <div key={row.id} className="flex justify-between items-center">
            <div>
              <div className="text-yellow-400">{row.descrizione}</div>
              <div className="text-sm text-zinc-400">
                € {row.importo.toFixed(2)} — {row.contenitore}
              </div>
            </div>
            {!meseChiuso && (
              <div className="flex gap-3 text-sm">
                <button onClick={() => modifica(row)} className="text-yellow-500">Modifica</button>
                <button onClick={() => elimina(row.id)} className="text-red-500">Elimina</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
