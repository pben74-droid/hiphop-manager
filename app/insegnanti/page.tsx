  const salvaLezione = async () => {

    if (!insegnanteId || !data) {
      alert("Inserisci insegnante e data")
      return
    }

    await supabase
      .from("lezioni_insegnanti")
      .insert({

        mese,
        insegnante_id: insegnanteId,
        data,
        ore: Number(ore),
        costo_orario: Number(costo),
        rimborso_benzina: Number(benzina),
        stato: "svolta"

      })

    await sincronizzaCompensi(mese)

    carica()

  }

  const eliminaLezione = async (id:string) => {

    await supabase
      .from("lezioni_insegnanti")
      .delete()
      .eq("id", id)

    await sincronizzaCompensi(mese)

    carica()

  }

  if (loading)
    return <div className="p-6">Caricamento...</div>

  return (

    <div className="p-6 space-y-10">

      <h1 className="text-2xl font-bold">
        Gestione Insegnanti
      </h1>

      <button
        onClick={generaCalendario}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Genera Calendario Mese
      </button>

      {/* FORM INSERIMENTO LEZIONE */}

      <div className="border p-4 rounded bg-white space-y-4">

        <h2 className="font-bold">
          Inserisci Lezione
        </h2>

        <select
          value={insegnanteId}
          onChange={e =>
            setInsegnanteId(e.target.value)
          }
          className="border p-2"
        >
          <option value="">Seleziona insegnante</option>

          {insegnanti.map(i => (
            <option key={i.id} value={i.id}>
              {i.nome}
            </option>
          ))}

        </select>

        <input
          type="date"
          value={data}
          onChange={e =>
            setData(e.target.value)
          }
          className="border p-2"
        />

        <input
          type="number"
          placeholder="Ore"
          value={ore}
          onChange={e =>
            setOre(e.target.value)
          }
          className="border p-2"
        />

        <input
          type="number"
          placeholder="Costo orario"
          value={costo}
          onChange={e =>
            setCosto(e.target.value)
          }
          className="border p-2"
        />

        <input
          type="number"
          placeholder="Rimborso benzina"
          value={benzina}
          onChange={e =>
            setBenzina(e.target.value)
          }
          className="border p-2"
        />

        <button
          onClick={salvaLezione}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Inserisci Lezione
        </button>

      </div>

      {/* ELENCO LEZIONI */}

      <div className="space-y-2">

        {lezioni.map(l => {

          const ins =
            insegnanti.find(
              i => i.id === l.insegnante_id
            )

          return (

            <div
              key={l.id}
              className="flex justify-between border p-2"
            >

              <span>
                {l.data} — {ins?.nome} —
                {l.ore}h × {l.costo_orario}€
              </span>

              <button
                onClick={() =>
                  eliminaLezione(l.id)
                }
                className="text-red-600"
              >
                Elimina
              </button>

            </div>

          )

        })}

      </div>

    </div>

  )

}
  const generaCalendario = async () => {

    const { data: ins } = await supabase
      .from("insegnanti")
      .select("*")
      .eq("attivo", true)

    const { data: fasce } = await supabase
      .from("insegnanti_fasce")
      .select("*")

    const [anno, meseNumero] = mese.split("-").map(Number)

    const giorniNelMese = new Date(
      anno,
      meseNumero,
      0
    ).getDate()

    const nuoveLezioni:any[] = []

    for (let giorno = 1; giorno <= giorniNelMese; giorno++) {

      const dataLezione =
        new Date(anno, meseNumero - 1, giorno)

      const giornoSettimana =
        dataLezione.getDay() === 0
          ? 7
          : dataLezione.getDay()

      ins?.forEach(i => {

        const fasceInsegnante =
          fasce?.filter(
            f =>
              f.insegnante_id === i.id &&
              f.giorno_settimana === giornoSettimana
          ) || []

        fasceInsegnante.forEach((f,index)=>{

          nuoveLezioni.push({

            mese,
            insegnante_id: i.id,
            data: dataLezione.toISOString().slice(0,10),
            ore: f.ore,
            costo_orario: f.costo_orario,
            rimborso_benzina:
              index === 0 ? i.rimborso_benzina : 0,
            stato: "programmata"

          })

        })

      })

    }

    await supabase
      .from("lezioni_insegnanti")
      .delete()
      .eq("mese", mese)

    await supabase
      .from("lezioni_insegnanti")
      .insert(nuoveLezioni)

    await sincronizzaCompensi(mese)

    carica()

  }

  const salvaLezione = async () => {

    if (!insegnanteId || !data) {
      alert("Inserisci insegnante e data")
      return
    }

    await supabase
      .from("lezioni_insegnanti")
      .insert({

        mese,
        insegnante_id: insegnanteId,
        data,
        ore: Number(ore),
        costo_orario: Number(costo),
        rimborso_benzina: Number(benzina),
        stato: "svolta"

      })

    await sincronizzaCompensi(mese)

    carica()

  }

  const eliminaLezione = async (id:string) => {

    await supabase
      .from("lezioni_insegnanti")
      .delete()
      .eq("id", id)

    await sincronizzaCompensi(mese)

    carica()

  }

  if (loading)
    return <div className="p-6">Caricamento...</div>

  return (

    <div className="p-6 space-y-10">

      <h1 className="text-2xl font-bold">
        Gestione Insegnanti
      </h1>

      {/* CREAZIONE INSEGNANTE */}

      <div className="border p-4 rounded bg-white space-y-4">

        <h2 className="font-bold">
          Nuovo Insegnante
        </h2>

        <input
          type="text"
          placeholder="Nome insegnante"
          value={nome}
          onChange={e => setNome(e.target.value)}
          className="border p-2 w-full"
        />

        <input
          type="number"
          placeholder="Rimborso benzina per giornata"
          value={rimborso}
          onChange={e => setRimborso(e.target.value)}
          className="border p-2 w-full"
        />

        {fasce.map((f,index)=>(

          <div key={index} className="flex gap-2">

            <select
              value={f.giorno_settimana}
              onChange={e =>
                aggiornaFascia(
                  index,
                  "giorno_settimana",
                  Number(e.target.value)
                )
              }
              className="border p-2"
            >

              {giorniSettimana.map(g=>(
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}

            </select>

            <input
              type="number"
              placeholder="Ore"
              value={f.ore}
              onChange={e =>
                aggiornaFascia(index,"ore",e.target.value)
              }
              className="border p-2 w-24"
            />

            <input
              type="number"
              placeholder="Costo orario"
              value={f.costo_orario}
              onChange={e =>
                aggiornaFascia(index,"costo_orario",e.target.value)
              }
              className="border p-2 w-32"
            />

          </div>

        ))}

        <button
          onClick={aggiungiFascia}
          className="bg-gray-700 text-white px-4 py-2 rounded"
        >
          Aggiungi Fascia
        </button>

        <button
          onClick={salvaInsegnante}
          className="bg-black text-white px-6 py-2 rounded"
        >
          Salva Insegnante
        </button>

      </div>

    </div>

  )

}
