"use server";

import { z, ZodError } from "zod";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { sendEmail } from "@/lib/email";
import { deleteTenantFiles } from "@/lib/storage";
import { RiskCategory } from "@prisma/client";
import { getBindingPrice } from "@/lib/subscription";
import { provisionIndustryPackage } from "@/server/actions/industry-provision.actions";
import {
  getIndustryPackage,
  getIndustryLabel,
  isSupportedIndustry,
  normalizeIndustryValue,
} from "@/lib/industry-packages";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateRiskAnalysis } from "@/lib/ai";

// Valideringsskjemaer
const updateTenantSchema = z.object({
  tenantId: z.string(),
  name: z.string().min(2, "Navn må være minst 2 tegn"),
  slug: z.string().min(2, "Slug må være minst 2 tegn").regex(/^[a-z0-9-]+$/, "Slug kan kun inneholde små bokstaver, tall og bindestrek"),
  orgNumber: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email("Ugyldig e-postadresse").optional(),
  contactPhone: z.string().optional(),
  employeeCount: z.number().int().positive("Antall ansatte må være positivt").optional(),
  industry: z
    .string()
    .optional()
    .refine((value) => !value || isSupportedIndustry(value), "Ugyldig bransje"),
  notes: z.string().optional(),
  hmsAnnualPlanEnabled: z.boolean().optional(),
  managementReviewFrequencyMonths: z
    .number()
    .int()
    .min(1, "Frekvens må være minst 1 måned")
    .max(24, "Frekvens kan ikke være mer enn 24 måneder")
    .optional(),
});

const updateAdminEmailSchema = z.object({
  tenantId: z.string(),
  oldEmail: z.string().email(),
  newEmail: z.string().email("Ugyldig e-postadresse"),
});

const resendActivationSchema = z.object({
  tenantId: z.string(),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8, "Passord må være minst 8 tegn"),
});

const createTenantSchema = z.object({
  name: z.string().min(2, "Bedriftsnavn må være minst 2 tegn"),
  orgNumber: z.string().optional(),
  contactPerson: z.string().min(2, "Kontaktperson er påkrevd"),
  contactEmail: z.string().email("Ugyldig e-postadresse"),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  employeeCount: z.number().int().positive("Antall ansatte må være positivt"),
  industry: z
    .string()
    .optional()
    .refine((value) => !value || isSupportedIndustry(value), "Ugyldig bransje"),
  notes: z.string().optional(),
  pricingTier: z.enum(["MICRO", "SMALL", "MEDIUM", "LARGE"]),
  salesRep: z.string().optional(),
  createInFiken: z.boolean().optional(),
  // Fremtidig: her kan vi senere åpne for å spesifisere HMS-oppsett ved opprettelse
});

const createTenantActivitySchema = z.object({
  tenantId: z.string(),
  type: z.enum(["CONTACT", "FOLLOW_UP", "OFFER_SENT", "MEETING", "OTHER"]),
  channel: z.enum(["PHONE", "EMAIL", "MEETING", "OTHER"]),
  note: z.string().min(2, "Notat må være minst 2 tegn"),
});

const createTenantOfferSchema = z.object({
  tenantId: z.string(),
  setupPrice: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

async function requirePrivilegedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      isSuperAdmin: true,
      isSupport: true,
    },
  });

  if (!user || (!user.isSuperAdmin && !user.isSupport)) {
    return null;
  }

  return user;
}

function mapAiSeverityToValues(
  severity: string
): { likelihood: number; consequence: number } {
  const normalizedSeverity = severity.trim().toUpperCase();
  if (normalizedSeverity === "HIGH") {
    return { likelihood: 3, consequence: 4 };
  }
  if (normalizedSeverity === "MEDIUM") {
    return { likelihood: 2, consequence: 3 };
  }
  return { likelihood: 1, consequence: 2 };
}

function mapAiCategoryToRiskCategory(category: string): RiskCategory {
  const normalizedCategory = category.trim().toLowerCase();
  if (normalizedCategory.includes("ergonomi")) {
    return "ERGONOMIC";
  }
  if (normalizedCategory.includes("sikker")) {
    return "SAFETY";
  }
  if (normalizedCategory.includes("psyk")) {
    return "PSYCHOSOCIAL";
  }
  if (normalizedCategory.includes("kjem")) {
    return "HEALTH";
  }
  if (normalizedCategory.includes("fysisk")) {
    return "PHYSICAL";
  }
  if (normalizedCategory.includes("milj")) {
    return "ENVIRONMENTAL";
  }
  if (normalizedCategory.includes("jurid")) {
    return "LEGAL";
  }
  return "OPERATIONAL";
}

