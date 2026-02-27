"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ReportPage() {
  const [mese, setMese] = useState("2026-02");
  const [reportData, setReportData] = useState<any>(null);

  const generaReport = async () => {
    const { data: movimenti } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese);

    const { data: soci } = await supabase
      .from("soci")
      .select("*");

    const { data: affitto } = await supabase
      .from("affitto")
      .select("*")
      .eq("mese", mese)
      .single();

    const incassi = movimenti?.filter(m => m.tipo === "incasso") || [];
    const spese = movimenti?.filter(m => m.tipo === "spesa") || [];
    const versamenti = movimenti?.filter(m => m.tipo === "versamento_operativo") || [];
    const versamentiAffitto = movimenti?.filter(m => m.tipo === "versamento_affitto") || [];

    const totIncassi = incassi.reduce((s,i)=> s+Number(i.importo),0);
    const totSpese = Math.abs(spese.reduce((s,i)=> s+Number(i.importo),0));
    const risultato = totIncassi - totSpese;

    const saldoCassa = movimenti
      ?.filter(m=>m.contenitore==="cassa_operativa")
      .reduce((s,m)=>s+Number(m.importo),0) || 0;

    const saldoBanca = movimenti
      ?.filter(m=>m.contenitore==="banca")
      .reduce((s,m)=>s+Number(m.importo),0) || 0;

    setReportData({
      incassi,
      spese,
      versamenti,
      versamentiAffitto,
      soci,
      affitto,
      totIncassi,
      totSpese,
      risultato,
      saldoCassa,
      saldoBanca
    });
  };

  const stampaPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !reportData) return;

    printWindow.document.write(`
      <html>
      <head>
        <title>Report ${mese}</title>
        <style>
          body { font-family: Arial; padding: 40px; }
          h1 { color: #FFD700; }
          table { width:100%; border-collapse: collapse; margin-bottom:20px; }
          th, td { border:1px solid black; padding:8px; text-align:left; }
          .section { margin-top:40px; }
        </style>
      </head>
      <body>
        <h1>HIP HOP FAMILY - Report ${mese}</h1>

        <div class="section">
          <h2>Incassi</h2>
          <table>
            <tr><th>Importo</th><th>Contenitore</th></tr>
            ${reportData.incassi.map((i:any)=>`
              <tr><td>€ ${Number(i.importo).toFixed(2)}</td><td>${i.contenitore}</td></tr>
            `).join("")}
          </table>
          Totale Incassi: € ${reportData.totIncassi.toFixed(2)}
        </div>

        <div class="section">
          <h2>Spese</h2>
          <table>
            <tr><th>Importo</th><th>Contenitore</th></tr>
            ${reportData.spese.map((s:any)=>`
              <tr><td>€ ${Math.abs(Number(s.importo)).toFixed(2)}</td><td>${s.contenitore}</td></tr>
            `).join("")}
          </table>
          Totale Spese: € ${reportData.totSpese.toFixed(2)}
        </div>

        <div class="section">
          <h2>Risultato Operativo</h2>
          € ${reportData.risultato.toFixed(2)}
        </div>

        <div class="section">
          <h2>Ripartizione Soci</h2>
          <table>
            <tr><th>Socio</th><th>Quota %</th><th>Quota €</th></tr>
            ${reportData.soci.map((s:any)=>{
              const quota = reportData.risultato < 0
                ? Math.abs(reportData.risultato)*(Number(s.quota_percentuale)/100)
                : 0;
              return `<tr>
                <td>${s.nome}</td>
                <td>${s.quota_percentuale}%</td>
                <td>€ ${quota.toFixed(2)}</td>
              </tr>`;
            }).join("")}
          </table>
        </div>

        <div class="section">
          <h2>Saldi Finanziari</h2>
          Cassa Operativa: € ${reportData.saldoCassa.toFixed(2)}<br/>
          Banca: € ${reportData.saldoBanca.toFixed(2)}
        </div>

        <div class="section">
          <h2>Affitto</h2>
          Importo Affitto: € ${reportData.affitto?.importo_totale?.toFixed(2) || "0.00"}
        </div>

        <script>
          window.print();
        </script>

      </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <div>
      <h1>Report Mensile</h1>

      <input
        type="month"
        value={mese}
        onChange={(e)=>setMese(e.target.value)}
      />

      <button onClick={generaReport} style={{ marginLeft:10 }}>
        Genera Report
      </button>

      {reportData && (
        <button onClick={stampaPDF} style={{ marginLeft:10 }}>
          Apri PDF
        </button>
      )}
    </div>
  );
}
