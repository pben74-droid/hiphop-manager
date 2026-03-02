# 🎯 HIP HOP FAMILY MANAGER

Gestionale amministrativo interno per ASD Hip Hop Family.

Stack:
- Next.js (App Router)
- Supabase (PostgreSQL + RLS)
- Tailwind CSS
- Deploy: Vercel

---

# 🏗 ARCHITETTURA

## Database (Supabase)

### Tabelle principali

### 1️⃣ mesi
Contiene stato e saldi mensili.

- id (uuid)
- mese (text, formato YYYY-MM)
- stato ("aperto" | "chiuso")
- saldo_cassa (numeric)
- saldo_banca (numeric)

---

### 2️⃣ movimenti_finanziari

Contiene tutti i movimenti economici e finanziari.

- id (uuid)
- mese (text)
- tipo ("incasso" | "spesa" | "trasferimento")
- categoria
- descrizione
- importo (numeric)
- contenitore ("cassa_operativa" | "banca")
- data

⚠️ I trasferimenti NON sono incassi né spese.

---

### 3️⃣ soci

- id
- nome
- quota_percentuale
- credito_affitto

---

### 4️⃣ versamenti_soci

- id
- socio_id
- mese
- importo
- data

---

### 5️⃣ affitto_mese

- id
- mese
- costo_mensile

---

### 6️⃣ affitto_pagamenti

- id
- mese
- socio_id
- importo
- data

---

# 💰 LOGICA CONTABILE

## Incassi
Tipo = "incasso"

- Possono essere in banca o cassa.
- Entrano nel calcolo risultato operativo.

---

## Spese
Tipo = "spesa"

- Importo sempre negativo.
- Possono scalare banca o cassa.
- Entrano nel calcolo risultato operativo.

---

## Trasferimenti
Tipo = "trasferimento"

- Movimento interno banca → cassa.
- NON è incasso.
- NON è spesa.
- NON entra nel risultato operativo.
- Evidenziato in blu.
- Visibile solo nella pagina Trasferimenti.

---

## Risultato Operativo

Formula:
