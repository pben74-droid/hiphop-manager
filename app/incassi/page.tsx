"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function IncassiPage() {
  const [mese, setMese] = useState("2026-02");
  const [statoMese, setStatoMese] = useState("aperto");
  const [incassi, setIncassi] = useState<any[]>([]);

  const [descrizione, setDescrizione] = useState("");
  const [importo, setImporto] = useState("");
  const [metodo, setMetodo] = useState("contanti");

  useEffect(() => {
    loadData();
  }, [mese]);

  const loadData = async () => {
    // stato mese
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

    // incassi mese (filtrati via movimenti)
    const { data } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese)
      .eq("tipo", "incasso");

    setIncassi(data || []);
  };

  const salvaIncasso = async () => {
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

    // Salvo direttamente come movimento finanziario
    await supabase.from("movimenti_finanziari").insert({
      tipo: "incasso",
      contenitore:
        metodo === "contanti"
          ? "cassa_operativa"
          : "banca",
      importo: valore,
      data: oggi,
      mese,
    });

    setDescrizione("");
    setImporto("");
    loadData();
  };

  const eliminaIncasso = async (id: string) => {
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
      <h1>Incassi</h1>

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
          onClick={salvaIncasso}
          disabled={statoMese === "chiuso"}
        >
          Aggiungi
        </button>
      </div>

      <h2 style={{ marginTop: 30 }}>Elenco Incassi</h2>

      {incassi.map((i) => (
        <div
          key={i.id}
          style={{
            border: "1px solid black",
            padding: 10,
            marginBottom: 10,
          }}
        >
          € {Number(i.importo).toFixed(2)} — {i.contenitore}
          {statoMese === "aperto" && (
            <button
              onClick={() => eliminaIncasso(i.id)}
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
