"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function useRequireAuth() {

  useEffect(() => {

    const check = async () => {

      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        window.location.href = "/login"
      }

    }

    check()

  }, [])

}
