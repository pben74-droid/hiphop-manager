"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function AuthGuard({ children }: any) {

  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    const checkUser = async () => {

      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        router.push("/login")
      } else {
        setLoading(false)
      }

    }

    checkUser()

  }, [])

  if (loading) {
    return <div className="p-6">Verifica accesso...</div>
  }

  return children
}
