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

  const risultatoOperativo = movimenti
    ?.filter(m => m.categoria !== "trasferimento")
    .reduce((a, m) => a + Number(m.importo), 0) || 0

  const totaleIncassi = incassi.reduce((a, m) => a + Number(m.importo), 0)

  /* =========================
     PDF
  ========================= */

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  let y = 800

  const drawText = (text: string, x: number, size = 10) => {
    page.drawText(text, { x, y, size, font })
  }

  const newLine = (space = 18) => {
    y -= space
  }

  const drawTableHeader = (columns: string[]) => {
    let x = 50
    columns.forEach(col => {
      drawText(col, x, 10)
      x += 120
    })
    newLine(15)
  }

  const drawRow = (columns: string[]) => {
    let x = 50
    columns.forEach(col => {
      drawText(col, x, 9)
      x += 120
    })
    newLine(14)
  }

  const drawSectionTitle = (title: string) => {
    newLine(10)
    drawText(title, 50, 12)
    newLine(18)
  }

  /* =========================
     HEADER
  ========================= */

  drawText("HIP HOP FAMILY MANAGER", 50, 16)
  newLine(22)
  drawText(`Report Mensile: ${mese}`, 50, 12)
  newLine(16)
  drawText(`Generato il: ${new Date().toLocaleDateString()}`, 50, 10)
  newLine(25)

  /* =========================
     INCASSI
  ========================= */

  drawSectionTitle("INCASSI")
  drawTableHeader(["Data", "Descrizione", "Contenitore", "Importo"])

  incassi.forEach(i => {
    drawRow([
      i.data,
      i.descrizione,
      i.contenitore,
      `${Number(i.importo).toFixed(2)} €`
    ])
  })

  /* =========================
     SPESE VARIE
  ========================= */

  drawSectionTitle("SPESE VARIE")
  drawTableHeader(["Data", "Descrizione", "Contenitore", "Importo"])

  speseVarie.forEach(s => {
    drawRow([
      s.data,
      s.descrizione,
      s.contenitore,
      `${Math.abs(Number(s.importo)).toFixed(2)} €`
    ])
  })

  /* =========================
     INSEGNANTI
  ========================= */

  drawSectionTitle("COMPENSI INSEGNANTI")
  drawTableHeader(["Data", "Insegnante", "Importo"])

  insegnanti.forEach(ins => {
    drawRow([
      ins.data,
      ins.descrizione,
      `${Math.abs(Number(ins.importo)).toFixed(2)} €`
    ])
  })

  /* =========================
     RIEPILOGO OPERATIVO
  ========================= */

  drawSectionTitle("RIEPILOGO OPERATIVO")

  drawRow(["Totale Incassi", "", "", `${totaleIncassi.toFixed(2)} €`])
  drawRow(["Risultato Operativo", "", "", `${risultatoOperativo.toFixed(2)} €`])

  /* =========================
     RIPARTIZIONE SOCI
  ========================= */

  if (risultatoOperativo < 0) {

    drawSectionTitle("RIPARTIZIONE SPESE TRA SOCI")
    drawTableHeader(["Socio", "Quota", "Versato", "Differenza"])

    const perdita = Math.abs(risultatoOperativo)

    soci?.forEach(s => {

      const quota = perdita * (Number(s.quota_percentuale) / 100)

      const versato = versamenti
        ?.filter(v => v.socio_id === s.id)
        .reduce((a, v) => a + Number(v.importo), 0) || 0

      const differenza = quota - versato

      drawRow([
        s.nome,
        `${quota.toFixed(2)} €`,
        `${versato.toFixed(2)} €`,
        `${differenza.toFixed(2)} €`
      ])
    })
  }

  /* =========================
     AFFITTO
  ========================= */

  if (affittoMese) {

    drawSectionTitle("AFFITTO (GESTIONE SEPARATA)")
    drawRow(["Costo Mensile", "", "", `${Number(affittoMese.costo_mensile).toFixed(2)} €`])
    newLine(10)

    drawTableHeader(["Socio", "Quota", "Versato"])

    soci?.forEach(s => {

      const quota = Number(affittoMese.costo_mensile) *
        (Number(s.quota_percentuale) / 100)

      const versato = affittoPagamenti
        ?.filter(p => p.socio_id === s.id)
        .reduce((a, p) => a + Number(p.importo), 0) || 0

      drawRow([
        s.nome,
        `${quota.toFixed(2)} €`,
        `${versato.toFixed(2)} €`
      ])
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
