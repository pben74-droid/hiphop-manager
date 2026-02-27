"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SociPage() {
  const [soci, setSoci] = useState<any[]>([]);
  const [nome, setNome] = useState("");
  const [quota, setQuota] = useState("");

  const loadSoci = async () => {
    const { data } = await supabase.from("soci").select("*");
    setSoci(data || []);
  };

  useEffect(() => {
    loadSoci();
  }, []);

  const salvaSocio = async () => {
    const percentuale = Number(quota);

    if (!nome || !percentuale) {
      alert("Dati non validi");
      return;
    }

    await supabase.from("soci").insert({
      nome,
      quota_percentuale: percentuale,
    });

    setNome("");
    setQuota("");
    loadSoci();
  };

  const eliminaSocio = async (id: string) => {
    await supabase.from("soci").delete().eq("id", id);
    loadSoci();
  };

  return (
    <div>
      <h1>Gestione Soci</h1>

      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="Nome socio"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />

        <input
          type="number"
          placeholder="Quota %"
          value={quota}
          onChange={(e) => setQuota(e.target.value)}
        />

        <button onClick={salvaSocio}>
          Aggiungi Socio
        </button>
      </div>

      <h2>Elenco Soci</h2>

      {soci.map((s) => (
        <div
          key={s.id}
          style={{
            border: "1px solid black",
            padding: 10,
            marginBottom: 10,
          }}
        >
          {s.nome} — {s.quota_percentuale} %
          <button
            onClick={() => eliminaSocio(s.id)}
            style={{ marginLeft: 10 }}
          >
            Elimina
          </button>
        </div>
      ))}
    </div>
  );
}
