"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import useRequireAuth from "@/lib/useRequireAuth"
export default function ReportPage() {
useRequireAuth()
  const [mese, setMese] = useState("");
  const [listaMesi, setListaMesi] = useState<string[]>([]);

  useEffect(() => {
    caricaMesi();
  }, []);

  const caricaMesi = async () => {

    const { data } = await supabase
      .from("mesi")
      .select("mese")
      .order("mese", { ascending: false });

    const mesi = data?.map(m => m.mese) || [];

    setListaMesi(mesi);

    if (mesi.length > 0) {
      setMese(mesi[0]); // mese più recente
    }
  };

  const generaReport = () => {

    if (!mese) return;

    // apre il report PDF generato dal server
    window.open(`/api/report?mese=${mese}`, "_blank");

  };

  return (
    <div className="space-y-6 p-6">

      <h1 className="text-3xl font-bold">
        Archivio Report Mensili
      </h1>

      <div className="flex gap-4 items-center">

        <select
          value={mese}
          onChange={(e) => setMese(e.target.value)}
          className="border p-2 rounded"
        >
          {listaMesi.map(m => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <button
          onClick={generaReport}
          className="bg-black text-white px-6 py-2 rounded"
        >
          Genera Report
        </button>

      </div>

    </div>
  );
}
