import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { nanoid } from "nanoid";
import { strictRateLimiter, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const createWhistleblowSchema = z.object({
  tenantId: z.string().min(1),
  category: z.enum([
    "HARASSMENT",
    "DISCRIMINATION",
    "WORK_ENVIRONMENT",
    "SAFETY",
    "CORRUPTION",
    "ETHICS",
    "LEGAL",
    "OTHER",
  ]),
  title: z.string().min(1),
  description: z.string().min(10),
  occurredAt: z.string().datetime().optional(),
  location: z.string().optional(),
  involvedPersons: z.string().optional(),
  witnesses: z.string().optional(),
  reporterName: z.string().optional(),
  reporterEmail: z.string().email().optional(),
  reporterPhone: z.string().optional(),
  isAnonymous: z.boolean().default(true),
  _hp: z.string().optional(), // Honeypot
});

// POST /api/whistleblowing - Submit anonymous report
export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 3 varslinger per time per IP
    const ip = getClientIp(req);
    const rateLimitResult = await strictRateLimiter.limit(`whistleblow:${ip}`);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "For mange forsøk. Vennligst vent før du sender en ny varsling." },
        { status: 429 }
      );
    }

    const body = await req.json();
    
    // Honeypot sjekk - hvis fylt ut = bot
    if (body._hp && body._hp.trim() !== "") {
      console.warn(`[WHISTLEBLOWING] Honeypot triggered from IP: ${ip}`);
      return NextResponse.json(
        { error: "Ugyldig innsending" },
        { status: 400 }
      );
    }
    
    const validatedData = createWhistleblowSchema.parse(body);

    // Generate unique case number
    const count = await db.whistleblowing.count({
      where: { tenantId: validatedData.tenantId },
    });
    const year = new Date().getFullYear();
    const caseNumber = `VAR-${year}-${String(count + 1).padStart(3, "0")}`;

    // Generate secure access code (for anonymous follow-up)
    const accessCode = nanoid(16).toUpperCase();

    const report = await db.whistleblowing.create({
      data: {
        tenantId: validatedData.tenantId,
        caseNumber,
        accessCode,
        category: validatedData.category,
        title: validatedData.title,
        description: validatedData.description,
        occurredAt: validatedData.occurredAt
          ? new Date(validatedData.occurredAt)
          : null,
        location: validatedData.location || null,
        involvedPersons: validatedData.involvedPersons || null,
        witnesses: validatedData.witnesses || null,
        reporterName: validatedData.reporterName || null,
        reporterEmail: validatedData.reporterEmail || null,
        reporterPhone: validatedData.reporterPhone || null,
        isAnonymous: validatedData.isAnonymous,
      },
    });

    // Create initial system message
    await db.whistleblowMessage.create({
      data: {
        whistleblowingId: report.id,
        sender: "SYSTEM",
        message: `Varsling mottatt med saksnummer ${caseNumber}. Bruk tilgangskoden din for å følge opp saken.`,
      },
    });

    return NextResponse.json(
      {
        data: {
          id: report.id,
          caseNumber: report.caseNumber,
          accessCode: report.accessCode,
        },
        message:
          "Varslingen er mottatt. Vennligst noter saksnummer og tilgangskode for oppfølging.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[WHISTLEBLOWING_POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

