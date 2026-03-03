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

  const speseInsegnanti = movimenti?.filter(
    m => m.categoria === "insegnante"
  ) || []

  const speseVarie = movimenti?.filter(
    m => m.categoria === "spesa_generica"
  ) || []

  const speseTotali = movimenti?.filter(
    m => m.tipo === "spesa"
  ) || []

  const totaleIncassi = incassi.reduce((a, m) => a + Number(m.importo), 0)
  const totaleSpese = speseTotali.reduce((a, m) => a + Math.abs(Number(m.importo)), 0)

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

  /* =========================
     HEADER
  ========================= */

  drawText("HIP HOP FAMILY MANAGER", margin, 20, true)
  newLine(24)
  drawText(`Report Mensile – ${mese}`, margin, 13, true)
  newLine(30)

  /* =========================
     RIEPILOGO CONTABILE
  ========================= */

  drawText("RIEPILOGO CONTABILE", margin, 14, true)
  newLine(20)

  drawText("Totale Incassi", margin)
  drawRightText(`${totaleIncassi.toFixed(2)} €`, 11, true)
  newLine(14)

  drawText("Totale Spese", margin)
  drawRightText(`${totaleSpese.toFixed(2)} €`, 11, true)
  newLine(20)

  drawText("Totale costi da ripartire", margin, 12, true, rgb(0.8, 0, 0))
  drawRightText(`${perdita.toFixed(2)} €`, 12, true, rgb(0.8, 0, 0))
  newLine(14)

  drawText("Cassa mese precedente", margin, 11, true, rgb(0, 0.6, 0))
  drawRightText(`${saldoInizialeCassa.toFixed(2)} €`, 11, true, rgb(0, 0.6, 0))
  newLine(14)

  drawText("Residuo da ripartire", margin, 12, true,
    residuoDaRipartire > 0 ? rgb(0.8, 0, 0) : rgb(0, 0.6, 0)
  )
  drawRightText(`${residuoDaRipartire.toFixed(2)} €`, 12, true)
  newLine(20)

  drawText("Saldo Cassa Finale", margin)
  drawRightText(`${saldoCassaFinale.toFixed(2)} €`, 11, true)
  newLine(14)

  drawText("Saldo Banca Finale", margin)
  drawRightText(`${saldoBancaFinale.toFixed(2)} €`, 11, true)
  newLine(30)

  /* =========================
     INCASSI DETTAGLIO
  ========================= */

  drawText("DETTAGLIO INCASSI", margin, 14, true)
  newLine(20)

  incassi.forEach(i => {
    drawText(i.descrizione, margin)
    drawRightText(`${Number(i.importo).toFixed(2)} €`)
    newLine(14)
  })

  newLine(20)

  /* =========================
     SPESE INSEGNANTI
  ========================= */

  drawText("COMPENSI INSEGNANTI", margin, 14, true)
  newLine(20)

  speseInsegnanti.forEach(s => {
    drawText(s.descrizione, margin)
    drawRightText(`${Math.abs(Number(s.importo)).toFixed(2)} €`)
    newLine(14)
  })

  newLine(20)

  /* =========================
     SPESE VARIE
  ========================= */

  drawText("SPESE VARIE", margin, 14, true)
  newLine(20)

  speseVarie.forEach(s => {
    drawText(s.descrizione, margin)
    drawRightText(`${Math.abs(Number(s.importo)).toFixed(2)} €`)
    newLine(14)
  })

  newLine(30)

  /* =========================
     RIPARTIZIONE ANALITICA SOCI
  ========================= */

  drawText("RIPARTIZIONE ANALITICA TRA SOCI", margin, 14, true)
  newLine(20)

  soci?.forEach(s => {

    const percentuale = Number(s.quota_percentuale) / 100

    const quotaCosti = totaleSpese * percentuale
    const quotaIncassi = totaleIncassi * percentuale
    const risultatoSocio = quotaIncassi - quotaCosti

    const versato = versamenti
      ?.filter(v => v.socio_id === s.id)
      .reduce((a, v) => a + Number(v.importo), 0) || 0

    drawText(s.nome, margin, 11, true)
    newLine(14)

    drawText(`Quota costi: ${quotaCosti.toFixed(2)} €`, margin + 20)
    newLine(12)

    drawText(`Quota incassi: ${quotaIncassi.toFixed(2)} €`, margin + 20)
    newLine(12)

    drawText(
      `Risultato: ${risultatoSocio.toFixed(2)} €`,
      margin + 20,
      10,
      false,
      risultatoSocio >= 0 ? rgb(0, 0.6, 0) : rgb(0.8, 0, 0)
    )
    newLine(12)

    drawText(`Versato: ${versato.toFixed(2)} €`, margin + 20)
    newLine(20)
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
