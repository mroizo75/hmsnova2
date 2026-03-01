import { prisma } from "@/lib/db";

/** Prefix og display-format for sekvenstyper */
const SEQUENCE_CONFIG: Record<
  string,
  { prefix: string; format: (year: number, num: number) => string }
> = {
  AVVIK: {
    prefix: "AV",
    format: (year, num) => `AV-${year}-${String(num).padStart(3, "0")}`,
  },
  "FORM:SKJ": {
    prefix: "SKJ",
    format: (year, num) => `SKJ-${year}-${String(num).padStart(3, "0")}`,
  },
  RUH: {
    prefix: "RUH",
    format: (year, num) => `RUH-${year}-${String(num).padStart(3, "0")}`,
  },
  SJA: {
    prefix: "SJA",
    format: (year, num) => `SJA-${year}-${String(num).padStart(3, "0")}`,
  },
  "FORM:RUH": {
    prefix: "RUH",
    format: (year, num) => `RUH-${year}-${String(num).padStart(3, "0")}`,
  },
};

function getSequenceConfig(type: string): {
  prefix: string;
  format: (year: number, num: number) => string;
} {
  const config = SEQUENCE_CONFIG[type];
  if (config) return config;
  const prefix = type.startsWith("FORM:") ? type.replace("FORM:", "") : type;
  return {
    prefix: prefix.toUpperCase().slice(0, 6),
    format: (year, num) =>
      `${prefix.toUpperCase().slice(0, 6)}-${year}-${String(num).padStart(3, "0")}`,
  };
}

/**
 * Genererer neste unike referansenummer for en tenant.
 * Bruker transaksjon for å unngå race conditions.
 *
 * @param tenantId - Tenant-ID
 * @param sequenceType - "AVVIK" | "RUH" | "FORM:SKJ" | "FORM:RUH" | "FORM:{custom}"
 * @param year - År for sekvensen (default: nåværende år)
 */
export async function generateSequenceNumber(
  tenantId: string,
  sequenceType: string,
  year?: number
): Promise<string> {
  const y = year ?? new Date().getFullYear();
  const config = getSequenceConfig(sequenceType);

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.tenantSequence.findUnique({
      where: {
        tenantId_sequenceType_year: { tenantId, sequenceType, year: y },
      },
    });

    const nextNumber = (existing?.lastNumber ?? 0) + 1;

    await tx.tenantSequence.upsert({
      where: {
        tenantId_sequenceType_year: { tenantId, sequenceType, year: y },
      },
      create: {
        tenantId,
        sequenceType,
        year: y,
        lastNumber: nextNumber,
      },
      update: { lastNumber: nextNumber },
    });

    return config.format(y, nextNumber);
  });

  return result;
}

/**
 * Henter sequenceType for skjemainnsending basert på FormTemplate.numberPrefix.
 */
export function getFormSequenceType(numberPrefix: string | null): string {
  if (!numberPrefix || numberPrefix.trim() === "") {
    return "FORM:SKJ";
  }
  const prefix = numberPrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `FORM:${prefix || "SKJ"}`;
}
