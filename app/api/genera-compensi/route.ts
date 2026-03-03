import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {

  const { mese, compensi } = await req.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  for (const c of compensi) {

    const { data: esiste } = await supabase
      .from("movimenti_finanziari")
      .select("id")
      .eq("mese", mese)
      .eq("categoria", "insegnante")
      .eq("descrizione", c.nome)
      .maybeSingle()

    if (esiste) {
      return NextResponse.json(
        { error: `Compenso già generato per ${c.nome}` },
        { status: 400 }
      )
    }

    await supabase.from("movimenti_finanziari").insert({
      mese,
      tipo: "spesa",
      categoria: "insegnante",
      descrizione: c.nome,
      contenitore: "cassa_operativa",
      importo: -Number(c.importo),
      data: new Date().toISOString().slice(0, 10)
    })
  }

  return NextResponse.json({ success: true })
}
