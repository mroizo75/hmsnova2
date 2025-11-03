"use server";

import { brregClient, type BrregEnhet } from "@/lib/brreg";

/**
 * Valider og hent bedriftsinformasjon fra Brønnøysundregistrene
 */
export async function validateOrgNumber(orgNumber: string): Promise<{
  success: boolean;
  data?: BrregEnhet;
  error?: string;
}> {
  try {
    const enhet = await brregClient.getEnhet(orgNumber);

    if (!enhet) {
      return {
        success: false,
        error: "Organisasjonsnummer ikke funnet eller bedriften er ikke aktiv",
      };
    }

    return {
      success: true,
      data: enhet,
    };
  } catch (error: any) {
    console.error("Validate org number error:", error);
    return {
      success: false,
      error: "Kunne ikke validere organisasjonsnummer. Prøv igjen senere.",
    };
  }
}

/**
 * Søk etter bedrifter i Brønnøysundregistrene
 */
export async function searchCompanies(query: string): Promise<{
  success: boolean;
  data?: BrregEnhet[];
  error?: string;
}> {
  try {
    const enheter = await brregClient.searchEnheter(query, 10);

    return {
      success: true,
      data: enheter,
    };
  } catch (error: any) {
    console.error("Search companies error:", error);
    return {
      success: false,
      error: "Kunne ikke søke etter bedrifter. Prøv igjen senere.",
    };
  }
}

