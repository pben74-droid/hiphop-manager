"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { inizializzaMese } from "@/lib/gestioneMese";

export default function AffittoPage() {
  const [mese, setMese] = useState("2026-02");
  const [statoMese, setStatoMese] = useState("aperto");

  const [importoAffitto, setImportoAffitto] = useState("");
  const [versamentoSocio, setVersamentoSocio] = useState("");

  const [movimenti, setMovimenti] = useState<any[]>([]);

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

    const { data } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese)
      .eq("contenitore", "cassa_affitto");

    setMovimenti(data || []);
  };

  const registraVersamento = async () => {
    if (statoMese === "chiuso") return alert("Mese chiuso");

    await supabase.from("movimenti_finanziari").insert({
      tipo: "versamento_affitto",
      contenitore: "cassa_affitto",
      importo: Number(versamentoSocio),
      mese,
      data: new Date().toISOString().split("T")[0],
    });

    setVersamentoSocio("");
    loadData();
  };

  const pagaAffitto = async () => {
    if (statoMese === "chiuso") return alert("Mese chiuso");

    await supabase.from("movimenti_finanziari").insert({
      tipo: "pagamento_affitto",
      contenitore: "cassa_affitto",
      importo: -Number(importoAffitto),
      mese,
      data: new Date().toISOString().split("T")[0],
    });

    setImportoAffitto("");
    loadData();
  };

  const elimina = async (id: string) => {
    if (statoMese === "chiuso") return;

    await supabase
      .from("movimenti_finanziari")
      .delete()
      .eq("id", id);

    loadData();
  };

  const saldoAffitto = movimenti.reduce(
    (s, m) => s + Number(m.importo),
    0
  );

  return (
    <div>
      <h1>Gestione Affitto</h1>

      <input
        type="month"
        value={mese}
        onChange={(e) => setMese(e.target.value)}
      />

      <p>Stato mese: {statoMese}</p>

      {statoMese === "chiuso" && (
        <p style={{ color: "red" }}>Mese chiuso</p>
      )}

      <hr />

      <h2>Versamento Soci (Contanti)</h2>

      <input
        type="number"
        placeholder="Importo"
        value={versamentoSocio}
        onChange={(e) => setVersamentoSocio(e.target.value)}
        disabled={statoMese === "chiuso"}
      />

      <button
        onClick={registraVersamento}
        disabled={statoMese === "chiuso"}
      >
        Registra Versamento
      </button>

      <hr />

      <h2>Pagamento Affitto</h2>

      <input
        type="number"
        placeholder="Importo affitto"
        value={importoAffitto}
        onChange={(e) => setImportoAffitto(e.target.value)}
        disabled={statoMese === "chiuso"}
      />

      <button
        onClick={pagaAffitto}
        disabled={statoMese === "chiuso"}
      >
        Paga Affitto
      </button>

      <hr />

      <h2>Saldo Cassa Affitto</h2>
      <strong>€ {saldoAffitto.toFixed(2)}</strong>

      <hr />

      <h2>Movimenti Affitto</h2>

      {movimenti.map((m) => (
        <div
          key={m.id}
          style={{
            border: "1px solid black",
            padding: 10,
            marginBottom: 10,
          }}
        >
          € {Number(m.importo).toFixed(2)} — {m.tipo}

          {statoMese === "aperto" && (
            <button
              onClick={() => elimina(m.id)}
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
