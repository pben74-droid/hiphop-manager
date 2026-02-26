"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mese, setMese] = useState("2024-01");
  const [soci, setSoci] = useState<any[]>([]);
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
    setSoci(sociData || []);

    const { data: incassi } = await supabase
      .from("incassi")
      .select("*")
      .eq("mese", mese);

    const { data: spese } = await supabase
      .from("spese")
      .select("*")
      .eq("mese", mese);

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
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#FFD700", padding: 30 }}>
      <h1>Dashboard Operativa</h1>

      <input
        type="month"
        value={mese}
        onChange={(e) => setMese(e.target.value)}
        style={{ marginBottom: 20 }}
      />

      <button onClick={loadData}>Carica Dati</button>

      <h2>Totale Incassi: € {totIncassi.toFixed(2)}</h2>
      <h2>Totale Spese: € {totSpese.toFixed(2)}</h2>
      <h2>
        Risultato Operativo: € {risultato.toFixed(2)}
      </h2>

      {risultato < 0 && (
        <>
          <h2>Quota da coprire per socio:</h2>
          {soci.map((s) => {
            const quota = Math.abs(risultato) * (s.quota_percentuale / 100);
            return (
              <div key={s.id}>
                {s.nome} → € {quota.toFixed(2)}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
