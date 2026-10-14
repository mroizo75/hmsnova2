import { prisma } from "@/lib/db";
import { SKJENKE_RUTINE_MALER } from "@/features/skjenking/lib/internkontroll";

/** Oppretter lovpålagte standardrutiner som virksomheten kan tilpasse. */
export async function ensureSkjenkingRutiner(tenantId: string): Promise<void> {
  const existing = await prisma.skjenkeRutine.findMany({
    where: { tenantId },
    select: { nokkel: true },
  });
  const keys = new Set(existing.map((row) => row.nokkel));
  const missing = SKJENKE_RUTINE_MALER.filter((mal) => !keys.has(mal.nokkel));
  if (missing.length === 0) return;

  await prisma.skjenkeRutine.createMany({
    data: missing.map((mal) => ({
      tenantId,
      nokkel: mal.nokkel,
      tittel: mal.tittel,
      lovhjemmel: mal.lovhjemmel,
      innhold: mal.innhold,
      aktiv: true,
    })),
  });
}
