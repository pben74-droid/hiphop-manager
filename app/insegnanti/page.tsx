"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { inizializzaMese } from "@/lib/gestioneMese";

export default function Insegnanti() {
  const [mese, setMese] = useState("2026-02");

  const [nome, setNome] = useState("");
  const [ore, setOre] = useState("");
  const [compenso, setCompenso] = useState("");
  const [benzina, setBenzina] = useState("");
  const [contenitore, setContenitore] = useState("cassa_operativa");

  const [lista, setLista] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [meseChiuso, setMeseChiuso] = useState(false);

  const totale =
    Number(ore || 0) * Number(compenso || 0) +
    Number(benzina || 0);

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
      .eq("categoria", "insegnante")
      .order("data", { ascending: false });

    setLista(data || []);
  };

  const salva = async () => {
    if (!nome || !ore || !compenso) {
      alert("Compila i campi obbligatori");
      return;
    }

    if (meseChiuso) return alert("Mese chiuso");

    const payload = {
      tipo: "spesa",
      categoria: "insegnante",
      descrizione: nome,
      ore: Number(ore),
      compenso_orario: Number(compenso),
      benzina: Number(benzina || 0),
      importo: -Math.abs(totale),
      contenitore,
      mese,
      data: new Date().toISOString().split("T")[0],
    };

    if (editId) {
      await supabase
        .from("movimenti_finanziari")
        .update(payload)
        .eq("id", editId);
    } else {
      await supabase
        .from("movimenti_finanziari")
        .insert(payload);
    }

    reset();
    load();
  };

  const elimina = async (id: string) => {
    if (meseChiuso) return alert("Mese chiuso");

    await supabase
      .from("movimenti_finanziari")
      .delete()
      .eq("id", id);

    load();
  };

  const modifica = (row: any) => {
    setEditId(row.id);
    setNome(row.descrizione);
    setOre(row.ore?.toString() || "");
    setCompenso(row.compenso_orario?.toString() || "");
    setBenzina(row.benzina?.toString() || "");
    setContenitore(row.contenitore);
  };

  const reset = () => {
    setEditId(null);
    setNome("");
    setOre("");
    setCompenso("");
    setBenzina("");
    setContenitore("cassa_operativa");
  };

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold text-yellow-500">
        Compensi Insegnanti
      </h1>

      <input
        type="month"
        value={mese}
        onChange={(e) => setMese(e.target.value)}
      />

      <div className="bg-zinc-900 p-6 rounded-xl space-y-4">

        <input
          placeholder="Nome insegnante"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          disabled={meseChiuso}
        />

        <input
          type="number"
          placeholder="Ore lavorate"
          value={ore}
          onChange={(e) => setOre(e.target.value)}
          disabled={meseChiuso}
        />

        <input
          type="number"
          placeholder="Compenso orario"
          value={compenso}
          onChange={(e) => setCompenso(e.target.value)}
          disabled={meseChiuso}
        />

        <input
          type="number"
          placeholder="Rimborso benzina"
          value={benzina}
          onChange={(e) => setBenzina(e.target.value)}
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

        <div className="text-yellow-400 font-bold">
          Totale: € {totale.toFixed(2)}
        </div>

        <button
          onClick={salva}
          className="bg-yellow-500 text-black px-4 py-2 rounded"
        >
          {editId ? "Aggiorna" : "Salva"}
        </button>

      </div>

      <div className="bg-zinc-900 p-6 rounded-xl space-y-3">
        {lista.map(row => (
          <div key={row.id} className="flex justify-between items-center">
            <div>
              <div className="text-yellow-400">{row.descrizione}</div>
              <div className="text-sm text-zinc-400">
                € {Math.abs(row.importo).toFixed(2)}
              </div>
            </div>

            {!meseChiuso && (
              <div className="flex gap-3">
                <button
                  onClick={() => modifica(row)}
                  className="text-yellow-500"
                >
                  Modifica
                </button>
                <button
                  onClick={() => elimina(row.id)}
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