export async function getTenantIndustryPackageStatus(tenantId: string) {
  try {
    const privilegedUser = await requirePrivilegedUser();
    if (!privilegedUser) {
      return { success: false, error: "Ingen tilgang" };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        industry: true,
        simpleMenuItems: true,
      },
    });

    if (!tenant) {
      return { success: false, error: "Bedrift ikke funnet" };
    }

    const industryPackage = getIndustryPackage(tenant.industry);
    if (!industryPackage) {
      return {
        success: true,
        data: {
          hasPackage: false,
          industry: tenant.industry || null,
          industryLabel: tenant.industry ? getIndustryLabel(tenant.industry) : null,
        },
      };
    }

    const expectedRiskTitles = industryPackage.risks.map((item) => item.title);
    const expectedSjaTemplates = industryPackage.sjaTemplates.map((item) => item.name);
    const expectedInspectionTemplates = industryPackage.inspectionTemplates.map((item) => item.name);
    const expectedCourseKeys = industryPackage.courseTemplates.map((item) => item.courseKey);

    const [riskMatches, sjaMatches, inspectionMatches, courseMatches, allLegalReferences] =
      await Promise.all([
        prisma.risk.findMany({
          where: {
            tenantId,
            title: { in: expectedRiskTitles },
          },
          select: { title: true },
        }),
        prisma.sjaTemplate.findMany({
          where: {
            tenantId,
            isActive: true,
            name: { in: expectedSjaTemplates },
          },
          select: { name: true },
        }),
        prisma.inspectionTemplate.findMany({
          where: {
            tenantId,
            name: { in: expectedInspectionTemplates },
          },
          select: { name: true },
        }),
        prisma.courseTemplate.findMany({
          where: {
            tenantId,
            courseKey: { in: expectedCourseKeys },
            isActive: true,
          },
          select: { courseKey: true },
        }),
        prisma.legalReference.findMany({
          orderBy: { sortOrder: "asc" },
        }),
      ]);

    const legalReferencesForIndustry = allLegalReferences.filter((reference) => {
      const industries = Array.isArray(reference.industries)
        ? (reference.industries as string[])
        : [];
      const normalized = industries.map((item) => item.toLowerCase());
      return normalized.includes(industryPackage.industry) || normalized.includes("all");
    });

    const expectedLegalReferenceKeys = industryPackage.legalReferences.map(
      (reference) => `${reference.title}::${reference.paragraphRef}`
    );
    const existingLegalReferenceKeys = new Set(
      legalReferencesForIndustry.map((reference) => `${reference.title}::${reference.paragraphRef || ""}`)
    );

    const existingRiskTitles = new Set(riskMatches.map((item) => item.title));
    const existingSjaTemplateNames = new Set(sjaMatches.map((item) => item.name));
    const existingInspectionTemplateNames = new Set(inspectionMatches.map((item) => item.name));
    const existingCourseKeys = new Set(courseMatches.map((item) => item.courseKey));
    const selectedSimpleMenuItems = Array.isArray(tenant.simpleMenuItems)
      ? (tenant.simpleMenuItems as string[])
      : [];

    const missingRiskTitles = expectedRiskTitles.filter((item) => !existingRiskTitles.has(item));
    const missingSjaTemplates = expectedSjaTemplates.filter((item) => !existingSjaTemplateNames.has(item));
    const missingInspectionTemplates = expectedInspectionTemplates.filter(
      (item) => !existingInspectionTemplateNames.has(item)
    );
    const missingCourseKeys = expectedCourseKeys.filter((item) => !existingCourseKeys.has(item));
    const missingLegalReferences = expectedLegalReferenceKeys.filter(
      (key) => !existingLegalReferenceKeys.has(key)
    );
    const missingSimpleMenuItems = industryPackage.simpleMenuHrefs.filter(
      (href) => !selectedSimpleMenuItems.includes(href)
    );

    return {
      success: true,
      data: {
        hasPackage: true,
        industry: industryPackage.industry,
        industryLabel: industryPackage.displayName,
        sections: {
          risks: {
            expected: expectedRiskTitles.length,
            existing: expectedRiskTitles.length - missingRiskTitles.length,
            missing: missingRiskTitles,
          },
          sjaTemplates: {
            expected: expectedSjaTemplates.length,
            existing: expectedSjaTemplates.length - missingSjaTemplates.length,
            missing: missingSjaTemplates,
          },
          inspectionTemplates: {
            expected: expectedInspectionTemplates.length,
            existing: expectedInspectionTemplates.length - missingInspectionTemplates.length,
            missing: missingInspectionTemplates,
          },
          courses: {
            expected: expectedCourseKeys.length,
            existing: expectedCourseKeys.length - missingCourseKeys.length,
            missing: missingCourseKeys,
          },
          legalReferences: {
            expected: expectedLegalReferenceKeys.length,
            existing: expectedLegalReferenceKeys.length - missingLegalReferences.length,
            missing: missingLegalReferences,
          },
          simpleMenu: {
            expected: industryPackage.simpleMenuHrefs.length,
            existing: industryPackage.simpleMenuHrefs.length - missingSimpleMenuItems.length,
            missing: missingSimpleMenuItems,
          },
        },
      },
    };
  } catch (error: any) {
    console.error("Get tenant industry package status error:", error);
    return { success: false, error: error.message || "Kunne ikke hente status for bransjepakke" };
  }
}

export async function reprovisionTenantIndustryPackage(tenantId: string) {
  try {
    const privilegedUser = await requirePrivilegedUser();
    if (!privilegedUser) {
      return { success: false, error: "Ingen tilgang" };
    }

    const result = await provisionIndustryPackage(tenantId);
    if (!result.success) {
      return { success: false, error: result.error || "Kunne ikke reprovisjonere bransjepakke" };
    }

    revalidatePath(`/admin/tenants/${tenantId}`);
    revalidatePath("/admin/tenants");
    return { success: true };
  } catch (error: any) {
    console.error("Reprovision tenant industry package error:", error);
    return { success: false, error: error.message || "Kunne ikke reprovisjonere bransjepakke" };
  }
}

