"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode
}) {

  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    const checkSession = async () => {

      const { data } = await supabase.auth.getSession()

      setSession(data.session)
      setLoading(false)

    }

    checkSession()

  }, [])

  if (loading) {
    return <div style={{padding:20}}>Caricamento...</div>
  }

  if (!session) {
    window.location.href = "/login"
    return null
  }

  return <>{children}</>
}
