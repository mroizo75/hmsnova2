import type {
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
} from "@prisma/client";

export const SUPPORT_CATEGORY_LABELS: Record<SupportTicketCategory, string> = {
  QUESTION: "Spørsmål om systemet",
  HMS_ADVICE: "HMS-rådgivning",
  TECHNICAL: "Teknisk problem",
  BILLING: "Faktura / abonnement",
  FEATURE: "Ønske om funksjon",
  OTHER: "Annet",
};

export const SUPPORT_PRIORITY_LABELS: Record<SupportTicketPriority, string> = {
  LOW: "Lav",
  NORMAL: "Normal",
  HIGH: "Høy",
  URGENT: "Haster",
};

export const SUPPORT_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  OPEN: "Åpen",
  IN_PROGRESS: "Under behandling",
  WAITING_CUSTOMER: "Venter på svar",
  RESOLVED: "Løst",
  CLOSED: "Lukket",
};

export function formatSupportTicketNumber(year: number, sequence: number): string {
  return `SUP-${year}-${String(sequence).padStart(4, "0")}`;
}