export async function generateAiRiskSuggestionsForTenant(tenantId: string) {
  try {
    const privilegedUser = await requirePrivilegedUser();
    if (!privilegedUser) {
      return { success: false, error: "Ingen tilgang" };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        industry: true,
        employeeCount: true,
      },
    });

    if (!tenant) {
      return { success: false, error: "Bedrift ikke funnet" };
    }

    const industryLabel = tenant.industry?.trim()
      ? getIndustryLabel(tenant.industry)
      : "Annet";

    const ownerCandidate = await prisma.userTenant.findFirst({
      where: {
        tenantId,
        role: { in: ["ADMIN", "HMS", "LEDER"] },
      },
      orderBy: { createdAt: "asc" },
      select: { userId: true },
    });

    if (!ownerCandidate) {
      return { success: false, error: "Fant ingen ansvarlig bruker for nye risikoforslag" };
    }

    const [existingRisks, existingIncidents] = await Promise.all([
      prisma.risk.findMany({
        where: { tenantId },
        select: { title: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.incident.findMany({
        where: { tenantId },
        select: { title: true },
        orderBy: { occurredAt: "desc" },
        take: 50,
      }),
    ]);

    const analysis = await generateRiskAnalysis(
      industryLabel,
      tenant.employeeCount || 1,
      existingRisks.map((risk) => risk.title),
      existingIncidents.map((incident) => incident.title),
      {
        cacheScope: `tenant:${tenantId}:riskSuggestions`,
        rateLimitScope: `tenant:${tenantId}`,
        budgetScope: `tenant:${tenantId}`,
      }
    );

    if (!analysis.suggestedRisks.length) {
      return {
        success: true,
        data: { created: 0, skipped: 0, message: "AI returnerte ingen nye forslag" },
      };
    }

    const currentYear = new Date().getFullYear();
    const assessmentTitle = `Risikovurdering ${currentYear}`;
    let createdCount = 0;
    let skippedCount = 0;

    await prisma.$transaction(async (tx) => {
      let assessment = await tx.riskAssessment.findFirst({
        where: {
          tenantId,
          title: assessmentTitle,
          assessmentYear: currentYear,
        },
        select: { id: true },
      });

      if (!assessment) {
        assessment = await tx.riskAssessment.create({
          data: {
            tenantId,
            title: assessmentTitle,
            assessmentYear: currentYear,
          },
          select: { id: true },
        });
      }

      for (const suggestion of analysis.suggestedRisks) {
        const suggestionTitle = suggestion.risk.trim();
        if (!suggestionTitle) {
          skippedCount += 1;
          continue;
        }

        const existingRisk = await tx.risk.findFirst({
          where: {
            tenantId,
            title: suggestionTitle,
          },
          select: { id: true },
        });

        if (existingRisk) {
          skippedCount += 1;
          continue;
        }

        const severityValues = mapAiSeverityToValues(suggestion.severity);
        await tx.risk.create({
          data: {
            tenantId,
            riskAssessmentId: assessment.id,
            title: suggestionTitle,
            context: `AI-forslag for ${industryLabel}: ${suggestionTitle}`,
            likelihood: severityValues.likelihood,
            consequence: severityValues.consequence,
            score: severityValues.likelihood * severityValues.consequence,
            ownerId: ownerCandidate.userId,
            category: mapAiCategoryToRiskCategory(suggestion.category || ""),
            description: `Automatisk forslag basert på bransje, eksisterende risiko og hendelseshistorikk.`,
            existingControls: "Vurder tiltak via SJA, vernerunde og opplæringsplan.",
            riskStatement: suggestionTitle,
          },
        });
        createdCount += 1;
      }
    });

    revalidatePath(`/admin/tenants/${tenantId}`);
    revalidatePath("/dashboard/risks");

    return {
      success: true,
      data: {
        created: createdCount,
        skipped: skippedCount,
      },
    };
  } catch (error: any) {
    console.error("Generate AI risk suggestions error:", error);
    return {
      success: false,
      error: error.message || "Kunne ikke generere AI-risikoforslag",
    };
  }
}

const applyAiSuggestionsSchema = z.object({
  tenantId: z.string().cuid(),
  assessmentTitle: z.string().trim().min(2).max(200).optional(),
  suggestions: z
    .array(
      z.object({
        title: z.string().min(2),
        severity: z.string().min(1),
        category: z.string().min(1),
      })
    )
    .min(1),
});

export async function previewAiRiskSuggestionsForTenant(tenantId: string) {
  try {
    const privilegedUser = await requirePrivilegedUser();
    if (!privilegedUser) {
      return { success: false, error: "Ingen tilgang" };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        industry: true,
        employeeCount: true,
      },
    });

    if (!tenant) {
      return { success: false, error: "Bedrift ikke funnet" };
    }

    const industryLabel = tenant.industry?.trim()
      ? getIndustryLabel(tenant.industry)
      : "Annet";

    const [existingRisks, existingIncidents] = await Promise.all([
      prisma.risk.findMany({
        where: { tenantId },
        select: { title: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.incident.findMany({
        where: { tenantId },
        select: { title: true },
        orderBy: { occurredAt: "desc" },
        take: 100,
      }),
    ]);

    const analysis = await generateRiskAnalysis(
      industryLabel,
      tenant.employeeCount || 1,
      existingRisks.map((risk) => risk.title),
      existingIncidents.map((incident) => incident.title),
      {
        cacheScope: `tenant:${tenantId}:riskSuggestions`,
        rateLimitScope: `tenant:${tenantId}`,
        budgetScope: `tenant:${tenantId}`,
      }
    );

    const existingRiskTitles = new Set(
      existingRisks.map((risk) => risk.title.trim().toLowerCase())
    );

    const suggestions = analysis.suggestedRisks
      .map((suggestion) => {
        const title = suggestion.risk.trim();
        const severity = suggestion.severity.trim().toUpperCase();
        const category = suggestion.category.trim();
        const rationale = (suggestion.rationale || "").trim();
        return {
          title,
          severity,
          category,
          rationale,
          isDuplicate: existingRiskTitles.has(title.toLowerCase()),
        };
      })
      .filter((suggestion) => suggestion.title.length > 0);

    return {
      success: true,
      data: {
        suggestions,
      },
    };
  } catch (error: any) {
    console.error("Preview AI risk suggestions error:", error);
    return {
      success: false,
      error: error.message || "Kunne ikke forhåndsvise AI-risikoforslag",
    };
  }
}

export async function applyAiRiskSuggestionsForTenant(input: {
  tenantId: string;
  assessmentTitle?: string;
  suggestions: Array<{ title: string; severity: string; category: string }>;
}) {
  try {
    const privilegedUser = await requirePrivilegedUser();
    if (!privilegedUser) {
      return { success: false, error: "Ingen tilgang" };
    }

    const validated = applyAiSuggestionsSchema.parse(input);

    const tenant = await prisma.tenant.findUnique({
      where: { id: validated.tenantId },
      select: {
        id: true,
        industry: true,
      },
    });

    if (!tenant) {
      return { success: false, error: "Bedrift ikke funnet" };
    }

    const industryLabel = tenant.industry?.trim()
      ? getIndustryLabel(tenant.industry)
      : "Annet";

    const ownerCandidate = await prisma.userTenant.findFirst({
      where: {
        tenantId: validated.tenantId,
        role: { in: ["ADMIN", "HMS", "LEDER"] },
      },
      orderBy: { createdAt: "asc" },
      select: { userId: true },
    });

    if (!ownerCandidate) {
      return { success: false, error: "Fant ingen ansvarlig bruker for nye risikoforslag" };
    }

    const currentYear = new Date().getFullYear();
    const assessmentTitle =
      validated.assessmentTitle?.trim() || `Risikovurdering ${currentYear}`;
    let createdCount = 0;
    let skippedCount = 0;

    await prisma.$transaction(async (tx) => {
      let assessment = await tx.riskAssessment.findFirst({
        where: {
          tenantId: validated.tenantId,
          title: assessmentTitle,
          assessmentYear: currentYear,
        },
        select: { id: true },
      });

      if (!assessment) {
        assessment = await tx.riskAssessment.create({
          data: {
            tenantId: validated.tenantId,
            title: assessmentTitle,
            assessmentYear: currentYear,
          },
          select: { id: true },
        });
      }

      for (const suggestion of validated.suggestions) {
        const suggestionTitle = suggestion.title.trim();
        if (!suggestionTitle) {
          skippedCount += 1;
          continue;
        }

        const existingRisk = await tx.risk.findFirst({
          where: {
            tenantId: validated.tenantId,
            title: suggestionTitle,
          },
          select: { id: true },
        });

        if (existingRisk) {
          skippedCount += 1;
          continue;
        }

        const severityValues = mapAiSeverityToValues(suggestion.severity);
        await tx.risk.create({
          data: {
            tenantId: validated.tenantId,
            riskAssessmentId: assessment.id,
            title: suggestionTitle,
            context: `AI-forslag for ${industryLabel}: ${suggestionTitle}`,
            likelihood: severityValues.likelihood,
            consequence: severityValues.consequence,
            score: severityValues.likelihood * severityValues.consequence,
            ownerId: ownerCandidate.userId,
            category: mapAiCategoryToRiskCategory(suggestion.category || ""),
            description: "Manuelt godkjent AI-forslag basert på bransjedata og historikk.",
            existingControls: "Vurder tiltak via SJA, vernerunde og opplæringsplan.",
            riskStatement: suggestionTitle,
          },
        });
        createdCount += 1;
      }
    });

    revalidatePath(`/admin/tenants/${validated.tenantId}`);
    revalidatePath("/dashboard/risks");

    return {
      success: true,
      data: {
        created: createdCount,
        skipped: skippedCount,
      },
    };
  } catch (error: any) {
    console.error("Apply AI risk suggestions error:", error);
    if (error instanceof ZodError) {
      return { success: false, error: error.issues[0]?.message || "Ugyldig input" };
    }
    return {
      success: false,
      error: error.message || "Kunne ikke lagre AI-risikoforslag",
    };
  }
}

/**
 * Hent detaljert tenant-informasjon
 */
export async function getTenantDetails(tenantId: string) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: true,
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                emailVerified: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        invoices: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
        offers: {
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
        activities: {
          orderBy: {
            createdAt: "desc",
          },
          take: 50,
        },
        _count: {
          select: {
            users: true,
            documents: true,
            incidents: true,
            risks: true,
          },
        },
        managementReviews: {
          orderBy: {
            reviewDate: "desc",
          },
          take: 1,
        },
      },
    });

    if (!tenant) {
      return { success: false, error: "Bedrift ikke funnet" };
    }

    return { success: true, data: tenant };
  } catch (error) {
    console.error("Get tenant details error:", error);
    return { success: false, error: "Kunne ikke hente bedriftsinformasjon" };
  }
}

