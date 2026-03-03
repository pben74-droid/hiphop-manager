import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {

  try {

    const body = await req.json()
    const { mese, password } = body

    if (!password || password.trim() !== "Nmdcdnv74!") {
      return NextResponse.json(
        { error: "Password errata" },
        { status: 401 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabaseAdmin
      .from("mesi")
      .update({ stato: "aperto" })
      .eq("mese", mese)
      .select()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Mese non trovato" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}
