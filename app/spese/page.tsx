"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SpesePage() {
  const [mese, setMese] = useState("2026-02");
  const [statoMese, setStatoMese] = useState("aperto");
  const [spese, setSpese] = useState<any[]>([]);

  const [descrizione, setDescrizione] = useState("");
  const [importo, setImporto] = useState("");
  const [metodo, setMetodo] = useState("contanti");

  useEffect(() => {
    loadData();
  }, [mese]);

  const loadData = async () => {
    // Stato mese
    const { data: meseData } = await supabase
      .from("mesi")
      .select("*")
      .eq("mese", mese)
      .single();

    if (meseData) {
      setStatoMese(meseData.stato);
    } else {
      await supabase.from("mesi").insert({
        mese,
        stato: "aperto",
      });
      setStatoMese("aperto");
    }

    // Spese del mese (movimenti finanziari tipo spesa)
    const { data } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese)
      .eq("tipo", "spesa");

    setSpese(data || []);
  };

  const salvaSpesa = async () => {
    if (statoMese === "chiuso") {
      alert("Mese chiuso. Modifiche non consentite.");
      return;
    }

    const valore = Number(importo);
    if (!descrizione || !valore || valore <= 0) {
      alert("Dati non validi");
      return;
    }

    const oggi = new Date().toISOString().split("T")[0];

    // Salvo come movimento negativo
    await supabase.from("movimenti_finanziari").insert({
      tipo: "spesa",
      contenitore:
        metodo === "contanti"
          ? "cassa_operativa"
          : "banca",
      importo: -valore,
      data: oggi,
      mese,
    });

    setDescrizione("");
    setImporto("");
    loadData();
  };

  const eliminaSpesa = async (id: string) => {
    if (statoMese === "chiuso") {
      alert("Mese chiuso.");
      return;
    }

    await supabase
      .from("movimenti_finanziari")
      .delete()
      .eq("id", id);

    loadData();
  };

  return (
    <div>
      <h1>Spese</h1>

      <input
        type="month"
        value={mese}
        onChange={(e) => setMese(e.target.value)}
      />

      <h3>Stato mese: {statoMese}</h3>

      {statoMese === "chiuso" && (
        <div style={{ color: "red" }}>
          Mese chiuso. Inserimenti bloccati.
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <input
          placeholder="Descrizione"
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
          disabled={statoMese === "chiuso"}
        />

        <input
          type="number"
          placeholder="Importo"
          value={importo}
          onChange={(e) => setImporto(e.target.value)}
          disabled={statoMese === "chiuso"}
        />

        <select
          value={metodo}
          onChange={(e) => setMetodo(e.target.value)}
          disabled={statoMese === "chiuso"}
        >
          <option value="contanti">Contanti</option>
          <option value="banca">Banca</option>
        </select>

        <button
          onClick={salvaSpesa}
          disabled={statoMese === "chiuso"}
        >
          Aggiungi
        </button>
      </div>

      <h2 style={{ marginTop: 30 }}>Elenco Spese</h2>

      {spese.map((s) => (
        <div
          key={s.id}
          style={{
            border: "1px solid black",
            padding: 10,
            marginBottom: 10,
          }}
        >
          € {Math.abs(Number(s.importo)).toFixed(2)} — {s.contenitore}
          {statoMese === "aperto" && (
            <button
              onClick={() => eliminaSpesa(s.id)}
              style={{ marginLeft: 10 }}
            >
              Elimina
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
