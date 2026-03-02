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

  /* =======================
     RECUPERO DATI
  ======================= */

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

  /* =======================
     CREAZIONE PDF
  ======================= */

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let page = pdfDoc.addPage([595, 842])
  let y = 800

  const marginLeft = 50
  const pageWidth = 595
  const pageHeight = 842

  const checkPageBreak = () => {
    if (y < 80) {
      page = pdfDoc.addPage([595, 842])
      y = 800
    }
  }

  const drawText = (text: string, x: number, size = 10, bold = false, color = rgb(0,0,0)) => {
    page.drawText(text, {
      x,
      y,
      size,
      font: bold ? boldFont : font,
      color
    })
  }

  const newLine = (space = 16) => {
    y -= space
    checkPageBreak()
  }

  const drawLine = () => {
    page.drawLine({
      start: { x: marginLeft, y },
      end: { x: pageWidth - marginLeft, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8)
    })
    newLine(12)
  }

  const drawSectionTitle = (title: string) => {
    newLine(10)
    drawText(title, marginLeft, 13, true)
    newLine(18)
  }

  const drawTableHeader = (cols: string[]) => {
    let x = marginLeft
    cols.forEach(col => {
      drawText(col, x, 10, true)
      x += 120
    })
    newLine(14)
    drawLine()
  }

  const drawRow = (cols: string[]) => {
    let x = marginLeft
    cols.forEach(col => {
      drawText(col, x, 9)
      x += 120
    })
    newLine(14)
  }

  /* =======================
     HEADER
  ======================= */

  drawText("HIP HOP FAMILY MANAGER", marginLeft, 18, true)
  newLine(22)
  drawText(`Report Mensile: ${mese}`, marginLeft, 12)
  newLine(16)
  drawText(`Data generazione: ${new Date().toLocaleDateString()}`, marginLeft, 10)
  newLine(20)
  drawLine()

  /* =======================
     INCASSI
  ======================= */

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

  /* =======================
     SPESE VARIE
  ======================= */

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

  /* =======================
     INSEGNANTI
  ======================= */

  drawSectionTitle("COMPENSI INSEGNANTI")
  drawTableHeader(["Data", "Insegnante", "Importo"])

  insegnanti.forEach(ins => {
    drawRow([
      ins.data,
      ins.descrizione,
      `${Math.abs(Number(ins.importo)).toFixed(2)} €`
    ])
  })

  /* =======================
     RIEPILOGO
  ======================= */

  drawSectionTitle("RIEPILOGO OPERATIVO")

  drawRow(["Totale Incassi", "", "", `${totaleIncassi.toFixed(2)} €`])

  const risultatoColor =
    risultatoOperativo >= 0 ? rgb(0,0,0) : rgb(0.8,0,0)

  drawText(
    `Risultato Operativo: ${risultatoOperativo.toFixed(2)} €`,
    marginLeft,
    11,
    true,
    risultatoColor
  )

  newLine(20)
  drawLine()

  /* =======================
     RIPARTIZIONE SOCI
  ======================= */

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

  /* =======================
     AFFITTO
  ======================= */

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

  /* =======================
     NUMERAZIONE PAGINE
  ======================= */

  const pages = pdfDoc.getPages()
  pages.forEach((p, index) => {
    p.drawText(
      `Pagina ${index + 1} / ${pages.length}`,
      { x: 480, y: 20, size: 9, font }
    )
  })

  const pdfBytes = await pdfDoc.save()
  const buffer = Buffer.from(pdfBytes)

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=report_${mese}.pdf`
    }
  })
}