export async function createTenantOffer(input: z.infer<typeof createTenantOfferSchema>) {
  try {
    const validated = createTenantOfferSchema.parse(input);

    const tenant = await prisma.tenant.findUnique({
      where: { id: validated.tenantId },
    });

    if (!tenant) {
      return { success: false, error: "Bedrift ikke funnet" };
    }

    const binding = getBindingPrice("1year");
    const yearlyPrice = binding.yearlyPrice;
    const token = randomUUID();

    const offer = await prisma.tenantOffer.create({
      data: {
        tenantId: tenant.id,
        status: "SENT",
        token,
        yearlyPrice,
        bindingMonths: 12,
        noticeMonths: 3,
        setupPrice: validated.setupPrice,
        notes: validated.notes,
        sentAt: new Date(),
      },
    });

    const toEmail = tenant.invoiceEmail || tenant.contactEmail;

    if (toEmail && process.env.RESEND_API_KEY) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const offerUrl = `${appUrl}/tilbud/${offer.token}`;
      const companyName = tenant.name;

      await sendEmail({
        to: toEmail,
        subject: `Tilbud fra HMS Nova – ${companyName}`,
        html: `
          <h1>Tilbud på HMS Nova</h1>
          <p>Hei${tenant.contactPerson ? ` ${tenant.contactPerson}` : ""},</p>
          <p>Takk for interessen for HMS Nova. Vi har satt opp et tilbud basert på standard pris med 12 måneders bindingstid og 3 måneders oppsigelse.</p>
          <ul>
            <li>Årspris: <strong>${yearlyPrice.toLocaleString("nb-NO")} kr/år</strong></li>
            <li>Bindingstid: <strong>12 måneder</strong></li>
            <li>Oppsigelsestid: <strong>3 måneder etter endt binding</strong></li>
            ${
              validated.setupPrice != null
                ? `<li>Etablering / oppsett av HMS-håndbok: <strong>${validated.setupPrice.toLocaleString(
                    "nb-NO",
                  )} kr</strong></li>`
                : ""
            }
          </ul>
          <p>Du kan lese hele kontrakten og godkjenne den her:</p>
          <p><a href="${offerUrl}">${offerUrl}</a></p>
          <p>Ta gjerne kontakt hvis du har spørsmål.</p>
          <p>Hilsen<br/>HMS Nova</p>
        `,
      });
    }

    revalidatePath(`/admin/tenants/${tenant.id}`);

    return { success: true, data: offer };
  } catch (error) {
    console.error("Create tenant offer error:", error);
    if (error instanceof ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: "Kunne ikke opprette tilbud" };
  }
}

