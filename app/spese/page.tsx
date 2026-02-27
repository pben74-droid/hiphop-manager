"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { inizializzaMese } from "@/lib/gestioneMese";

export default function Spese() {
  const [mese, setMese] = useState("2026-02");
  const [descrizione, setDescrizione] = useState("");
  const [importo, setImporto] = useState("");
  const [contenitore, setContenitore] = useState("cassa_operativa");
  const [spese, setSpese] = useState<any[]>([]);
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
      .eq("tipo", "spesa")
      .order("data", { ascending: false });

    setSpese(data || []);
  };

  const salvaSpesa = async () => {
    if (!descrizione || !importo) {
      alert("Compila tutti i campi");
      return;
    }

    if (meseChiuso) {
      alert("Mese chiuso. Non puoi modificare.");
      return;
    }

    if (editId) {
      await supabase
        .from("movimenti_finanziari")
        .update({
          descrizione,
          importo: -Math.abs(Number(importo)),
          contenitore,
        })
        .eq("id", editId);
    } else {
      await supabase.from("movimenti_finanziari").insert({
        tipo: "spesa",
        descrizione,
        importo: -Math.abs(Number(importo)),
        contenitore,
        mese,
        data: new Date().toISOString().split("T")[0],
      });
    }

    resetForm();
    load();
  };

  const eliminaSpesa = async (id: string) => {
    if (meseChiuso) {
      alert("Mese chiuso. Non puoi eliminare.");
      return;
    }

    await supabase
      .from("movimenti_finanziari")
      .delete()
      .eq("id", id);

    load();
  };

  const modificaSpesa = (spesa: any) => {
    setEditId(spesa.id);
    setDescrizione(spesa.descrizione);
    setImporto(Math.abs(spesa.importo).toString());
    setContenitore(spesa.contenitore);
  };

  const resetForm = () => {
    setEditId(null);
    setDescrizione("");
    setImporto("");
    setContenitore("cassa_operativa");
  };

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold text-yellow-500">
        Spese Operative
      </h1>

      <input
        type="month"
        value={mese}
        onChange={(e) => setMese(e.target.value)}
      />

      {/* FORM */}
      <div className="bg-zinc-900 p-6 rounded-xl space-y-4">

        <input
          placeholder="Descrizione spesa"
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
          disabled={meseChiuso}
        />

        <input
          type="number"
          placeholder="Importo"
          value={importo}
          onChange={(e) => setImporto(e.target.value)}
          disabled={meseChiuso}
        />

        <select
          value={contenitore}
          onChange={(e) => setContenitore(e.target.value)}
          disabled={meseChiuso}
        >
          <option value="cassa_operativa">Cassa Operativa</option>
          <option value="banca">Banca</option>
        </select>

        <div className="flex gap-3">
          <button
            onClick={salvaSpesa}
            className="bg-yellow-500 text-black px-4 py-2 rounded"
            disabled={meseChiuso}
          >
            {editId ? "Aggiorna" : "Salva"}
          </button>

          {editId && (
            <button
              onClick={resetForm}
              className="bg-zinc-700 px-4 py-2 rounded"
            >
              Annulla
            </button>
          )}
        </div>

      </div>

      {/* LISTA */}
      <div className="bg-zinc-900 p-6 rounded-xl space-y-3">

        {spese.map((s) => (
          <div
            key={s.id}
            className="flex justify-between items-center border-b border-zinc-800 pb-2"
          >
            <div>
              <div className="text-yellow-400">{s.descrizione}</div>
              <div className="text-sm text-zinc-400">
                € {Math.abs(s.importo).toFixed(2)} — {s.contenitore}
              </div>
            </div>

            {!meseChiuso && (
              <div className="flex gap-3 text-sm">
                <button
                  onClick={() => modificaSpesa(s)}
                  className="text-yellow-500"
                >
                  Modifica
                </button>
                <button
                  onClick={() => eliminaSpesa(s.id)}
                  className="text-red-500"
                >
                  Elimina
                </button>
              </div>
            )}
          </div>
        ))}

      </div>

    </div>
  );
}
