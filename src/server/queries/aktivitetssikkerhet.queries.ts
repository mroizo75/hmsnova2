"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";

export async function fetchAktivitetssikkerhet() {
  const auth = await getAuthContext();
  const { tenantId } = auth;

  const sjekker = await prisma.aktivitetsUtstyrssjekk.findMany({
    where: { tenantId },
    orderBy: { checkDate: "desc" },
    take: 100,
  });

  return JSON.parse(JSON.stringify(sjekker));
}
