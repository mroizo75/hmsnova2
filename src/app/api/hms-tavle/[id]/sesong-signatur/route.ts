/**
 * Sesongarbeider HMS-intro signatur
 *
 * Lagrer at en sesongarbeider har gjennomgått HMS-introen.
 * Bruker TavleGuestSubmission-modellen (eksisterende) for enkel lagring.
 *
 * Hjemmel: AML § 3-2 (opplæring), IK-HMS § 5 nr. 4
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  name: z.string().min(2, "Navn er påkrevd"),
  lang: z.enum(["nb", "en", "pl", "de"]).default("nb"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tavle = await prisma.hmsTavle.findUnique({
      where: { id },
      select: { id: true, isPublic: true, tenantId: true },
    });

    if (!tavle || !tavle.isPublic) {
      return NextResponse.json({ error: "Tavle ikke funnet" }, { status: 404 });
    }

    const body = await request.json();
    const { name, lang } = bodySchema.parse(body);

    // Lagre som TavleCheckin med employer = "SESONG_INTRO" for sporbarhet
    const today = new Date().toISOString().split("T")[0];
    await prisma.tavleCheckin.create({
      data: {
        tavleId: tavle.id,
        name,
        employer: `SESONG_INTRO:${lang}`,
        date: today,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ugyldig data", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Intern feil" }, { status: 500 });
  }
}
