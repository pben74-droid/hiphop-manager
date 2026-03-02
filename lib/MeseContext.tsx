"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

type MeseContextType = {
  mese: string
  setMese: (mese: string) => void
}

const MeseContext = createContext<MeseContextType | undefined>(undefined)

export function MeseProvider({ children }: { children: ReactNode }) {

  const meseCorrente = new Date().toISOString().slice(0, 7)

  const [mese, setMeseState] = useState<string>(meseCorrente)

  // 🔹 Carica da localStorage al primo render
  useEffect(() => {
    const salvato = localStorage.getItem("mese_selezionato")
    if (salvato) {
      setMeseState(salvato)
    }
  }, [])

  // 🔹 Salva sempre quando cambia
  const setMese = (nuovoMese: string) => {
    setMeseState(nuovoMese)
    localStorage.setItem("mese_selezionato", nuovoMese)
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
    throw new Error("useMese must be used inside MeseProvider")
  }
  return context
}
