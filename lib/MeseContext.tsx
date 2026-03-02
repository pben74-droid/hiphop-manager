"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

type MeseContextType = {
  mese: string
  setMese: (mese: string) => void
}

const MeseContext = createContext<MeseContextType | undefined>(undefined)

export function MeseProvider({ children }: { children: ReactNode }) {

  const [mese, setMese] = useState<string>("")

  useEffect(() => {
    inizializzaMeseDaDB()
  }, [])

  const inizializzaMeseDaDB = async () => {
    try {
      const res = await fetch("/api/mesi")
      const data = await res.json()

      if (data && data.length > 0) {
        // prende il mese più recente (ordinati desc)
        setMese(data[0].mese)
      }
    } catch (err) {
      console.error("Errore inizializzazione mese:", err)
    }
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
    throw new Error("useMese deve essere usato dentro MeseProvider")
  }
  return context
}
