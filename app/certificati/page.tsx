"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import useRequireAuth from "@/lib/useRequireAuth";

export default function CertificatiPage() {

  useRequireAuth();

  const [atleti, setAtleti] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome: "",
    cognome: "",
    indirizzo: "",
    codice_fiscale: "",
    data_scadenza: "",
  });
const formRef = useRef<HTMLDivElement | null>(null);
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

    if (editId) {

      await supabase
        .from("certificati_medici")
        .update(form)
        .eq("id", editId);

    } else {

      await supabase
        .from("certificati_medici")
        .insert(form);

    }

    setForm({
      nome: "",
      cognome: "",
      indirizzo: "",
      codice_fiscale: "",
      data_scadenza: "",
    });

    setEditId(null);

    loadData();
  };

  const elimina = async (id: string) => {

    await supabase
      .from("certificati_medici")
      .delete()
      .eq("id", id);

    loadData();

  };

  const modifica = (a: any) => {

    setForm({
      nome: a.nome,
      cognome: a.cognome,
      indirizzo: a.indirizzo || "",
      codice_fiscale: a.codice_fiscale || "",
      data_scadenza: a.data_scadenza,
    });

    setEditId(a.id);
setTimeout(() => {
  formRef.current?.scrollIntoView({ behavior: "smooth" });
}, 100);
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

  const formattaData = (data: string) => {
    return new Date(data).toLocaleDateString("it-IT");
  };

  return (

    <div>

      <h1>
  {editId ? "Modifica Certificato" : "Certificati Medici"}
</h1>

      <div ref={formRef} style={{ marginBottom: 30 }}>

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
          placeholder="Residenza"
          value={form.indirizzo}
          onChange={(e) =>
            setForm({ ...form, indirizzo: e.target.value })
          }
        />

        <input
          type="text"
          placeholder="Codice Fiscale"
          value={form.codice_fiscale}
          onChange={(e) =>
            setForm({
              ...form,
              codice_fiscale: e.target.value.toUpperCase(),
            })
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

        <button onClick={salva}>
          {editId ? "Aggiorna" : "Salva"}
        </button>

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

            Codice fiscale: {a.codice_fiscale}

            <br />

            Residenza: {a.indirizzo || "-"}

            <br />

            Scadenza: {formattaData(a.data_scadenza)}

            <br />

            <span style={{ color: stato.colore }}>
              {stato.testo}
            </span>

            <br />

            <div className="mt-2 flex gap-2">

  <button
    onClick={() => modifica(a)}
    className="px-3 py-1 rounded bg-blue-500 text-white text-sm hover:bg-blue-600 transition"
  >
    Modifica
  </button>

  <button
    onClick={() => elimina(a.id)}
    className="px-3 py-1 rounded bg-red-500 text-white text-sm hover:bg-red-600 transition"
  >
    Elimina
  </button>

</div>

          </div>

        );

      })}

    </div>

  );

}
