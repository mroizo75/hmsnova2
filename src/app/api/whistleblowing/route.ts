import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { z } from "zod";
import { nanoid } from "nanoid";
import { strictRateLimiter, getClientIp } from "@/lib/rate-limit";
import { notifyUsersByRole } from "@/server/actions/notification.actions";
import { encryptWhistleblowIdentity } from "@/lib/whistleblowing-crypto";
import { CONFIDENTIAL_ACCESS_COPY } from "@/lib/whistleblowing-case-access";

export const dynamic = "force-dynamic";

const createWhistleblowSchema = z.object({
  tenantId: z.string().min(1),
  tenantSlug: z.string().min(1),
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
    try {
      const rateLimitResult = await strictRateLimiter.limit(`whistleblow:${ip}`);
      if (!rateLimitResult.success) {
        return NextResponse.json(
          { error: "For mange forsøk. Vennligst vent før du sender en ny varsling." },
          { status: 429 }
        );
      }
    } catch (rateLimitError) {
      console.error("[WHISTLEBLOWING] Rate limit check failed, allowing request:", rateLimitError);
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

    const tenant = await db.tenant.findFirst({
      where: {
        id: validatedData.tenantId,
        slug: validatedData.tenantSlug,
        status: { in: ["ACTIVE", "TRIAL"] },
      },
      select: {
        id: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Ugyldig varslingskanal" },
        { status: 403 }
      );
    }

    // Generate unique case number globally (constraint is @unique across all tenants)
    const year = new Date().getFullYear();
    const prefix = `VAR-${year}-`;

    const MAX_RETRIES = 3;
    let report;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const latest = await db.whistleblowing.findFirst({
        where: { caseNumber: { startsWith: prefix } },
        orderBy: { caseNumber: "desc" },
        select: { caseNumber: true },
      });
      const lastNum = latest
        ? parseInt(latest.caseNumber.replace(prefix, ""), 10) || 0
        : 0;
      const caseNumber = `${prefix}${String(lastNum + 1).padStart(3, "0")}`;
      const accessCode = nanoid(16).toUpperCase();

      try {
        report = await db.whistleblowing.create({
          data: {
            tenantId: tenant.id,
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
            isAnonymous: validatedData.isAnonymous,
            identity:
              !validatedData.isAnonymous &&
              (validatedData.reporterName || validatedData.reporterEmail || validatedData.reporterPhone)
                ? {
                    create: encryptWhistleblowIdentity({
                      reporterName: validatedData.reporterName,
                      reporterEmail: validatedData.reporterEmail,
                      reporterPhone: validatedData.reporterPhone,
                    }),
                  }
                : undefined,
          },
        });
        break;
      } catch (createError: any) {
        if (createError.code === "P2002" && attempt < MAX_RETRIES - 1) continue;
        throw createError;
      }
    }

    if (!report) {
      return NextResponse.json(
        { error: "Kunne ikke opprette varsling – prøv igjen" },
        { status: 500 }
      );
    }

    // Create initial system message
    await db.whistleblowMessage.create({
      data: {
        whistleblowingId: report.id,
        sender: "SYSTEM",
        message: `Varsling mottatt med saksnummer ${report.caseNumber}. Bruk tilgangskoden din for å følge opp saken.`,
      },
    });

    await notifyUsersByRole(tenant.id, "VARSLINGSANSVARLIG", {
      type: "WHISTLEBLOWING",
      title: CONFIDENTIAL_ACCESS_COPY.title,
      message: CONFIDENTIAL_ACCESS_COPY.message,
      link: `/dashboard/whistleblowing/${report.id}`,
    });

    revalidatePath("/dashboard/whistleblowing");

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
      const messages = error.issues.map((issue) => {
        const field = issue.path.join(".");
        return `${field}: ${issue.message}`;
      });
      return NextResponse.json(
        { error: messages.join(". ") || "Ugyldig data i skjemaet" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Intern feil – vennligst prøv igjen" },
      { status: 500 }
    );
  }
}