export async function acceptTenantOffer(token: string) {
  try {
    const offer = await prisma.tenantOffer.findUnique({
      where: { token },
      include: {
        tenant: {
          include: {
            subscription: true,
          },
        },
      },
    });

    if (!offer || offer.status !== "SENT") {
      return { success: false, error: "Tilbudet er ikke lenger gyldig" };
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime());
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);

    await prisma.$transaction(async (tx) => {
      await tx.tenantOffer.update({
        where: { id: offer.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: now,
        },
      });

      if (offer.tenant.subscription) {
        await tx.subscription.update({
          where: { tenantId: offer.tenantId },
          data: {
            plan:
              offer.tenant.pricingTier === "MICRO"
                ? "STARTER"
                : offer.tenant.pricingTier === "SMALL"
                ? "PROFESSIONAL"
                : "ENTERPRISE",
            price: offer.yearlyPrice,
            billingInterval: "YEARLY",
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
          },
        });
      } else {
        await tx.subscription.create({
          data: {
            tenantId: offer.tenantId,
            plan:
              offer.tenant.pricingTier === "MICRO"
                ? "STARTER"
                : offer.tenant.pricingTier === "SMALL"
                ? "PROFESSIONAL"
                : "ENTERPRISE",
            price: offer.yearlyPrice,
            billingInterval: "YEARLY",
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        });
      }

      await tx.tenant.update({
        where: { id: offer.tenantId },
        data: {
          status: "ACTIVE",
          onboardingStatus: "COMPLETED",
          onboardingCompletedAt: now,
          trialEndsAt: null,
        },
      });

      await tx.tenantActivity.create({
        data: {
          tenantId: offer.tenantId,
          type: "OTHER",
          channel: "OTHER",
          note: "Kontrakt godkjent av kunden via tilbudslenke. Tenant aktivert.",
        },
      });
    });

    revalidatePath(`/admin/tenants/${offer.tenantId}`);

    return { success: true, data: { tenantId: offer.tenantId } };
  } catch (error) {
    console.error("Accept tenant offer error:", error);
    return { success: false, error: "Kunne ikke godkjenne tilbud" };
  }
}

export async function createTenantActivity(input: z.infer<typeof createTenantActivitySchema>) {
  try {
    const validated = createTenantActivitySchema.parse(input);

    const activity = await prisma.tenantActivity.create({
      data: {
        tenantId: validated.tenantId,
        type: validated.type,
        channel: validated.channel,
        note: validated.note,
      },
    });

    revalidatePath(`/admin/tenants/${validated.tenantId}`);

    return { success: true, data: activity };
  } catch (error) {
    console.error("Create tenant activity error:", error);
    if (error instanceof ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: "Kunne ikke opprette aktivitet" };
  }
}

/**
 * Oppdater tenant-informasjon
 */
