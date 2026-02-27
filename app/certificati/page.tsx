"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function CertificatiPage() {
  const [atleti, setAtleti] = useState<any[]>([]);
  const [form, setForm] = useState({
    nome: "",
    cognome: "",
    indirizzo: "",
    codice_fiscale: "",
    data_scadenza: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data } = await supabase
      .from("certificati_medici")
      .select("*")
      .order("cognome");

    setAtleti(data || []);
  };

  const salva = async () => {
    if (!form.nome || !form.cognome || !form.data_scadenza) {
      alert("Compila i campi obbligatori");
      return;
    }

    await supabase.from("certificati_medici").insert(form);

    setForm({
      nome: "",
      cognome: "",
      indirizzo: "",
      codice_fiscale: "",
      data_scadenza: "",
    });

    loadData();
  };

  const elimina = async (id: string) => {
    await supabase.from("certificati_medici").delete().eq("id", id);
    loadData();
  };

  const getStato = (data: string) => {
    const oggi = new Date();
    const scadenza = new Date(data);

    const diff = Math.ceil(
      (scadenza.getTime() - oggi.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (diff < 0) {
      return { testo: "Certificato Scaduto", colore: "red" };
    }

    if (diff <= 30) {
      return { testo: "Certificato in Scadenza", colore: "orange" };
    }

    return { testo: "Certificato Valido", colore: "green" };
  };

  return (
    <div>
      <h1>Certificati Medici</h1>

      <div style={{ marginBottom: 30 }}>
        <input
          placeholder="Nome"
          value={form.nome}
          onChange={(e) =>
            setForm({ ...form, nome: e.target.value })
          }
        />
        <input
          placeholder="Cognome"
          value={form.cognome}
          onChange={(e) =>
            setForm({ ...form, cognome: e.target.value })
          }
        />
        <input
          placeholder="Indirizzo"
          value={form.indirizzo}
          onChange={(e) =>
            setForm({ ...form, indirizzo: e.target.value })
          }
        />
        <input
          placeholder="Codice Fiscale"
          value={form.codice_fiscale}
          onChange={(e) =>
            setForm({ ...form, codice_fiscale: e.target.value })
          }
        />
        <input
          type="date"
          value={form.data_scadenza}
          onChange={(e) =>
            setForm({
              ...form,
              data_scadenza: e.target.value,
            })
          }
        />

        <button onClick={salva}>Salva</button>
      </div>

      <h2>Elenco Atleti</h2>

      {atleti.map((a) => {
        const stato = getStato(a.data_scadenza);

        return (
          <div
            key={a.id}
            style={{
              border: "1px solid black",
              padding: 10,
              marginBottom: 10,
            }}
          >
            <strong>
              {a.cognome} {a.nome}
            </strong>
            <br />
            CF: {a.codice_fiscale}
            <br />
            Scadenza: {a.data_scadenza}
            <br />
            <span style={{ color: stato.colore }}>
              {stato.testo}
            </span>

            <br />
            <button
              onClick={() => elimina(a.id)}
              style={{ marginTop: 5 }}
            >
              Elimina
            </button>
          </div>
        );
      })}
    </div>
  );
}
