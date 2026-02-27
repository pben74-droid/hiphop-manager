"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ChiusuraPage() {
  const [mese, setMese] = useState("2026-02");
  const [password, setPassword] = useState("");

  const chiudiMese = async () => {
    // Prendo movimenti mese
    const { data: movimenti } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese);

    if (!movimenti) return;

    const saldoOperativo = movimenti
      .filter(m => m.contenitore === "cassa_operativa" || m.contenitore === "banca")
      .reduce((s, m) => s + Number(m.importo), 0);

    const saldoAffitto = movimenti
      .filter(m => m.contenitore === "cassa_affitto")
      .reduce((s, m) => s + Number(m.importo), 0);

    if (saldoOperativo < 0) {
      alert("ERRORE: Differenza operativa negativa. I soci devono coprire il mese.");
      return;
    }

    if (saldoAffitto !== 0) {
      alert("ERRORE: Affitto non completamente coperto.");
      return;
    }

    const saldoCassa = movimenti
      .filter(m => m.contenitore === "cassa_operativa")
      .reduce((s, m) => s + Number(m.importo), 0);

    const saldoBanca = movimenti
      .filter(m => m.contenitore === "banca")
      .reduce((s, m) => s + Number(m.importo), 0);

    await supabase
      .from("mesi")
      .update({
        stato: "chiuso",
        saldo_iniziale_cassa: saldoCassa,
        saldo_iniziale_banca: saldoBanca
      })
      .eq("mese", mese);

    alert("Mese chiuso correttamente");
  };

  const riapriMese = async () => {
    if (password !== "Nmdcdnv74!") {
      alert("Password errata");
      return;
    }

    await supabase
      .from("mesi")
      .update({ stato: "aperto" })
      .eq("mese", mese);

    alert("Mese riaperto");
    setPassword("");
  };

  return (
    <div>
      <h1>Chiusura Mese</h1>

      <input
        type="month"
        value={mese}
        onChange={(e) => setMese(e.target.value)}
      />

      <div style={{ marginTop: 20 }}>
        <button onClick={chiudiMese}>
          Chiudi Mese
        </button>
      </div>

      <hr />

      <h2>Riapri Mese (solo amministratore)</h2>

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={riapriMese}>
        Riapri
      </button>
    </div>
  );
}
