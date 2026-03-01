"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SimpleModeContextType {
  isSimpleMode: boolean;
  toggleMode: () => void;
  setSimpleMode: (value: boolean) => void;
}

const SimpleModeContext = createContext<SimpleModeContextType | undefined>(undefined);

const STORAGE_KEY = "hms-nova-simple-mode";

export function SimpleModeProvider({ children }: { children: ReactNode }) {
  const [isSimpleMode, setIsSimpleMode] = useState(true); // Default til enkel modus
  const [mounted, setMounted] = useState(false);

  // Les fra localStorage ved mount
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setIsSimpleMode(stored === "true");
    }
  }, []);

  // Lagre til localStorage når verdien endres
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, String(isSimpleMode));
    }
  }, [isSimpleMode, mounted]);

  const toggleMode = () => {
    setIsSimpleMode((prev) => !prev);
  };

  const setSimpleMode = (value: boolean) => {
    setIsSimpleMode(value);
  };

  return (
    <SimpleModeContext.Provider value={{ isSimpleMode, toggleMode, setSimpleMode }}>
      {children}
    </SimpleModeContext.Provider>
  );
}

export function useSimpleMode() {
  const context = useContext(SimpleModeContext);
  if (context === undefined) {
    throw new Error("useSimpleMode must be used within a SimpleModeProvider");
  }
  return context;
}

/**
 * Definerer hvilke navigasjonselementer som vises i enkel modus
 * Disse er de mest grunnleggende HMS-funksjonene en bedrift trenger
 */
export const SIMPLE_MODE_PERMISSIONS = [
  "dashboard",      // Oversikt
  "documents",      // HMS-håndbok/dokumenter
  "incidents",      // Avvik/hendelser
  "inspections",    // Vernerunder
  "training",       // Opplæring
  "actions",        // Tiltak
  "chemicals",      // Stoffkartotek
  "settings",       // Innstillinger
] as const;

/**
 * Avanserte funksjoner (skjules i enkel modus)
 */
export const ADVANCED_MODE_ONLY = [
  "forms",              // Skjemabygger
  "risks",              // Avansert risikovurdering
  "riskRegister",       // Risikoregister
  "wellbeing",          // Psykososialt arbeidsmiljø
  "complaints",         // Klager
  "feedback",           // Kundetilbakemeldinger
  "environment",        // Miljø (ISO 14001)
  "bcm",                // Business Continuity
  "audits",             // Revisjoner
  "managementReviews",  // Ledelsens gjennomgang
  "meetings",           // AMU/VO-møter
  "whistleblowing",     // Varsling
  "goals",              // Mål og KPIer
] as const;

