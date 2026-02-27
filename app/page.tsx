"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [mese, setMese] = useState("2026-02");
  const [statoMese, setStatoMese] = useState("aperto");
  const [soci, setSoci] = useState<any[]>([]);
  const [saldoCassaOperativa, setSaldoCassaOperativa] = useState(0);
  const [saldoBanca, setSaldoBanca] = useState(0);
  const [totIncassi, setTotIncassi] = useState(0);
  const [totSpese, setTotSpese] = useState(0);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
      } else {
        setLoading(false);
        loadData();
      }
    };
    checkUser();
  }, []);

  const loadData = async () => {
    const { data: sociData } = await supabase.from("soci").select("*");

    const { data: movimenti } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese);

    const { data: meseData } = await supabase
      .from("mesi")
      .select("*")
      .eq("mese", mese)
      .single();

    if (!meseData) {
      await supabase.from("mesi").insert({
        mese,
        stato: "aperto"
      });
      setStatoMese("aperto");
    } else {
      setStatoMese(meseData.stato);
    }

    const incassi = movimenti?.filter(m => m.tipo === "incasso") || [];
    const spese = movimenti?.filter(m => m.tipo === "spesa") || [];

    const totaleIncassi =
      incassi.reduce((sum, i) => sum + Number(i.importo), 0) || 0;

    const totaleSpese =
      Math.abs(spese.reduce((sum, s) => sum + Number(s.importo), 0)) || 0;

    const cassaOperativa =
      movimenti
        ?.filter(m => m.contenitore === "cassa_operativa")
        .reduce((sum, m) => sum + Number(m.importo), 0) || 0;

    const banca =
      movimenti
        ?.filter(m => m.contenitore === "banca")
        .reduce((sum, m) => sum + Number(m.importo), 0) || 0;

    setSaldoCassaOperativa(cassaOperativa);
    setSaldoBanca(banca);
    setTotIncassi(totaleIncassi);
    setTotSpese(totaleSpese);
    setSoci(sociData || []);
  };

  const chiudiMese = async () => {
    const risultatoOperativo = totIncassi - totSpese;

    if (saldoCassaOperativa < 0 || saldoBanca < 0) {
      alert("Non puoi chiudere: saldo negativo.");
      return;
    }

    if (risultatoOperativo < 0) {
      alert("Non puoi chiudere: quote soci non completamente versate.");
      return;
    }

    await supabase
      .from("mesi")
      .update({ stato: "chiuso" })
      .eq("mese", mese);

    alert("Mese chiuso e storicizzato.");
    loadData();
  };

  const riapriMese = async () => {
    const pwd = prompt("Inserisci password:");

    if (pwd !== "Nmdcdnv74!") {
      alert("Password errata.");
      return;
    }

    await supabase
      .from("mesi")
      .update({ stato: "aperto" })
      .eq("mese", mese);

    alert("Mese riaperto.");
    loadData();
  };

  if (loading) return null;

  const risultatoOperativo = totIncassi - totSpese;

  return (
    <div style={{ padding: 30 }}>
      <h1>Dashboard Operativa</h1>

      <input
        type="month"
        value={mese}
        onChange={(e) => setMese(e.target.value)}
      />
      <button onClick={loadData}>Carica</button>

      <h3>Stato mese: {statoMese}</h3>

      <h2>Incassi: € {totIncassi.toFixed(2)}</h2>
      <h2>Spese: € {totSpese.toFixed(2)}</h2>
      <h2>Risultato: € {risultatoOperativo.toFixed(2)}</h2>

      <h3>Cassa Operativa: € {saldoCassaOperativa.toFixed(2)}</h3>
      <h3>Banca: € {saldoBanca.toFixed(2)}</h3>

      {statoMese === "aperto" && (
        <button onClick={chiudiMese} style={{ marginTop: 20 }}>
          Chiudi Mese
        </button>
      )}

      {statoMese === "chiuso" && (
        <button onClick={riapriMese} style={{ marginTop: 20 }}>
          Riapri Mese (Password)
        </button>
      )}
    </div>
  );
}
