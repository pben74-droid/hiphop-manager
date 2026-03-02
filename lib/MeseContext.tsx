"use client"

import { createContext, useContext, useState, useEffect, useRef } from "react"
import { supabase } from "./supabaseClient"
import { inizializzaMese } from "./gestioneMese"

interface MeseContextType {
  mese: string
  setMese: (mese: string) => void
}

const MeseContext = createContext<MeseContextType | undefined>(undefined)

export function MeseProvider({ children }: { children: React.ReactNode }) {

  const [mese, setMeseState] = useState<string>("")
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      caricaMeseIniziale()
      initialized.current = true
    }
  }, [])

  const caricaMeseIniziale = async () => {

    const { data } = await supabase
      .from("mesi")
      .select("mese")
      .order("mese", { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      setMeseState(data[0].mese)
    } else {
      const meseCorrente = new Date().toISOString().slice(0, 7)
      await inizializzaMese(meseCorrente)
      setMeseState(meseCorrente)
    }
  }

  const setMese = async (nuovoMese: string) => {
    await inizializzaMese(nuovoMese)
    setMeseState(nuovoMese)
  }

  return (
    <MeseContext.Provider value={{ mese, setMese }}>
      {children}
    </MeseContext.Provider>
  )
}

export function useMese() {
  const context = useContext(MeseContext)
  if (!context) {
    throw new Error("useMese must be used within MeseProvider")
  }
  return context
}
