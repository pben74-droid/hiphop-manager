import { NextResponse } from "next/server"
import { chiudiMeseServer } from "@/lib/gestioneMese"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { mese, password } = body

    if (password !== "Nmdcdnv74!") {
      return NextResponse.json(
        { error: "Password errata" },
        { status: 401 }
      )
    }

    const result = await chiudiMeseServer(mese)

    return NextResponse.json(result)

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
}
