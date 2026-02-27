"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AffittoPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [mese, setMese] = useState("2026-02");
  const [importoAffitto, setImportoAffitto] = useState(0);
  const [soci, setSoci] = useState<any[]>([]);

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

    const { data: affittoData } = await supabase
      .from("affitto")
      .select("*")
      .eq("mese", mese)
      .single();

    const { data: versamenti } = await supabase
      .from("versamenti_soci")
      .select("*")
      .eq("tipo", "affitto")
      .eq("mese", mese);

    const sociConDati =
      sociData?.map((s) => {
        const versato =
          versamenti
            ?.filter((v) => v.socio_id === s.id)
            .reduce((sum, v) => sum + Number(v.importo), 0) || 0;

        return {
          ...s,
          versato_affitto: versato
        };
      }) || [];

    setSoci(sociConDati);
    setImportoAffitto(affittoData?.importo_totale || 0);
  };

  if (loading) return null;

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
      <h1>Modulo Affitto</h1>

      <div style={{ marginBottom: 20 }}>
        <input
          type="month"
          value={mese}
          onChange={(e) => setMese(e.target.value)}
        />
        <button onClick={loadData} style={{ marginLeft: 10 }}>
          Carica
        </button>
      </div>

      <h2>Importo Affitto: € {importoAffitto.toFixed(2)}</h2>

      <div style={{ marginTop: 20 }}>
        {soci.map((s) => {
          const quota =
            importoAffitto *
            (Number(s.quota_percentuale) / 100);

          const versato = s.versato_affitto || 0;

          const differenza = quota - versato;

          const credito = versato > quota ? versato - quota : 0;

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
              Quota affitto: € {quota.toFixed(2)} <br />
              Versato: € {versato.toFixed(2)} <br />
              {differenza > 0 && (
                <span style={{ color: "red" }}>
                  Da versare: € {differenza.toFixed(2)}
                </span>
              )}
              {credito > 0 && (
                <span style={{ color: "lightgreen" }}>
                  Credito mese prossimo: € {credito.toFixed(2)}
                </span>
              )}
              {differenza <= 0 && credito === 0 && (
                <span style={{ color: "lightgreen" }}>
                  Affitto coperto
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
