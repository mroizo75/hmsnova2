/**
 * Feedback-logging: AI-forslag vs. brukerens endelige lagrede verdi.
 *
 * Ren bakgrunnslogging - ingen endring i AI-flyten sett fra brukeren. Grunnlag for å bygge et eget
 * datasett som senere kan brukes til finjustering av HMS Nova sine AI-forslag (ikke tredjeparts modeller).
 * Personvern: se personvernerklæringen (§ "AI-forslag og forbedring av tjenesten") - loggen skal ikke
 * inneholde unødvendige personopplysninger, og brukes aldri til å trene OpenAIs modeller.
 */

import { prisma } from "@/lib/db";

interface LogAiFeedbackParams {
  tenantId: string;
  /** Kort, stabil identifikator for AI-funksjonen, f.eks. "risk_suggestion" eller "incident_root_cause". */
  feature: string;
  aiSuggestion: string;
  userFinalValue: string;
}

/** Logger AI-forslag vs. faktisk lagret verdi. Feiler aldri selve brukerflyten - kun logget til console ved feil. */
export async function logAiFeedback({
  tenantId,
  feature,
  aiSuggestion,
  userFinalValue,
}: LogAiFeedbackParams): Promise<void> {
  try {
    const wasEdited = aiSuggestion.trim() !== userFinalValue.trim();
    await prisma.aiFeedbackLog.create({
      data: {
        tenantId,
        feature,
        aiSuggestion,
        userFinalValue,
        wasEdited,
      },
    });
  } catch (error) {
    console.error("Kunne ikke logge AI-feedback:", error);
  }
}
