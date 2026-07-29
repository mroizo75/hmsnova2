import { prisma } from "@/lib/db";
import {
  resolveProjectIdFromReference,
  type ProjectReferenceLookups,
} from "@/lib/incident-project-reference";

/**
 * Oppslaget er låst til én tenant, slik at en referanse aldri kan treffe et prosjekt
 * i en annen virksomhet (GDPR art. 5 (1) f). Vi slår opp på referansen som skrevet og
 * på formen uten skilletegn, så kun likelydende koder eller ordrenummer kobles.
 */
export function createProjectReferenceLookups(tenantId: string): ProjectReferenceLookups {
  return {
    async findProjectsByReference(reference) {
      const withoutSeparators = reference.replace(/[\s\-_/.]/g, "");
      const values = Array.from(new Set([reference, withoutSeparators]));

      return prisma.project.findMany({
        where: {
          tenantId,
          OR: [{ code: { in: values } }, { orderNumber: { in: values } }],
        },
        select: { id: true, code: true, orderNumber: true },
        take: 5,
      });
    },
  };
}

/**
 * Kobler et avvik til et registrert prosjekt når melderen har skrevet inn en referanse
 * som samsvarer med prosjektkode eller ordrenummer. Returnerer prosjektet som allerede
 * er valgt hvis melderen valgte fra listen.
 */
export async function resolveIncidentProjectId(input: {
  tenantId: string;
  projectId: string | null;
  projectReference: string | null;
}): Promise<string | null> {
  if (input.projectId) return input.projectId;

  return resolveProjectIdFromReference(
    input.projectReference,
    createProjectReferenceLookups(input.tenantId)
  );
}