export async function updateTenant(input: z.infer<typeof updateTenantSchema>) {
  try {
    const validated = updateTenantSchema.parse(input);

    // Sjekk at slug er unik (unntatt for denne tenanten)
    const existingSlug = await prisma.tenant.findFirst({
      where: {
        slug: validated.slug,
        id: {
          not: validated.tenantId,
        },
      },
    });

    if (existingSlug) {
      return { success: false, error: "Denne slugen er allerede i bruk" };
    }

    const existingTenant = await prisma.tenant.findUnique({
      where: { id: validated.tenantId },
      select: { industry: true },
    });

    if (!existingTenant) {
      return { success: false, error: "Bedrift ikke funnet" };
    }

    const normalizedIndustry = validated.industry
      ? normalizeIndustryValue(validated.industry)
      : undefined;

    const updatedTenant = await prisma.tenant.update({
      where: { id: validated.tenantId },
      data: {
        name: validated.name,
        slug: validated.slug,
        orgNumber: validated.orgNumber,
        address: validated.address,
        postalCode: validated.postalCode,
        city: validated.city,
        contactPerson: validated.contactPerson,
        contactEmail: validated.contactEmail,
        contactPhone: validated.contactPhone,
        employeeCount: validated.employeeCount,
        industry: normalizedIndustry,
        notes: validated.notes,
        hmsAnnualPlanEnabled:
          typeof validated.hmsAnnualPlanEnabled === "boolean"
            ? validated.hmsAnnualPlanEnabled
            : undefined,
        managementReviewFrequencyMonths:
          typeof validated.managementReviewFrequencyMonths === "number"
            ? validated.managementReviewFrequencyMonths
            : undefined,
      },
    });

    const previousIndustry = normalizeIndustryValue(existingTenant.industry);
    const nextIndustry = normalizeIndustryValue(updatedTenant.industry);
    if (nextIndustry && previousIndustry !== nextIndustry) {
      await provisionIndustryPackage(updatedTenant.id);
    }

    revalidatePath(`/admin/tenants/${validated.tenantId}`);
    revalidatePath("/admin/tenants");

    return { success: true, data: updatedTenant };
  } catch (error) {
    console.error("Update tenant error:", error);
    if (error instanceof ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: "Kunne ikke oppdatere bedriftsinformasjon" };
  }
}

/**
 * Oppdater admin-brukerens e-post
 */
export async function updateTenantAdminEmail(input: z.infer<typeof updateAdminEmailSchema>) {
  try {
    const validated = updateAdminEmailSchema.parse(input);

    // Finn admin-brukeren
    const userTenant = await prisma.userTenant.findFirst({
      where: {
        tenantId: validated.tenantId,
        role: "ADMIN",
        user: {
          email: validated.oldEmail,
        },
      },
      include: {
        user: true,
      },
    });

    if (!userTenant) {
      return { success: false, error: "Admin-bruker ikke funnet" };
    }

    // Sjekk at ny e-post ikke er i bruk
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.newEmail },
    });

    if (existingUser && existingUser.id !== userTenant.userId) {
      return { success: false, error: "E-postadressen er allerede i bruk av en annen bruker" };
    }

    // Oppdater e-post
    const updatedUser = await prisma.user.update({
      where: { id: userTenant.userId },
      data: {
        email: validated.newEmail,
        emailVerified: new Date(), // Automatisk verifiser admin
      },
    });

    // Send bekreftelse på e-post
    await sendEmail({
      to: validated.newEmail,
      subject: "E-postadresse oppdatert - HMS Nova",
      html: `
        <h1>E-postadresse oppdatert</h1>
        <p>Hei ${updatedUser.name},</p>
        <p>Din e-postadresse for HMS Nova har blitt oppdatert til: <strong>${validated.newEmail}</strong></p>
        <p>Du kan nå logge inn med denne e-postadressen.</p>
        <br>
        <p>Hilsen HMS Nova teamet</p>
      `,
    });

    revalidatePath(`/admin/tenants/${validated.tenantId}`);

    return { success: true, data: updatedUser };
  } catch (error) {
    console.error("Update admin email error:", error);
    if (error instanceof ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: "Kunne ikke oppdatere e-postadresse" };
  }
}

/**
 * Send aktivering på nytt
 */
