import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

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

  /* =========================
     RECUPERO DATI
  ========================= */

  const { data: movimenti } = await supabase
    .from("movimenti_finanziari")
    .select("*")
    .eq("mese", mese)
    .order("data")

  const { data: soci } = await supabase.from("soci").select("*")

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

  /* =========================
     FILTRAGGI
  ========================= */

  const incassi = movimenti?.filter(
    m => m.tipo === "incasso" && m.categoria !== "trasferimento"
  ) || []

  const speseVarie = movimenti?.filter(
    m => m.categoria === "spesa_generica"
  ) || []

  const insegnanti = movimenti?.filter(
    m => m.categoria === "insegnante"
  ) || []

  const totaleIncassi = incassi.reduce((a, m) => a + Number(m.importo), 0)

  const risultatoOperativo = movimenti
    ?.filter(m => m.categoria !== "trasferimento")
    .reduce((a, m) => a + Number(m.importo), 0) || 0

  /* =========================
     PDF
  ========================= */

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  let y = 810

  const drawLine = () => {
    page.drawLine({
      start: { x: 40, y },
      end: { x: 555, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8)
    })
    y -= 10
  }

  const draw = (text: string, size = 10, bold = false) => {
    page.drawText(text, {
      x: 50,
      y,
      size,
      font
    })
    y -= size + 4
  }

  /* =========================
     HEADER
  ========================= */

  draw("HIP HOP FAMILY MANAGER", 16)
  draw(`Report Mensile: ${mese}`, 12)
  draw(`Generato il: ${new Date().toLocaleDateString()}`, 10)
  y -= 10
  drawLine()

  /* =========================
     INCASSI
  ========================= */

  draw("INCASSI", 12)
  incassi.forEach(i => {
    draw(`${i.data} | ${i.descrizione} | ${i.contenitore} | ${Number(i.importo).toFixed(2)} €`)
  })
  y -= 8
  drawLine()

  /* =========================
     SPESE VARIE
  ========================= */

  draw("SPESE VARIE", 12)
  speseVarie.forEach(s => {
    draw(`${s.data} | ${s.descrizione} | ${Math.abs(Number(s.importo)).toFixed(2)} €`)
  })
  y -= 8
  drawLine()

  /* =========================
     INSEGNANTI
  ========================= */

  draw("COMPENSI INSEGNANTI", 12)
  insegnanti.forEach(ins => {
    draw(`${ins.data} | ${ins.descrizione} | ${Math.abs(Number(ins.importo)).toFixed(2)} €`)
  })
  y -= 8
  drawLine()

  /* =========================
     RIEPILOGO OPERATIVO
  ========================= */

  draw("RIEPILOGO OPERATIVO", 12)
  draw(`Totale Incassi: ${totaleIncassi.toFixed(2)} €`)
  draw(`Risultato Operativo: ${risultatoOperativo.toFixed(2)} €`)
  y -= 8
  drawLine()

  /* =========================
     RIPARTIZIONE SOCI
  ========================= */

  draw("RIPARTIZIONE SOCI", 12)

  if (risultatoOperativo < 0) {

    const perdita = Math.abs(risultatoOperativo)

    soci?.forEach(s => {

      const quota = (perdita * (Number(s.quota_percentuale) / 100))

      const versato = versamenti
        ?.filter(v => v.socio_id === s.id)
        .reduce((a, v) => a + Number(v.importo), 0) || 0

      const differenza = quota - versato

      draw(
        `${s.nome} | ${s.quota_percentuale}% | ${quota.toFixed(2)} € | ${versato.toFixed(2)} € | ${differenza.toFixed(2)} €`
      )
    })
  }

  y -= 8
  drawLine()

  /* =========================
     AFFITTO
  ========================= */

  if (affittoMese) {

    draw("AFFITTO (GESTIONE SEPARATA)", 12)
    draw(`Costo Mensile: ${Number(affittoMese.costo_mensile).toFixed(2)} €`)

    soci?.forEach(s => {

      const quota = Number(affittoMese.costo_mensile) *
        (Number(s.quota_percentuale) / 100)

      const versato = affittoPagamenti
        ?.filter(p => p.socio_id === s.id)
        .reduce((a, p) => a + Number(p.importo), 0) || 0

      draw(
        `${s.nome} | ${quota.toFixed(2)} € | Versato: ${versato.toFixed(2)} €`
      )
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
