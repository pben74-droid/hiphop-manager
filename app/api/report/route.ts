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

  const spese = movimenti?.filter(
    m => m.tipo === "spesa"
  ) || []

  const insegnanti = movimenti?.filter(
    m => m.categoria === "insegnante"
  ) || []

  const totaleIncassi = incassi.reduce((a, m) => a + Number(m.importo), 0)
  const totaleSpese = spese.reduce((a, m) => a + Math.abs(Number(m.importo)), 0)

  const risultatoOperativo = totaleIncassi - totaleSpese
  const perdita = risultatoOperativo < 0 ? Math.abs(risultatoOperativo) : 0
  const totaleVersamenti =
    versamenti?.reduce((a, v) => a + Number(v.importo), 0) || 0

  const differenzaFinale = totaleVersamenti - perdita

  /* =========================
     CREAZIONE PDF
  ========================= */

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let page = pdfDoc.addPage([595, 842])
  let y = 800

  const margin = 50
  const pageWidth = 595

  const checkPageBreak = () => {
    if (y < 80) {
      page = pdfDoc.addPage([595, 842])
      y = 800
    }
  }

  const newLine = (space = 16) => {
    y -= space
    checkPageBreak()
  }

  const drawText = (
    text: string,
    x: number,
    size = 10,
    bold = false,
    color = rgb(0, 0, 0)
  ) => {
    page.drawText(text, {
      x,
      y,
      size,
      font: bold ? boldFont : font,
      color
    })
  }

  const drawRightText = (text: string, size = 10, bold = false) => {
    const textWidth = bold
      ? boldFont.widthOfTextAtSize(text, size)
      : font.widthOfTextAtSize(text, size)

    page.drawText(text, {
      x: pageWidth - margin - textWidth,
      y,
      size,
      font: bold ? boldFont : font
    })
  }

  const drawDivider = () => {
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85)
    })
    newLine(12)
  }

  /* =========================
     HEADER CON LOGO
  ========================= */

  const logoUrl = new URL("/LOGO_DEFINITIVO_TRASPARENTE.png", request.url)
  const logoBytes = await fetch(logoUrl).then(res => res.arrayBuffer())
  const logoImage = await pdfDoc.embedPng(logoBytes)

  page.drawImage(logoImage, {
    x: pageWidth - 150,
    y: 740,
    width: 100,
    height: 100
  })

  drawText("HIP HOP FAMILY MANAGER", margin, 20, true)
  newLine(24)
  drawText(`Report Mensile – ${mese}`, margin, 13, true)
  newLine(18)
  drawText(`Data generazione: ${new Date().toLocaleDateString()}`, margin, 10)

  newLine(25)
  drawDivider()

  /* =========================
     RIEPILOGO GENERALE
  ========================= */

  drawText("RIEPILOGO GENERALE", margin, 14, true)
  newLine(20)

  drawText("Totale Incassi", margin)
  drawRightText(`${totaleIncassi.toFixed(2)} €`, 11, true)
  newLine(16)

  drawText("Totale Spese", margin)
  drawRightText(`${totaleSpese.toFixed(2)} €`, 11, true)
  newLine(16)

  drawText("Totale costi da ripartire", margin, 11, true)
  drawRightText(`${perdita.toFixed(2)} €`, 11, true)
  newLine(16)

  drawText("Versamenti Soci", margin)
  drawRightText(`${totaleVersamenti.toFixed(2)} €`, 11, true)
  newLine(16)

  drawText("Differenza Finale", margin, 12, true)

  const diffColor =
    differenzaFinale >= 0 ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0)

  const diffText = `${differenzaFinale.toFixed(2)} €`
  const diffWidth = boldFont.widthOfTextAtSize(diffText, 12)

  page.drawText(diffText, {
    x: pageWidth - margin - diffWidth,
    y,
    size: 12,
    font: boldFont,
    color: diffColor
  })

  newLine(25)
  drawDivider()

  /* =========================
     INCASSI (senza data)
  ========================= */

  drawText("INCASSI", margin, 14, true)
  newLine(20)

  incassi.forEach(i => {
    drawText(i.descrizione, margin)
    drawRightText(`${Number(i.importo).toFixed(2)} €`)
    newLine(14)
  })

  newLine(10)
  drawDivider()

  /* =========================
     SPESE
  ========================= */

  drawText("SPESE", margin, 14, true)
  newLine(20)

  spese.forEach(s => {
    drawText(s.descrizione, margin)
    drawRightText(`${Math.abs(Number(s.importo)).toFixed(2)} €`)
    newLine(14)
  })

  newLine(10)
  drawDivider()

  /* =========================
     COMPENSI INSEGNANTI
  ========================= */

  drawText("COMPENSI INSEGNANTI", margin, 14, true)
  newLine(20)

  insegnanti.forEach(ins => {
    drawText(ins.descrizione, margin)
    drawRightText(`${Math.abs(Number(ins.importo)).toFixed(2)} €`)
    newLine(14)
  })

  /* =========================
     AFFITTO
  ========================= */

  if (affittoMese) {

    newLine(20)
    drawDivider()

    drawText("AFFITTO (GESTIONE SEPARATA)", margin, 14, true)
    newLine(18)

    drawText("Costo Mensile", margin)
    drawRightText(`${Number(affittoMese.costo_mensile).toFixed(2)} €`, 11, true)
    newLine(18)

    soci?.forEach(s => {

      const quota = Number(affittoMese.costo_mensile) *
        (Number(s.quota_percentuale) / 100)

      const versato = affittoPagamenti
        ?.filter(p => p.socio_id === s.id)
        .reduce((a, p) => a + Number(p.importo), 0) || 0

      drawText(`${s.nome} – Quota`, margin)
      drawRightText(`${quota.toFixed(2)} €`)
      newLine(14)

      drawText(`${s.nome} – Versato`, margin)
      drawRightText(`${versato.toFixed(2)} €`)
      newLine(16)
    })
  }

  /* =========================
     NUMERAZIONE PAGINE
  ========================= */

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
