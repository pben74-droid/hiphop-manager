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

  const { data: meseData } = await supabase
    .from("mesi")
    .select("saldo_iniziale_cassa, saldo_iniziale_banca")
    .eq("mese", mese)
    .maybeSingle()

  const saldoInizialeCassa = Number(meseData?.saldo_iniziale_cassa) || 0
  const saldoInizialeBanca = Number(meseData?.saldo_iniziale_banca) || 0

  const incassi = movimenti?.filter(
    m => m.tipo === "incasso" && m.categoria !== "trasferimento"
  ) || []

  const spese = movimenti?.filter(
    m => m.tipo === "spesa"
  ) || []

  const totaleIncassi = incassi.reduce((a, m) => a + Number(m.importo), 0)
  const totaleSpese = spese.reduce((a, m) => a + Math.abs(Number(m.importo)), 0)

  const risultatoOperativo = saldoInizialeCassa + totaleIncassi - totaleSpese

  const totaleCostiDaRipartire =
    totaleSpese > totaleIncassi ? totaleSpese - totaleIncassi : 0

  const residuoDaRipartire = Math.max(
    0,
    totaleCostiDaRipartire - saldoInizialeCassa
  )

  const totaleVersamenti =
    versamenti?.reduce((a, v) => a + Number(v.importo), 0) || 0

  const differenzaFinale = totaleVersamenti - residuoDaRipartire

  const saldoCassaFinale =
    saldoInizialeCassa +
    movimenti
      ?.filter(m => m.contenitore === "cassa_operativa")
      .reduce((a, m) => a + Number(m.importo), 0) || 0

  const saldoBancaFinale =
    saldoInizialeBanca +
    movimenti
      ?.filter(m => m.contenitore === "banca")
      .reduce((a, m) => a + Number(m.importo), 0) || 0

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

  const drawRightText = (
    text: string,
    size = 10,
    bold = false,
    color = rgb(0, 0, 0)
  ) => {
    const textWidth = bold
      ? boldFont.widthOfTextAtSize(text, size)
      : font.widthOfTextAtSize(text, size)

    page.drawText(text, {
      x: pageWidth - margin - textWidth,
      y,
      size,
      font: bold ? boldFont : font,
      color
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
     HEADER
  ========================= */

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
  newLine(20)

  drawDivider()

  drawText("Saldo Cassa Finale", margin)
  drawRightText(`${saldoCassaFinale.toFixed(2)} €`, 11, true)
  newLine(16)

  drawText("Saldo Banca Finale", margin)
  drawRightText(`${saldoBancaFinale.toFixed(2)} €`, 11, true)
  newLine(20)

  drawDivider()

  /* =========================
     RIPARTIZIONE CONTABILE
  ========================= */

  drawText("RIPARTIZIONE CONTABILE", margin, 14, true)
  newLine(20)

  drawText("Totale costi da ripartire", margin, 12, true, rgb(0.8, 0, 0))
  drawRightText(`${totaleCostiDaRipartire.toFixed(2)} €`, 12, true, rgb(0.8, 0, 0))
  newLine(16)

  drawText("Cassa mese precedente", margin, 11, true, rgb(0, 0.6, 0))
  drawRightText(`${saldoInizialeCassa.toFixed(2)} €`, 11, true, rgb(0, 0.6, 0))
  newLine(16)

  const residuoColor =
    residuoDaRipartire > 0 ? rgb(0.8, 0, 0) : rgb(0, 0.6, 0)

  drawText("Residuo da ripartire", margin, 12, true, residuoColor)
  drawRightText(`${residuoDaRipartire.toFixed(2)} €`, 12, true, residuoColor)
  newLine(25)

  drawDivider()

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
