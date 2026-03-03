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

  const insegnantiRaw = movimenti?.filter(
    m => m.categoria === "insegnante"
  ) || []

  const speseVarie = movimenti?.filter(
    m => m.categoria === "spesa_generica"
  ) || []

  const totaleIncassi = incassi.reduce((a, m) => a + Number(m.importo), 0)
  const totaleSpese = spese.reduce((a, m) => a + Math.abs(Number(m.importo)), 0)

  const perdita = totaleSpese > totaleIncassi
    ? totaleSpese - totaleIncassi
    : 0

  const residuoDaRipartire = Math.max(0, perdita - saldoInizialeCassa)

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
     INSEGNANTI AGGREGATI
  ========================= */

  const insegnantiAggregati: Record<string, number> = {}

  insegnantiRaw.forEach(m => {
    let nome = (m.descrizione || "ALTRO").toUpperCase()
    if (nome.includes("SNOOP")) nome = "SNOOP"

    if (!insegnantiAggregati[nome]) {
      insegnantiAggregati[nome] = 0
    }

    insegnantiAggregati[nome] += Math.abs(Number(m.importo))
  })

  const nomiInsegnanti = Object.keys(insegnantiAggregati)

  /* =========================
     PDF SETUP
  ========================= */

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let page = pdfDoc.addPage([595, 842])
  let y = 800
  const margin = 50
  const pageWidth = 595

  const getColor = (v: number) =>
    v >= 0 ? rgb(0, 0.6, 0) : rgb(0.8, 0, 0)

  const newLine = (space = 16) => { y -= space }

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

  const drawRightValue = (value: number, bold = false) => {
    const text = `${value.toFixed(2)} €`
    const width = bold
      ? boldFont.widthOfTextAtSize(text, 10)
      : font.widthOfTextAtSize(text, 10)

    page.drawText(text, {
      x: pageWidth - margin - width,
      y,
      size: 10,
      font: bold ? boldFont : font,
      color: getColor(value)
    })
  }

  /* =========================
     PAGINA 1 - RIEPILOGO
  ========================= */

  drawText("HIP HOP FAMILY MANAGER", margin, 18, true)
  newLine(20)
  drawText(`Report Mensile – ${mese}`, margin, 12, true)
  newLine(30)

  drawText("RIEPILOGO CONTABILE", margin, 14, true)
  newLine(20)

  drawText("Totale Incassi", margin)
  drawRightValue(totaleIncassi, true)
  newLine(14)

  drawText("Totale Spese", margin)
  drawRightValue(-totaleSpese, true)
  newLine(14)

  drawText("Totale costi da ripartire", margin)
  drawRightValue(-perdita, true)
  newLine(14)

  drawText("Cassa mese precedente", margin)
  drawRightValue(saldoInizialeCassa, true)
  newLine(14)

  drawText("Residuo da ripartire", margin)
  drawRightValue(-residuoDaRipartire, true)
  newLine(14)

  drawText("Saldo Cassa Finale", margin)
  drawRightValue(saldoCassaFinale, true)
  newLine(14)

  drawText("Saldo Banca Finale", margin)
  drawRightValue(saldoBancaFinale, true)
  newLine(30)

  /* =========================
     DETTAGLIO INCASSI
  ========================= */

  drawText("DETTAGLIO INCASSI", margin, 12, true)
  newLine(18)

  incassi.forEach(i => {
    drawText(i.descrizione, margin)
    drawRightValue(Number(i.importo))
    newLine(12)
  })

  newLine(20)

  drawText("COMPENSI INSEGNANTI", margin, 12, true)
  newLine(18)

  nomiInsegnanti.forEach(nome => {
    drawText(nome, margin)
    drawRightValue(-insegnantiAggregati[nome])
    newLine(12)
  })

  newLine(20)

  drawText("SPESE VARIE", margin, 12, true)
  newLine(18)

  speseVarie.forEach(s => {
    drawText(s.descrizione, margin)
    drawRightValue(-Math.abs(Number(s.importo)))
    newLine(12)
  })

  /* =========================
     PAGINA 2 - CONTEGGI SOCI
  ========================= */

  page = pdfDoc.addPage([595, 842])
  y = 800

  drawText("CONTEGGI SOCI", margin, 14, true)
  newLine(20)

  const colWidth = 80
  const colStart = margin

  drawText("SOCIO", colStart, 9, true)

  nomiInsegnanti.forEach((nome, i) => {
    drawText(nome, colStart + colWidth * (i + 1), 9, true)
  })

  const quotaCol = colStart + colWidth * (nomiInsegnanti.length + 1)
  const totaleCol = colStart + colWidth * (nomiInsegnanti.length + 2)

  drawText("QUOTA DISP.", quotaCol, 9, true)
  drawText("TOTALE MENSILE", totaleCol, 9, true)

  newLine(14)

  soci?.forEach(s => {

    const perc = Number(s.quota_percentuale) / 100
    const quotaDisponibile =
      (saldoInizialeCassa + totaleIncassi) * perc

    let totaleCosti = 0

    drawText(s.nome, colStart)

    nomiInsegnanti.forEach((nome, i) => {
      const quota = insegnantiAggregati[nome] * perc
      totaleCosti += quota

      page.drawText(`${(-quota).toFixed(2)} €`, {
        x: colStart + colWidth * (i + 1),
        y,
        size: 9,
        font,
        color: getColor(-quota)
      })
    })

    page.drawText(`${quotaDisponibile.toFixed(2)} €`, {
      x: quotaCol,
      y,
      size: 9,
      font,
      color: getColor(quotaDisponibile)
    })

    const totaleMensile = quotaDisponibile - totaleCosti

    page.drawText(`${totaleMensile.toFixed(2)} €`, {
      x: totaleCol,
      y,
      size: 9,
      font,
      color: getColor(totaleMensile)
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
