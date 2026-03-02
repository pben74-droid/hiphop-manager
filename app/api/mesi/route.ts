import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseClient"

export async function GET() {
  const { data } = await supabase
    .from("mesi")
    .select("mese")
    .order("mese", { ascending: false })

  return NextResponse.json(data || [])
}
