"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function AuthGuard({
  children
}: {
  children: React.ReactNode
}) {

  const router = useRouter()
  const pathname = usePathname()
  const [loading,setLoading] = useState(true)

  useEffect(()=>{

    const checkSession = async () => {

      const { data } = await supabase.auth.getSession()

      const session = data.session

      if(!session && pathname !== "/login"){
        router.push("/login")
        return
      }

      if(session && pathname === "/login"){
        router.push("/")
        return
      }

      setLoading(false)

    }

    checkSession()

  },[pathname,router])

  if(loading){
    return null
  }

  return <>{children}</>
}
