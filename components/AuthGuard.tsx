"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function AuthGuard({
  children
}: {
  children: React.ReactNode
}) {

  const router = useRouter()
  const [loading,setLoading] = useState(true)

  useEffect(()=>{

    const checkUser = async () => {

      const { data } = await supabase.auth.getUser()

      if(!data.user){
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
