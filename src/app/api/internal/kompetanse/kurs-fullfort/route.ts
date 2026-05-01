import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateInternalRequest } from "@/lib/internal-auth";
import { z, ZodError } from "zod";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  hmsNovaUserId: z.string().min(1, "hmsNovaUserId er påkrevd"),
  hmsNovaTenantId: z.string().min(1, "hmsNovaTenantId er påkrevd"),
  kursNavn: z.string().min(1, "kursNavn er påkrevd"),
  kursKey: z.string().min(1, "kursKey er påkrevd"),
  fullfortDato: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fullfortDato må være YYYY-MM-DD"),
  bestatt: z.boolean(),
  karakterProsent: z.number().int().min(0).max(100),
  diplomUrl: z.string().url("diplomUrl må være en gyldig URL"),
});

/**
 * POST /api/internal/kompetanse/kurs-fullfort
 *
 * Mottar gjennomføringsdata fra Bransjekurs.no og oppretter eller oppdaterer
 * en Training-post i HMS Nova Kompetanse-modulen for brukeren.
 *
 * Kun tilgjengelig for interne server-til-server-kall (INTERNAL_API_SECRET).
 *
 * Request body:
 *   {
 *     hmsNovaUserId: string;
 *     hmsNovaTenantId: string;
 *     kursNavn: string;
 *     kursKey: string;
 *     fullfortDato: string;   // YYYY-MM-DD
 *     bestatt: boolean;
 *     karakterProsent: number;
 *     diplomUrl: string;
 *   }
 *
 * Response (200):
 *   { trainingId: string; created: boolean }
 */
export async function POST(request: NextRequest) {
  const unauthorized = validateInternalRequest(request);
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "INVALID_BODY", message: "Ugyldig JSON i forespørselen" },
      { status: 400 },
    );
  }

  let validated: z.infer<typeof requestSchema>;
  try {
    validated = requestSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: error.issues[0]?.message ?? "Ugyldig input" },
        { status: 400 },
      );
    }
    throw error;
  }

  // Bekreft at bruker finnes og tilhører oppgitt tenant med kursavtale
  const userTenant = await prisma.userTenant.findFirst({
    where: {
      userId: validated.hmsNovaUserId,
      tenantId: validated.hmsNovaTenantId,
      tenant: {
        bransjekursEnabled: true,
      },
    },
    select: {
      userId: true,
      tenantId: true,
    },
  });

  if (!userTenant) {
    return NextResponse.json(
      {
        code: "USER_NOT_FOUND",
        message:
          "Bruker finnes ikke i oppgitt tenant, eller tenanten har ikke aktiv kursavtale",
      },
      { status: 404 },
    );
  }

  const completedAt = new Date(validated.fullfortDato);

  // Upsert: oppdater eksisterende Training for samme kursKey+bruker, eller opprett ny
  const existing = await prisma.training.findFirst({
    where: {
      tenantId: validated.hmsNovaTenantId,
      userId: validated.hmsNovaUserId,
      courseKey: validated.kursKey,
    },
    select: { id: true },
  });

  let trainingId: string;
  let created: boolean;

  if (existing) {
    await prisma.training.update({
      where: { id: existing.id },
      data: {
        title: validated.kursNavn,
        completedAt,
        proofDocKey: validated.diplomUrl,
        description: `Gjennomført via Bransjekurs.no · ${validated.karakterProsent}% · ${validated.bestatt ? "Bestått" : "Ikke bestått"}`,
      },
    });
    trainingId = existing.id;
    created = false;
  } else {
    const training = await prisma.training.create({
      data: {
        tenantId: validated.hmsNovaTenantId,
        userId: validated.hmsNovaUserId,
        courseKey: validated.kursKey,
        title: validated.kursNavn,
        provider: "Bransjekurs.no",
        completedAt,
        proofDocKey: validated.diplomUrl,
        isRequired: false,
        description: `Gjennomført via Bransjekurs.no · ${validated.karakterProsent}% · ${validated.bestatt ? "Bestått" : "Ikke bestått"}`,
      },
      select: { id: true },
    });
    trainingId = training.id;
    created = true;
  }

  return NextResponse.json({ trainingId, created });
}
