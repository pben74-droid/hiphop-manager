import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {

  const { searchParams } = new URL(req.url)
  const mese = searchParams.get("mese")

  if (!mese) {
    return NextResponse.json({ error: "Mese mancante" }, { status: 400 })
  }

  // =============================
  // DATI OPERATIVI
  // =============================

  const { data: movimenti } = await supabase
    .from("movimenti_finanziari")
    .select("*")
    .eq("mese", mese)

  const { data: versamenti } = await supabase
    .from("versamenti_soci")
    .select("*")
    .eq("mese", mese)

  const risultato = movimenti?.reduce(
    (acc, m) => acc + Number(m.importo),
    0
  ) || 0

  const totaleVersamenti = versamenti?.reduce(
    (acc, v) => acc + Number(v.importo),
    0
  ) || 0

  if (Number((risultato + totaleVersamenti).toFixed(2)) !== 0) {
    return NextResponse.json(
      { error: "Differenza operativa diversa da 0. Report bloccato." },
      { status: 400 }
    )
  }

  // =============================
  // DATI AFFITTO
  // =============================

  const { data: affittoMese } = await supabase
    .from("affitto_mese")
    .select("*")
    .eq("mese", mese)
    .maybeSingle()

  const { data: soci } = await supabase.from("soci").select("*")

  const { data: pagamentiAffitto } = await supabase
    .from("affitto_pagamenti")
    .select("*")
    .eq("mese", mese)

  const { data: crediti } = await supabase
    .from("affitto_crediti")
    .select("*")
    .eq("mese_origine", mese)

  // =============================
  // CREAZIONE PDF
  // =============================

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  let y = 800

  const drawText = (text: string) => {
    page.drawText(text, {
      x: 50,
      y,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    })
    y -= 18
  }

  drawText("HIP HOP FAMILY MANAGER")
  drawText(`Report Mensile - ${mese}`)
  y -= 10

  drawText("=== SEZIONE OPERATIVO ===")
  drawText(`Risultato operativo: ${risultato} €`)
  drawText(`Totale versamenti soci: ${totaleVersamenti} €`)
  drawText(`Differenza finale: ${risultato + totaleVersamenti} €`)
  y -= 20

  if (affittoMese) {
    drawText("=== SEZIONE AFFITTO ===")
    drawText(`Costo mensile: ${affittoMese.costo_mensile} €`)
    y -= 10

    soci?.forEach((s) => {
      const quota = Number(
        (affittoMese.costo_mensile * (s.quota_percentuale / 100)).toFixed(2)
      )

      const versato =
        pagamentiAffitto
          ?.filter((p) => p.socio_id === s.id)
          .reduce((acc, p) => acc + Number(p.importo), 0) || 0

      const credito =
        crediti
          ?.filter((c) => c.socio_id === s.id)
          .reduce((acc, c) => acc + Number(c.importo), 0) || 0

      drawText(`${s.nome}`)
      drawText(`Quota: ${quota} €`)
      drawText(`Pagato: ${versato} €`)
      drawText(`Credito trasferito: ${credito} €`)
      y -= 10
    })
  }

  const pdfBytes = await pdfDoc.save()

  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=report_${mese}.pdf`,
    },
  })
}
