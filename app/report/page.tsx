"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ReportPage() {

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

  const generaReport = async () => {

    const { data: movimenti } = await supabase
      .from("movimenti_finanziari")
      .select("*")
      .eq("mese", mese);

    const { data: soci } = await supabase
      .from("soci")
      .select("*");

    if (!movimenti) return;

    const incassi = movimenti.filter(
      m =>
        m.tipo === "incasso" &&
        m.categoria !== "versamento_socio" &&
        m.categoria !== "trasferimento"
    );

    const spese = movimenti.filter(m => m.tipo === "spesa");

    const versamentiAffitto = movimenti.filter(
      m => m.tipo === "versamento_affitto"
    );

    const pagamentoAffitto = movimenti.filter(
      m => m.tipo === "pagamento_affitto"
    );

    const totIncassi = incassi.reduce((s, m) => s + Number(m.importo), 0);
    const totSpese = Math.abs(
      spese.reduce((s, m) => s + Number(m.importo), 0)
    );

    const risultato = totIncassi - totSpese;

    const saldoCassa = movimenti
      .filter(m => m.contenitore === "cassa_operativa")
      .reduce((s, m) => s + Number(m.importo), 0);

    const saldoBanca = movimenti
      .filter(m => m.contenitore === "banca")
      .reduce((s, m) => s + Number(m.importo), 0);

    const saldoAffitto = movimenti
      .filter(m => m.contenitore === "cassa_affitto")
      .reduce((s, m) => s + Number(m.importo), 0);

    const nuovaFinestra = window.open("", "_blank");
    if (!nuovaFinestra) return;

    nuovaFinestra.document.write(`
      <html>
      <head>
        <title>Report ${mese}</title>
        <style>
          body { font-family: Arial; padding: 40px; }
          h1 { color: black; }
          table { width:100%; border-collapse: collapse; margin-bottom:20px; }
          th, td { border:1px solid black; padding:8px; }
          th { background:#f0f0f0; }
          .neg { color:red; }
          .pos { color:green; }
        </style>
      </head>
      <body>

      <h1>HIP HOP FAMILY - REPORT ${mese}</h1>

      <h2>OPERATIVITÀ</h2>

      <table>
        <tr><th>Voce</th><th>Importo</th></tr>
        <tr><td>Totale Incassi</td><td>€ ${totIncassi.toFixed(2)}</td></tr>
        <tr><td>Totale Spese</td><td>€ ${totSpese.toFixed(2)}</td></tr>
        <tr>
          <td><strong>Risultato Operativo</strong></td>
          <td class="${risultato < 0 ? "neg" : "pos"}">
            € ${risultato.toFixed(2)}
          </td>
        </tr>
      </table>

      <h2>DETTAGLIO INCASSI</h2>

      <table>
        <tr><th>Descrizione</th><th>Importo</th></tr>
        ${incassi.map(i => `
          <tr>
            <td>${i.descrizione}</td>
            <td class="pos">€ ${Number(i.importo).toFixed(2)}</td>
          </tr>
        `).join("")}
      </table>

      ${risultato < 0 ? `
      <h3>Ripartizione Soci</h3>
      <table>
        <tr><th>Socio</th><th>Quota %</th><th>Da Versare</th></tr>
        ${soci?.map(s => {
          const quota = Math.abs(risultato) * (Number(s.quota_percentuale) / 100);
          return `
            <tr>
              <td>${s.nome}</td>
              <td>${s.quota_percentuale}%</td>
              <td>€ ${quota.toFixed(2)}</td>
            </tr>
          `;
        }).join("")}
      </table>
      ` : ""}

      <h2>AFFITTO</h2>

      <table>
        <tr><th>Versamenti Affitto</th><th>Importo</th></tr>
        ${versamentiAffitto.map(v => `
          <tr><td>Versamento</td><td>€ ${Number(v.importo).toFixed(2)}</td></tr>
        `).join("")}
        ${pagamentoAffitto.map(p => `
          <tr><td>Pagamento Affitto</td><td>€ ${Number(p.importo).toFixed(2)}</td></tr>
        `).join("")}
        <tr>
          <td><strong>Saldo Affitto</strong></td>
          <td>${saldoAffitto.toFixed(2)}</td>
        </tr>
      </table>

      <h2>SALDI FINANZIARI</h2>

      <table>
        <tr><td>Cassa Operativa</td><td>€ ${saldoCassa.toFixed(2)}</td></tr>
        <tr><td>Banca</td><td>€ ${saldoBanca.toFixed(2)}</td></tr>
      </table>

      <script>
        window.print();
      </script>

      </body>
      </html>
    `);

    nuovaFinestra.document.close();
  };

  return (
    <div className="space-y-6">

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
