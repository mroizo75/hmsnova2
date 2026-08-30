import { prisma } from "@/lib/db";
import { generateSequenceNumber } from "@/lib/sequence";
import { IK_MAT_SOURCE } from "@/lib/ik-mat-avvik";

export async function createIkMatDeviation(input: {
  tenantId: string;
  reportedBy: string;
  title: string;
  description: string;
  location?: string | null;
  subcategoryKey: string;
  immediateAction?: string | null;
  occurredAt?: Date;
}): Promise<{ id: string; avviksnummer: string | null }> {
  const occurredAt = input.occurredAt ?? new Date();
  const legalNote =
    "\n\nRegistrert automatisk etter IK-mat § 5 nr. 4 og 5 (rutiner ved avvik og for å hindre gjentakelse).";
  const description =
    input.description.trim().length >= 20
      ? `${input.description.trim()}${legalNote}`
      : `${input.description.trim()}${legalNote}`;

  const avviksnummer = await generateSequenceNumber(
    input.tenantId,
    "AVVIK",
    occurredAt.getFullYear(),
  );

  const incident = await prisma.incident.create({
    data: {
      tenantId: input.tenantId,
      avviksnummer,
      type: "AVVIK",
      title: input.title.slice(0, 200),
      description,
      occurredAt,
      reportedBy: input.reportedBy,
      location: input.location ?? null,
      immediateAction: input.immediateAction ?? null,
      projectReference: IK_MAT_SOURCE,
      subcategoryKeys: JSON.stringify([input.subcategoryKey]),
      stage: "REPORTED",
    },
    select: { id: true, avviksnummer: true },
  });

  return incident;
}
