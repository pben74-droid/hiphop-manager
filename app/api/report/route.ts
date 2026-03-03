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

  /* =========================
     FILTRI MOVIMENTI
  ========================= */

  const incassi = movimenti?.filter(
    m => m.tipo === "incasso" && m.categoria !== "trasferimento"
  ) || []

  const spese = movimenti?.filter(
    m => m.tipo === "spesa"
  ) || []

  const totaleIncassi = incassi.reduce((a, m) => a + Number(m.importo), 0)
  const totaleSpese = spese.reduce((a, m) => a + Math.abs(Number(m.importo)), 0)

  const perdita = totaleSpese > totaleIncassi
    ? totaleSpese - totaleIncassi
    : 0

  const residuoDaRipartire = Math.max(
    0,
    perdita - saldoInizialeCassa
  )

  const totaleVersamenti =
    versamenti?.reduce((a, v) => a + Number(v.importo), 0) || 0

  const saldoCassaFinale =
    saldoInizialeCassa +
    (movimenti
      ?.filter(m => m.contenitore === "cassa_operativa")
      .reduce((a, m) => a + Number(m.importo), 0) || 0)

  const saldoBancaFinale =
    saldoInizialeBanca +
    (movimenti
      ?.filter(m => m.contenitore === "banca")
      .reduce((a, m) => a + Number(m.importo), 0) || 0)

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

  const newLine = (space = 16) => { y -= space }

  const getColor = (value: number) =>
    value >= 0 ? rgb(0, 0.6, 0) : rgb(0.8, 0, 0)

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
    value: number,
    size = 10,
    bold = false
  ) => {
    const textWidth = bold
      ? boldFont.widthOfTextAtSize(text, size)
      : font.widthOfTextAtSize(text, size)

    page.drawText(text, {
      x: pageWidth - margin - textWidth,
      y,
      size,
      font: bold ? boldFont : font,
      color: getColor(value)
    })
  }

  /* =========================
     HEADER
  ========================= */

  drawText("HIP HOP FAMILY MANAGER", margin, 20, true)
  newLine(24)
  drawText(`Report Mensile – ${mese}`, margin, 13, true)
  newLine(30)

  /* =========================
     RIEPILOGO
  ========================= */

  drawText("RIEPILOGO CONTABILE", margin, 14, true)
  newLine(20)

  drawText("Totale Incassi", margin)
  drawRightText(`${totaleIncassi.toFixed(2)} €`, totaleIncassi, 11, true)
  newLine(14)

  drawText("Totale Spese", margin)
  drawRightText(`${-totaleSpese.toFixed(2)} €`, -totaleSpese, 11, true)
  newLine(20)

  drawText("Totale costi da ripartire", margin, 12, true)
  drawRightText(`${-perdita.toFixed(2)} €`, -perdita, 12, true)
  newLine(14)

  drawText("Cassa mese precedente", margin)
  drawRightText(`${saldoInizialeCassa.toFixed(2)} €`, saldoInizialeCassa, 11, true)
  newLine(14)

  drawText("Residuo da ripartire", margin, 12, true)
  drawRightText(`${-residuoDaRipartire.toFixed(2)} €`, -residuoDaRipartire, 12, true)
  newLine(20)

  drawText("Saldo Cassa Finale", margin)
  drawRightText(`${saldoCassaFinale.toFixed(2)} €`, saldoCassaFinale, 11, true)
  newLine(14)

  drawText("Saldo Banca Finale", margin)
  drawRightText(`${saldoBancaFinale.toFixed(2)} €`, saldoBancaFinale, 11, true)
  newLine(30)

  /* =========================
     RIPARTIZIONE SOCI - TABELLA
  ========================= */

  drawText("RIPARTIZIONE SOCI", margin, 14, true)
  newLine(20)

  const colSocio = margin
  const colCosti = margin + 150
  const colIncassi = margin + 250
  const colRisultato = margin + 360
  const colVersato = margin + 470

  drawText("Socio", colSocio, 10, true)
  drawText("Quota Costi", colCosti, 10, true)
  drawText("Quota Incassi", colIncassi, 10, true)
  drawText("Risultato", colRisultato, 10, true)
  drawText("Versato", colVersato, 10, true)

  newLine(14)

  soci?.forEach(s => {

    const percentuale = Number(s.quota_percentuale) / 100

    const quotaCosti = totaleSpese * percentuale
    const quotaIncassi = totaleIncassi * percentuale
    const risultatoSocio = quotaIncassi - quotaCosti

    const versato = versamenti
      ?.filter(v => v.socio_id === s.id)
      .reduce((a, v) => a + Number(v.importo), 0) || 0

    drawText(s.nome, colSocio)

    page.drawText(`${quotaCosti.toFixed(2)} €`, {
      x: colCosti,
      y,
      size: 9,
      font,
      color: getColor(-quotaCosti)
    })

    page.drawText(`${quotaIncassi.toFixed(2)} €`, {
      x: colIncassi,
      y,
      size: 9,
      font,
      color: getColor(quotaIncassi)
    })

    page.drawText(`${risultatoSocio.toFixed(2)} €`, {
      x: colRisultato,
      y,
      size: 9,
      font,
      color: getColor(risultatoSocio)
    })

    page.drawText(`${versato.toFixed(2)} €`, {
      x: colVersato,
      y,
      size: 9,
      font,
      color: getColor(versato)
    })

    newLine(14)
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
