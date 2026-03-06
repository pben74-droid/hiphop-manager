"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function LoginPage() {

  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("")

  const handleLogin = async () => {

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if(error){
      alert("Errore login: " + error.message)
      return
    }

    window.location.href = "/"

  }

  return (

    <div style={{
      height:"100vh",
      display:"flex",
      justifyContent:"center",
      alignItems:"center",
      background:"#0a0a0a",
      color:"#FFD700"
    }}>

      <div style={{
        display:"flex",
        flexDirection:"column",
        gap:10,
        width:250
      }}>

        <h2>Login Gestionale</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e=>setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e=>setPassword(e.target.value)}
        />

        <button onClick={handleLogin}>
          Accedi
        </button>

      </div>

    </div>

  )
}