export async function resendActivationEmail(input: z.infer<typeof resendActivationSchema>) {
  try {
    const validated = resendActivationSchema.parse(input);

    const tenant = await prisma.tenant.findUnique({
      where: { id: validated.tenantId },
    });

    if (!tenant) {
      return { success: false, error: "Bedrift ikke funnet" };
    }

    // Finn eller opprett admin-bruker
    let user = await prisma.user.findUnique({
      where: { email: validated.adminEmail },
      include: {
        tenants: {
          where: {
            tenantId: validated.tenantId,
          },
        },
      },
    });

    const hashedPassword = await bcrypt.hash(validated.adminPassword, 10);

    if (!user) {
      // Opprett ny bruker
      user = await prisma.user.create({
        data: {
          email: validated.adminEmail,
          name: tenant.contactPerson || "Admin",
          password: hashedPassword,
          emailVerified: new Date(),
          tenants: {
            create: {
              tenantId: validated.tenantId,
              role: "ADMIN",
            },
          },
        },
        include: {
          tenants: {
            where: {
              tenantId: validated.tenantId,
            },
          },
        },
      });
    } else if (user.tenants.length === 0) {
      // Koble eksisterende bruker til tenant
      await prisma.userTenant.create({
        data: {
          userId: user.id,
          tenantId: validated.tenantId,
          role: "ADMIN",
        },
      });

      // Oppdater passord
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          emailVerified: new Date(),
        },
      });
    } else {
      // Oppdater eksisterende bruker
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          emailVerified: new Date(),
        },
      });
    }

    // Send aktiverings-e-post med klartekst-passord
    await sendEmail({
      to: validated.adminEmail,
      subject: `Velkommen til HMS Nova - ${tenant.name}`,
      html: `
        <h1>Velkommen til HMS Nova!</h1>
        <p>Din bedrift, <strong>${tenant.name}</strong>, er nå aktivert.</p>
        
        <h2>Påloggingsinformasjon</h2>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;">
            <strong>URL:</strong> <a href="${process.env.NEXT_PUBLIC_APP_URL}/login">${process.env.NEXT_PUBLIC_APP_URL}/login</a>
          </p>
          <p style="margin: 0 0 10px 0;">
            <strong>E-post:</strong> ${validated.adminEmail}
          </p>
          <p style="margin: 0;">
            <strong>Passord:</strong> <code style="background-color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${validated.adminPassword}</code>
          </p>
        </div>

        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px;">
            <strong>⚠️ Viktig:</strong> Vi anbefaler at du endrer dette passordet etter første innlogging. 
            Du kan gjøre dette under "Min profil" når du er logget inn.
          </p>
        </div>

        <p>Du har nå tilgang til systemet og kan begynne å bruke HMS Nova.</p>
        
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Logg inn nå
          </a>
        </p>

        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          Hvis du har spørsmål, kontakt oss på support@hmsnova.no
        </p>
        
        <p>Hilsen HMS Nova teamet</p>
      `,
    });

    revalidatePath(`/admin/tenants/${validated.tenantId}`);

    return { success: true };
  } catch (error) {
    console.error("Resend activation error:", error);
    if (error instanceof ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: "Kunne ikke sende aktiverings-e-post" };
  }
}

/**
 * Synk brukere fra en HMS Nova-tenant til Bransjekurs.no.
 * Kun mulig for tenants med bransjekursEnabled = true.
 */
export async function syncTenantToBransjekurs(tenantId: string) {
  try {
    const privilegedUser = await requirePrivilegedUser();
    if (!privilegedUser) {
      return { success: false, error: "Ingen tilgang" };
    }

    const baseUrl = process.env.BRANSJEKURS_INTERNAL_URL;
    const secret = process.env.INTERNAL_API_SECRET;

    if (!baseUrl || !secret) {
      return { success: false, error: "Bransjekurs-integrasjon er ikke konfigurert (mangler env-variabler)" };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        bransjekursEnabled: true,
        users: {
          select: {
            userId: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!tenant) {
      return { success: false, error: "Bedrift ikke funnet" };
    }

    if (!tenant.bransjekursEnabled) {
      return { success: false, error: "Bedriften har ikke aktiv kursavtale" };
    }

    const usersPayload = tenant.users.map((membership) => ({
      userId: membership.user.id,
      name: membership.user.name ?? membership.user.email,
      email: membership.user.email,
    }));

    if (usersPayload.length === 0) {
      return { success: false, error: "Ingen brukere å synke for denne bedriften" };
    }

    const response = await fetch(`${baseUrl}/api/internal/sync/company`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        tenantId: tenant.id,
        tenantName: tenant.name,
        users: usersPayload,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as { message?: string };
      return {
        success: false,
        error: errorBody.message ?? `Bransjekurs svarte med status ${response.status}`,
      };
    }

    const result = (await response.json()) as {
      synced: number;
      created: number;
      updated: number;
    };

    // Oppdater tidspunkt for siste vellykkede synk
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { bransjekursLastSyncAt: new Date() },
    });

    revalidatePath(`/admin/tenants/${tenantId}`);

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Sync tenant to bransjekurs error:", error);
    return { success: false, error: error.message ?? "Synk feilet" };
  }
}

/**
 * Aktiver eller deaktiver Bransjekurs.no-avtale for en tenant
 */
export async function toggleBransjekursAvtale(tenantId: string, enabled: boolean) {
  try {
    const privilegedUser = await requirePrivilegedUser();
    if (!privilegedUser) {
      return { success: false, error: "Ingen tilgang" };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    });

    if (!tenant) {
      return { success: false, error: "Bedrift ikke funnet" };
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        bransjekursEnabled: enabled,
        bransjekursActivatedAt: enabled ? new Date() : null,
      },
    });

    revalidatePath(`/admin/tenants/${tenantId}`);
    revalidatePath("/admin/tenants");

    return { success: true };
  } catch (error) {
    console.error("Toggle bransjekurs avtale error:", error);
    return { success: false, error: "Kunne ikke oppdatere kursavtale" };
  }
}

/**
 * Endre tenant-status
 */
export async function toggleTenantStatus(tenantId: string, newStatus: "ACTIVE" | "SUSPENDED" | "CANCELLED") {
  try {
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { status: newStatus },
    });

    revalidatePath(`/admin/tenants/${tenantId}`);
    revalidatePath("/admin/tenants");

    return { success: true, data: updatedTenant };
  } catch (error) {
    console.error("Toggle tenant status error:", error);
    return { success: false, error: "Kunne ikke endre status" };
  }
}

/**
 * Opprett ny tenant (CRM/Onboarding)
 */
