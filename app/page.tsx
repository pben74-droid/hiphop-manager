"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [mese, setMese] = useState("2026-02");
  const [soci, setSoci] = useState<any[]>([]);
  const [totIncassi, setTotIncassi] = useState(0);
  const [totSpese, setTotSpese] = useState(0);

  // 🔐 Controllo autenticazione
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

  // 📊 Caricamento dati completi
  const loadData = async () => {
    const start = mese + "-01";

    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + 1);
    const end = endDate.toISOString().split("T")[0];

    // Soci
    const { data: sociData } = await supabase.from("soci").select("*");

    // Incassi mese
    const { data: incassi } = await supabase
      .from("incassi")
      .select("*")
      .gte("data", start)
      .lt("data", end);

    // Spese operative mese
    const { data: spese } = await supabase
      .from("spese")
      .select("*")
      .gte("data", start)
      .lt("data", end);

    // Versamenti operativi mese
    const { data: versamenti } = await supabase
      .from("versamenti_soci")
      .select("*")
      .eq("tipo", "operativo")
      .eq("mese", mese);

    const totaleIncassi =
      incassi?.reduce((sum, i) => sum + Number(i.importo), 0) || 0;

    const totaleSpese =
      spese?.reduce((sum, s) => sum + Number(s.importo), 0) || 0;

    setTotIncassi(totaleIncassi);
    setTotSpese(totaleSpese);

    // Calcolo versamenti per socio
    const sociConVersamenti =
      sociData?.map((s) => {
        const totaleVersato =
          versamenti
            ?.filter((v) => v.socio_id === s.id)
            .reduce((sum, v) => sum + Number(v.importo), 0) || 0;

        return {
          ...s,
          versato_operativo: totaleVersato
        };
      }) || [];

    setSoci(sociConVersamenti);
  };

  if (loading) return null;

  const risultatoOperativo = totIncassi - totSpese;

  return (
    <div
      style={{
        background: "#0a0a0a",
        minHeight: "100vh",
        color: "#FFD700",
        padding: 30,
        fontFamily: "Arial"
      }}
    >
      <h1>Dashboard Operativa</h1>

      <div style={{ marginBottom: 20 }}>
        <input
          type="month"
          value={mese}
          onChange={(e) => setMese(e.target.value)}
        />
        <button
          onClick={loadData}
          style={{
            marginLeft: 10,
            padding: "5px 10px",
            backgroundColor: "#FFD700",
            border: "none",
            cursor: "pointer"
          }}
        >
          Carica Dati
        </button>
      </div>

      <h2>Totale Incassi: € {totIncassi.toFixed(2)}</h2>
      <h2>Totale Spese Operative: € {totSpese.toFixed(2)}</h2>
      <h2>
        Risultato Operativo: € {risultatoOperativo.toFixed(2)}
      </h2>

      {risultatoOperativo < 0 && (
        <div style={{ marginTop: 30 }}>
          <h3>Situazione Soci</h3>

          {soci.map((s) => {
            const quotaTeorica =
              Math.abs(risultatoOperativo) *
              (Number(s.quota_percentuale) / 100);

            const versato = s.versato_operativo || 0;

            const differenza = quotaTeorica - versato;

            return (
              <div
                key={s.id}
                style={{
                  marginBottom: 15,
                  padding: 10,
                  border: "1px solid #FFD700"
                }}
              >
                <strong>{s.nome}</strong><br />
                Quota teorica: € {quotaTeorica.toFixed(2)} <br />
                Versato: € {versato.toFixed(2)} <br />
                <span
                  style={{
                    color: differenza > 0 ? "red" : "lightgreen"
                  }}
                >
                  Da versare: €{" "}
                  {differenza > 0
                    ? differenza.toFixed(2)
                    : "0.00"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
