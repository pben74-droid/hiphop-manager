"use client"

import { createContext, useContext, useState, ReactNode } from "react"

type MeseContextType = {
  mese: string
  setMese: (mese: string) => void
}

const MeseContext = createContext<MeseContextType | undefined>(undefined)

export function MeseProvider({ children }: { children: ReactNode }) {

  const meseCorrente = new Date().toISOString().slice(0, 7)

  const [mese, setMese] = useState<string>(meseCorrente)

  return (
    <MeseContext.Provider value={{ mese, setMese }}>
      {children}
    </MeseContext.Provider>
  )
}

export function useMese() {
  const context = useContext(MeseContext)
  if (!context) {
    throw new Error("useMese deve essere usato dentro MeseProvider")
  }
  return context
}
