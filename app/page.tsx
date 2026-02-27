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

  useEffect(() => {
    loadData();
  }, [mese]);

  const loadData = async () => {
    await inizializzaMese(mese);

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
    <div>

      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold text-yellow-500">
          Dashboard Operativa
        </h1>

        {/* FIX MESE INPUT */}
        <input
          type="month"
          value={mese}
          onChange={(e) => setMese(e.target.value)}
          className="
            bg-zinc-900
            text-yellow-400
            border
            border-yellow-500/50
            px-4
            py-2
            rounded-lg
            focus:outline-none
            focus:border-yellow-400
            focus:ring-2
            focus:ring-yellow-500/30
          "
        />
      </div>

      <div className="grid grid-cols-3 gap-6">

        <Card title="Incassi" value={totIncassi} positive />

        <Card title="Spese" value={totSpese} />

        <Card title="Risultato Operativo" value={risultato} highlight />

        <Card title="Cassa Operativa" value={saldoCassa} />

        <Card title="Banca" value={saldoBanca} />

        <Card title="Cassa Affitto" value={saldoAffitto} />

      </div>
    </div>
  );
}

function Card({
  title,
  value,
  positive,
  highlight
}: any) {

  let color = "text-white";

  if (positive) color = "text-green-400";
  if (highlight) color = value < 0 ? "text-red-500" : "text-yellow-500";

  return (
    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 shadow-lg hover:border-yellow-500 transition">
      <p className="text-sm text-zinc-400 mb-2 uppercase tracking-wider">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>
        € {value.toFixed(2)}
      </p>
    </div>
  );
}
