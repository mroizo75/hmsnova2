import { prisma } from "@/lib/db";

/**
 * Generer MoC-nummer per tenant per år.
 * Format: MOC-{YEAR}-{SEQ}. ISO 45001 8.1.3 krever sporbar endringskontroll.
 */
export async function generateMocNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();

  const count = await prisma.managementOfChange.count({
    where: {
      tenantId,
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });

  const seq = String(count + 1).padStart(3, "0");
  return `MOC-${year}-${seq}`;
}

export function formatMocNumber(year: number, sequence: number): string {
  return `MOC-${year}-${String(sequence).padStart(3, "0")}`;
}
