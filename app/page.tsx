"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { inizializzaMese } from "@/lib/gestioneMese";

export default function Dashboard() {
  const [mese, setMese] = useState("2026-02");

  const [totIncassi, setTotIncassi] = useState(0);
  const [totSpese, setTotSpese] = useState(0);
  const [risultato, setRisultato] = useState(0);

  const [saldoCassa, setSaldoCassa] = useState(0);
  const [saldoBanca, setSaldoBanca] = useState(0);
  const [saldoAffitto, setSaldoAffitto] = useState(0);

  const [statoMese, setStatoMese] = useState("aperto");

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

    const { data: movimenti } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese);

    if (!movimenti) return;

    const incassi = movimenti
      .filter(m => m.tipo === "incasso")
      .reduce((s, m) => s + Number(m.importo), 0);

    const spese = Math.abs(
      movimenti
        .filter(m => m.tipo === "spesa")
        .reduce((s, m) => s + Number(m.importo), 0)
    );

    const saldoOperativa = movimenti
      .filter(m => m.contenitore === "cassa_operativa")
      .reduce((s, m) => s + Number(m.importo), 0);

    const saldoBancaCalc = movimenti
      .filter(m => m.contenitore === "banca")
      .reduce((s, m) => s + Number(m.importo), 0);

    const saldoAffittoCalc = movimenti
      .filter(m => m.contenitore === "cassa_affitto")
      .reduce((s, m) => s + Number(m.importo), 0);

    setTotIncassi(incassi);
    setTotSpese(spese);
    setRisultato(incassi - spese);

    setSaldoCassa(saldoOperativa);
    setSaldoBanca(saldoBancaCalc);
    setSaldoAffitto(saldoAffittoCalc);
  };

  return (
    <div style={{ padding: 30 }}>
      <h1>Dashboard Operativa</h1>

      <input
        type="month"
        value={mese}
        onChange={(e) => setMese(e.target.value)}
      />

      <p>Stato mese: {statoMese}</p>

      <hr />

      <h2>Operatività</h2>

      <p>Totale Incassi: € {totIncassi.toFixed(2)}</p>
      <p>Totale Spese: € {totSpese.toFixed(2)}</p>

      <p>
        Risultato Operativo:{" "}
        <strong style={{ color: risultato < 0 ? "red" : "green" }}>
          € {risultato.toFixed(2)}
        </strong>
      </p>

      {risultato < 0 && (
        <p style={{ color: "red" }}>
          ⚠ I soci devono coprire la differenza.
        </p>
      )}

      <hr />

      <h2>Saldi Finanziari</h2>

      <p>Cassa Operativa: € {saldoCassa.toFixed(2)}</p>
      <p>Banca: € {saldoBanca.toFixed(2)}</p>
      <p>Cassa Affitto: € {saldoAffitto.toFixed(2)}</p>

      {saldoAffitto !== 0 && (
        <p style={{ color: "orange" }}>
          ⚠ Affitto non ancora bilanciato.
        </p>
      )}
    </div>
  );
}
