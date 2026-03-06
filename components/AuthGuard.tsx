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

    const checkUser = async () => {

      const { data } = await supabase.auth.getUser()

      if(!data.user && pathname !== "/login"){
  router.push("/login")
} else {
  setLoading(false)
}

    }

    checkUser()

  },[])

  if(loading){
    return null
  }

  return <>{children}</>
}
