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
    .select("saldo_iniziale_cassa")
    .eq("mese", mese)
    .maybeSingle()

  const saldoInizialeCassa = Number(meseData?.saldo_iniziale_cassa) || 0

  /* =========================
     INCASSI
  ========================= */

  const incassi = movimenti?.filter(
    m => m.tipo === "incasso" && m.categoria !== "trasferimento"
  ) || []

  const totaleIncassi = incassi.reduce(
    (a, m) => a + Number(m.importo), 0
  )

  /* =========================
     INSEGNANTI DINAMICI
  ========================= */

  const insegnantiRaw = movimenti?.filter(
    m => m.categoria === "insegnante"
  ) || []

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
     CREAZIONE PDF
  ========================= */

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let page = pdfDoc.addPage([595, 842])
  let y = 800

  const margin = 40
  const pageWidth = 595

  const getColor = (value: number) =>
    value >= 0 ? rgb(0, 0.6, 0) : rgb(0.8, 0, 0)

  const newPage = () => {
    page = pdfDoc.addPage([595, 842])
    y = 800
  }

  const checkPage = () => {
    if (y < 80) newPage()
  }

  const newLine = (space = 16) => {
    y -= space
    checkPage()
  }

  const drawText = (
    text: string,
    x: number,
    size = 9,
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

  /* =========================
     HEADER
  ========================= */

  drawText("HIP HOP FAMILY MANAGER", margin, 18, true)
  newLine(20)
  drawText(`Report Mensile – ${mese}`, margin, 12, true)
  newLine(30)

  /* =========================
     TABELLA SOCI
  ========================= */

  drawText("CONTEGGI SOCI", margin, 13, true)
  newLine(20)

  const colStart = margin
  const colWidth = 90

  // Header tabella
  drawText("SOCIO", colStart, 9, true)

  nomiInsegnanti.forEach((nome, index) => {
    drawText(nome, colStart + colWidth * (index + 1), 9, true)
  })

  const quotaDisponibileCol =
    colStart + colWidth * (nomiInsegnanti.length + 1)

  const totaleCol =
    colStart + colWidth * (nomiInsegnanti.length + 2)

  drawText("QUOTA DISP.", quotaDisponibileCol, 9, true)
  drawText("TOTALE MENSILE", totaleCol, 9, true)

  newLine(14)

  soci?.forEach(s => {

    checkPage()

    const percentuale = Number(s.quota_percentuale) / 100

    const quotaDisponibile =
      (saldoInizialeCassa + totaleIncassi) * percentuale

    let totaleCostiInsegnanti = 0

    drawText(s.nome, colStart)

    nomiInsegnanti.forEach((nome, index) => {

      const quota =
        insegnantiAggregati[nome] * percentuale

      totaleCostiInsegnanti += quota

      page.drawText(`${quota.toFixed(2)} €`, {
        x: colStart + colWidth * (index + 1),
        y,
        size: 9,
        font,
        color: getColor(-quota)
      })
    })

    page.drawText(`${quotaDisponibile.toFixed(2)} €`, {
      x: quotaDisponibileCol,
      y,
      size: 9,
      font,
      color: getColor(quotaDisponibile)
    })

    const totaleMensile =
      quotaDisponibile - totaleCostiInsegnanti

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
