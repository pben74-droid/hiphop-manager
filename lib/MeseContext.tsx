"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { inizializzaMese } from "./gestioneMese"

interface MeseContextType {
  mese: string
  setMese: (mese: string) => void
}

const MeseContext = createContext<MeseContextType | undefined>(undefined)

export function MeseProvider({ children }: { children: React.ReactNode }) {

  const meseCorrente = new Date().toISOString().slice(0, 7)

  const [mese, setMeseState] = useState<string>(meseCorrente)

  useEffect(() => {
    inizializzaMese(mese)
  }, [mese])

  const setMese = (nuovoMese: string) => {
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
