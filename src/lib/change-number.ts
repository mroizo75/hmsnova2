import { prisma } from "@/lib/db";

/**
 * Generer endringsnummer for rutineversjoner.
 * Format: ENR-{YEAR}-{SEQ} der SEQ er null-paddet til 3 siffer.
 * Sekvens er per tenant per år, basert på RoutineVersion-antall.
 * Ref. IK-HMS § 5 nr. 7: krav om dokumentstyring og endringslogg.
 */
export async function generateChangeNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();

  const count = await prisma.routineVersion.count({
    where: {
      routine: { tenantId },
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });

  const seq = String(count + 1).padStart(3, "0");
  return `ENR-${year}-${seq}`;
}