export async function createTenant(input: z.infer<typeof createTenantSchema>) {
  try {
    const validated = createTenantSchema.parse(input);

    // Generer slug fra navn
    const slug = validated.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Sjekk at slug er unik
    const existingSlug = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      return { 
        success: false, 
        error: `En bedrift med slug "${slug}" eksisterer allerede. Vennligst endre bedriftsnavnet litt.` 
      };
    }

    // Opprett tenant med subscription
    const normalizedIndustry = validated.industry
      ? normalizeIndustryValue(validated.industry)
      : undefined;

    const tenant = await prisma.tenant.create({
      data: {
        name: validated.name,
        slug,
        orgNumber: validated.orgNumber,
        address: validated.address,
        postalCode: validated.postalCode,
        city: validated.city,
        contactPerson: validated.contactPerson,
        contactEmail: validated.contactEmail,
        contactPhone: validated.contactPhone,
        employeeCount: validated.employeeCount,
        industry: normalizedIndustry,
        notes: validated.notes,
        pricingTier: validated.pricingTier,
        salesRep: validated.salesRep,
        status: "TRIAL",
        onboardingStatus: "NOT_STARTED",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 dager
        // Standard HMS-oppsett
        hmsAnnualPlanEnabled: true,
        managementReviewFrequencyMonths: 12,
        // Subscription opprettes når tenant aktiveres
      },
    });

    await provisionIndustryPackage(tenant.id);

    revalidatePath("/admin/tenants");
    revalidatePath("/admin/registrations");

    return { 
      success: true, 
      data: tenant,
      message: "Bedrift opprettet. Du kan nå aktivere den ved å sende påloggingsinformasjon til admin." 
    };
  } catch (error) {
    console.error("Create tenant error:", error);
    if (error instanceof ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: "Kunne ikke opprette bedrift" };
  }
}

/**
 * Slett tenant permanent (inkludert alle filer i R2 Cloud)
 * ADVARSEL: Denne operasjonen kan ikke angres!
 */
export async function deleteTenant(tenantId: string, confirmationText: string) {
  try {
    const privilegedUser = await requirePrivilegedUser();
    if (!privilegedUser) {
      return { success: false, error: "Ingen tilgang" };
    }

    // Hent tenant først for å verifisere navn
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            users: true,
            documents: true,
            incidents: true,
            risks: true,
            trainings: true,
            audits: true,
            goals: true,
            chemicals: true,
            formTemplates: true,
            invoices: true,
          },
        },
      },
    });

    if (!tenant) {
      return { success: false, error: "Bedrift ikke funnet" };
    }

    // SIKKERHET: Verifiser at confirmationText matcher tenant.name
    if (confirmationText !== tenant.name) {
      return { 
        success: false, 
        error: `Bekreftelse mislyktes. Skriv inn bedriftsnavnet nøyaktig: "${tenant.name}"` 
      };
    }

    // SIKKERHET: Bare tillat sletting hvis status er CANCELLED eller SUSPENDED
    if (tenant.status === "ACTIVE" || tenant.status === "TRIAL") {
      return {
        success: false,
        error: "Kan ikke slette en aktiv bedrift. Endre status til CANCELLED eller SUSPENDED først.",
      };
    }

    console.log(`[DELETE TENANT] Starter sletting av tenant: ${tenant.name} (${tenantId})`);
    console.log(`[DELETE TENANT] Antall relaterte records:`, tenant._count);

    const tenantUserLinks = await prisma.userTenant.findMany({
      where: { tenantId },
      select: { userId: true },
    });
    const candidateUserIds = Array.from(new Set(tenantUserLinks.map((link) => link.userId)));

    // Steg 1: Slett alle filer i R2 Cloud
    console.log(`[DELETE TENANT] Sletter filer fra R2 Cloud...`);
    const fileResult = await deleteTenantFiles(tenantId);
    console.log(`[DELETE TENANT] R2 Cloud: ${fileResult.deleted} filer slettet, ${fileResult.errors} feil`);

    // Steg 2: Slett tenant + opprydding av bruker-kontoer som blir stående uten tenant
    console.log(`[DELETE TENANT] Sletter tenant fra database...`);
    const deleteResult = await prisma.$transaction(async (tx) => {
      await tx.tenant.delete({
        where: { id: tenantId },
      });

      if (candidateUserIds.length === 0) {
        return { deletedUsers: 0 };
      }

      const deletedUsers = await tx.user.deleteMany({
        where: {
          id: { in: candidateUserIds },
          isSuperAdmin: false,
          isSupport: false,
          tenants: {
            none: {},
          },
        },
      });

      return { deletedUsers: deletedUsers.count };
    });

    console.log(`[DELETE TENANT] ✅ Tenant slettet: ${tenant.name}`);
    console.log(`[DELETE TENANT] ✅ Slettet ${deleteResult.deletedUsers} fristilte brukerkontoer`);

    revalidatePath("/admin/tenants");
    revalidatePath("/admin/registrations");

    return {
      success: true,
      message: `Bedrift "${tenant.name}" og alle tilhørende data er permanent slettet. ${fileResult.deleted} filer fjernet fra R2 Cloud. ${deleteResult.deletedUsers} brukerkontoer ble også slettet.`,
      filesDeleted: fileResult.deleted,
      fileErrors: fileResult.errors,
      usersDeleted: deleteResult.deletedUsers,
    };
  } catch (error) {
    console.error("Delete tenant error:", error);
    return { 
      success: false, 
      error: "Kunne ikke slette bedrift. Se server-logg for detaljer." 
    };
  }
}
