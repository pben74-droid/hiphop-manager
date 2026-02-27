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

  // 🔐 Controllo login
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

  // 📊 Caricamento dati per mese
  const loadData = async () => {
    const start = mese + "-01";

    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + 1);
    const end = endDate.toISOString().split("T")[0];

    // Soci
    const { data: sociData } = await supabase.from("soci").select("*");
    setSoci(sociData || []);

    // Incassi
    const { data: incassi } = await supabase
      .from("incassi")
      .select("*")
      .gte("data", start)
      .lt("data", end);

    // Spese
    const { data: spese } = await supabase
      .from("spese")
      .select("*")
      .gte("data", start)
      .lt("data", end);

    const totI =
      incassi?.reduce((sum, i) => sum + Number(i.importo), 0) || 0;

    const totS =
      spese?.reduce((sum, s) => sum + Number(s.importo), 0) || 0;

    setTotIncassi(totI);
    setTotSpese(totS);
  };

  if (loading) return null;

  const risultato = totIncassi - totSpese;

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
      <h2>Totale Spese: € {totSpese.toFixed(2)}</h2>
      <h2>
        Risultato Operativo: € {risultato.toFixed(2)}
      </h2>

      {risultato < 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>Quota da versare per socio:</h3>
          {soci.map((s) => {
            const quota =
              Math.abs(risultato) *
              (Number(s.quota_percentuale) / 100);

            return (
              <div key={s.id}>
                {s.nome} → € {quota.toFixed(2)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
