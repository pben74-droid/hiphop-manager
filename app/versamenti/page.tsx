"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function VersamentiPage() {
  const [mese, setMese] = useState("2026-02");
  const [statoMese, setStatoMese] = useState("aperto");
  const [soci, setSoci] = useState<any[]>([]);
  const [versamenti, setVersamenti] = useState<any[]>([]);
  const [nuoviImporti, setNuoviImporti] = useState<any>({});

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

    // Soci
    const { data: sociData } = await supabase
      .from("soci")
      .select("*");

    // Versamenti operativi del mese
    const { data: versData } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese)
      .eq("tipo", "versamento_operativo");

    setSoci(sociData || []);
    setVersamenti(versData || []);
  };

  const registraVersamento = async (socioId: string) => {
    if (statoMese === "chiuso") {
      alert("Mese chiuso. Modifiche non consentite.");
      return;
    }

    const importo = Number(nuoviImporti[socioId]);

    if (!importo || importo <= 0) {
      alert("Importo non valido");
      return;
    }

    const oggi = new Date().toISOString().split("T")[0];

    await supabase.from("movimenti_finanziari").insert({
      tipo: "versamento_operativo",
      contenitore: "cassa_operativa",
      importo: importo,
      data: oggi,
      mese,
    });

    setNuoviImporti({
      ...nuoviImporti,
      [socioId]: "",
    });

    loadData();
  };

  const eliminaVersamento = async (id: string) => {
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
      <h1>Versamenti Operativi Soci</h1>

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

      <h2 style={{ marginTop: 20 }}>Inserimento Versamenti</h2>

      {soci.map((s) => (
        <div
          key={s.id}
          style={{
            border: "1px solid black",
            padding: 10,
            marginBottom: 10,
          }}
        >
          <strong>{s.nome}</strong>

          <input
            type="number"
            placeholder="Importo"
            value={nuoviImporti[s.id] || ""}
            onChange={(e) =>
              setNuoviImporti({
                ...nuoviImporti,
                [s.id]: e.target.value,
              })
            }
            disabled={statoMese === "chiuso"}
          />

          <button
            onClick={() => registraVersamento(s.id)}
            disabled={statoMese === "chiuso"}
          >
            Registra
          </button>
        </div>
      ))}

      <h2 style={{ marginTop: 30 }}>Elenco Versamenti</h2>

      {versamenti.map((v) => (
        <div
          key={v.id}
          style={{
            border: "1px solid black",
            padding: 10,
            marginBottom: 10,
          }}
        >
          € {Number(v.importo).toFixed(2)}
          {statoMese === "aperto" && (
            <button
              onClick={() => eliminaVersamento(v.id)}
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
