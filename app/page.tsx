"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [mese, setMese] = useState("2026-02");
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
    // SOCI
    const { data: sociData } = await supabase.from("soci").select("*");

    // MOVIMENTI FINANZIARI DEL MESE
    const { data: movimenti } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese);

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

  if (loading) return null;

  const risultatoOperativo = totIncassi - totSpese;

  return (
    <div
      style={{
        background: "#0a0a0a",
        minHeight: "100vh",
        color: "#FFD700",
        padding: 30
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
          style={{ marginLeft: 10 }}
        >
          Carica Dati
        </button>
      </div>

      <h2>Totale Incassi: € {totIncassi.toFixed(2)}</h2>
      <h2>Totale Spese: € {totSpese.toFixed(2)}</h2>
      <h2>
        Risultato Operativo: € {risultatoOperativo.toFixed(2)}
      </h2>

      <hr style={{ margin: "20px 0" }} />

      <h2>Saldi Finanziari</h2>
      <h3>Cassa Operativa: € {saldoCassaOperativa.toFixed(2)}</h3>
      <h3>Banca: € {saldoBanca.toFixed(2)}</h3>

      <hr style={{ margin: "20px 0" }} />

      {risultatoOperativo < 0 && (
        <>
          <h2>Ripartizione Soci</h2>

          {soci.map((s) => {
            const quota =
              Math.abs(risultatoOperativo) *
              (Number(s.quota_percentuale) / 100);

            return (
              <div
                key={s.id}
                style={{
                  border: "1px solid #FFD700",
                  padding: 10,
                  marginBottom: 10
                }}
              >
                <strong>{s.nome}</strong><br />
                Quota da versare: € {quota.toFixed(2)}
              </div>
            );
          })}
        </>
      )}

      {saldoCassaOperativa < 0 && (
        <div style={{ color: "red", marginTop: 20 }}>
          ⚠ ATTENZIONE: Cassa operativa negativa
        </div>
      )}

      {saldoBanca < 0 && (
        <div style={{ color: "red" }}>
          ⚠ ATTENZIONE: Banca negativa
        </div>
      )}
    </div>
  );
}"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [mese, setMese] = useState("2026-02");
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
    // SOCI
    const { data: sociData } = await supabase.from("soci").select("*");

    // MOVIMENTI FINANZIARI DEL MESE
    const { data: movimenti } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese);

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

  if (loading) return null;

  const risultatoOperativo = totIncassi - totSpese;

  return (
    <div
      style={{
        background: "#0a0a0a",
        minHeight: "100vh",
        color: "#FFD700",
        padding: 30
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
          style={{ marginLeft: 10 }}
        >
          Carica Dati
        </button>
      </div>

      <h2>Totale Incassi: € {totIncassi.toFixed(2)}</h2>
      <h2>Totale Spese: € {totSpese.toFixed(2)}</h2>
      <h2>
        Risultato Operativo: € {risultatoOperativo.toFixed(2)}
      </h2>

      <hr style={{ margin: "20px 0" }} />

      <h2>Saldi Finanziari</h2>
      <h3>Cassa Operativa: € {saldoCassaOperativa.toFixed(2)}</h3>
      <h3>Banca: € {saldoBanca.toFixed(2)}</h3>

      <hr style={{ margin: "20px 0" }} />

      {risultatoOperativo < 0 && (
        <>
          <h2>Ripartizione Soci</h2>

          {soci.map((s) => {
            const quota =
              Math.abs(risultatoOperativo) *
              (Number(s.quota_percentuale) / 100);

            return (
              <div
                key={s.id}
                style={{
                  border: "1px solid #FFD700",
                  padding: 10,
                  marginBottom: 10
                }}
              >
                <strong>{s.nome}</strong><br />
                Quota da versare: € {quota.toFixed(2)}
              </div>
            );
          })}
        </>
      )}

      {saldoCassaOperativa < 0 && (
        <div style={{ color: "red", marginTop: 20 }}>
          ⚠ ATTENZIONE: Cassa operativa negativa
        </div>
      )}

      {saldoBanca < 0 && (
        <div style={{ color: "red" }}>
          ⚠ ATTENZIONE: Banca negativa
        </div>
      )}
    </div>
  );
}
