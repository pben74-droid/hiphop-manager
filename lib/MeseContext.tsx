"use client"

import { createContext, useContext, useState, ReactNode } from "react"

type MeseContextType = {
  mese: string
  setMese: (mese: string) => void
}

const MeseContext = createContext<MeseContextType | undefined>(undefined)

export function MeseProvider({ children }: { children: ReactNode }) {
  const oggi = new Date()
  const meseCorrente = `${oggi.getFullYear()}-${String(
    oggi.getMonth() + 1
  ).padStart(2, "0")}`

  const [mese, setMese] = useState(meseCorrente)

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
