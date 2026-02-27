import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { PDFDocument, StandardFonts } from "pdf-lib"

export async function GET(request: Request) {

  const { searchParams } = new URL(request.url)
  const mese = searchParams.get("mese")

  if (!mese) {
    return NextResponse.json({ error: "Mese mancante" }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  /* ==============================
     RECUPERO DATI
  ============================== */

  const { data: movimenti } = await supabase
    .from("movimenti_finanziari")
    .select("*")
    .eq("mese", mese)
    .order("data")

  const { data: soci } = await supabase
    .from("soci")
    .select("*")

  const { data: versamenti } = await supabase
    .from("versamenti_soci")
    .select("*")
    .eq("mese", mese)

  const { data: affittoMese } = await supabase
    .from("affitto_mese")
    .select("*")
    .eq("mese", mese)
    .maybeSingle()

  const { data: affittoPagamenti } = await supabase
    .from("affitto_pagamenti")
    .select("*")
    .eq("mese", mese)

  /* ==============================
     FILTRAGGI
  ============================== */

  const incassi = movimenti?.filter(
    m => m.tipo === "incasso" && m.categoria !== "trasferimento"
  ) || []

  const speseVarie = movimenti?.filter(
    m => m.tipo === "spesa" &&
         m.categoria === "spesa_generica"
  ) || []

  const insegnanti = movimenti?.filter(
    m => m.categoria === "insegnante"
  ) || []

  const totaleIncassi = incassi.reduce((a, m) => a + Number(m.importo), 0)
  const totaleSpese = movimenti
    ?.filter(m => m.categoria !== "trasferimento")
    .reduce((a, m) => a + Number(m.importo), 0) || 0

  /* ==============================
     CREAZIONE PDF
  ============================== */

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  let y = 800

  const draw = (text: string) => {
    page.drawText(text, {
      x: 50,
      y,
      size: 10,
      font
    })
    y -= 14
  }

  draw("HIP HOP FAMILY MANAGER")
  draw(`Report Mensile - ${mese}`)
  y -= 10

  /* ==============================
     INCASSI
  ============================== */

  draw("=== INCASSI ===")
  incassi.forEach(i => {
    draw(`${i.data} - ${i.descrizione} - ${Number(i.importo).toFixed(2)} €`)
  })
  y -= 10

  /* ==============================
     SPESE VARIE
  ============================== */

  draw("=== SPESE VARIE ===")
  speseVarie.forEach(s => {
    draw(`${s.data} - ${s.descrizione} - ${Math.abs(Number(s.importo)).toFixed(2)} €`)
  })
  y -= 10

  /* ==============================
     COMPENSI INSEGNANTI
  ============================== */

  draw("=== COMPENSI INSEGNANTI ===")
  insegnanti.forEach(ins => {
    draw(`${ins.data} - ${ins.descrizione} - ${Math.abs(Number(ins.importo)).toFixed(2)} €`)
  })
  y -= 10

  /* ==============================
     RIEPILOGO
  ============================== */

  draw("=== RIEPILOGO OPERATIVO ===")
  draw(`Totale Incassi: ${totaleIncassi.toFixed(2)} €`)
  draw(`Risultato Operativo: ${totaleSpese.toFixed(2)} €`)
  y -= 10

  /* ==============================
     AFFITTO
  ============================== */

  if (affittoMese) {

    draw("=== AFFITTO ===")
    draw(`Costo Mensile: ${Number(affittoMese.costo_mensile).toFixed(2)} €`)

    affittoPagamenti?.forEach(p => {
      draw(`Pagamento socio ${p.socio_id} - ${Number(p.importo).toFixed(2)} €`)
    })
  }

  const pdfBytes = await pdfDoc.save()
  const buffer = Buffer.from(pdfBytes)

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=report_${mese}.pdf`
    }
  })
}
