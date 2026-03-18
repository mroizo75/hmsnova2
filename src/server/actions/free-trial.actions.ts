"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createGeneratedDocument, generateDocuments, importGeneratedDocumentsToTenant } from "@/server/actions/generator.actions";
import type { CompleteGeneratorData } from "@/features/document-generator/schemas/generator.schema";
import { getBindingPrice } from "@/lib/subscription";
import { provisionIndustryPackage } from "@/server/actions/industry-provision.actions";

const freeTrialSignupSchema = z.object({
  companyName: z.string().min(2, "Bedriftsnavn må være minst 2 tegn"),
  email: z.string().email("Ugyldig e-postadresse"),
  password: z.string().min(8, "Passord må være minst 8 tegn"),
  name: z.string().min(2, "Navn må være minst 2 tegn").optional(),
});

const TRIAL_DAYS = 14;
const YEARLY_PRICE = getBindingPrice("1year").yearlyPrice;

/**
 * Bygger minimal generator-data for gratis-prøve fra signup-feltene.
 * Brukes for å generere HMS-pakken med vannmerke.
 */
function buildFreeTrialGeneratorData(input: {
  companyName: string;
  email: string;
  name?: string;
}): CompleteGeneratorData {
  const displayName = input.name?.trim() || input.email.split("@")[0] || "Bruker";
  return {
    step1: {
      companyName: input.companyName,
      email: input.email,
      ceoName: displayName,
      employeeRange: "6-20",
      orgNumber: "",
      address: undefined,
      postalCode: undefined,
      city: undefined,
      phone: undefined,
    },
    step2: {
      industry: "OTHER",
      companyDescription: undefined,
    },
    step3: {
      hmsIsCeo: true,
      hmsResponsible: displayName,
      hmsEmail: "",
      hmsPhone: "",
      hasSafetyRep: false,
      safetyRep: undefined,
      safetyRepEmail: "",
      safetyRepPhone: "",
      hasBHT: false,
      bhtProvider: undefined,
      bhtContact: undefined,
      departments: [],
    },
    step4: {
      hasHMSIntroduction: true,
      hasAnnualTraining: false,
      hasNoSystematicTraining: false,
      completedTraining: [],
      firstAidCount: "0",
      lastFirstAidDate: undefined,
    },
    step5: {
      confirmEmail: input.email,
      acceptPrivacy: true,
      marketingConsent: false,
    },
  };
}

/**
 * Oppretter gratis 14-dagers HMS-tenant med:
 * - Tenant (FREE_14_DAY), Subscription (14 dager), Admin-bruker
 * - Generert HMS-pakke (vannmerkede PDF-er) som lastes opp og importeres som Document
 * Brukeren kan bruke systemet (avvik, risikovurdering osv.) og se dokumentene med vannmerke.
 */
export async function createFreeTrialTenant(
  formData: FormData
): Promise<
  | { success: true; message: string }
  | { success: false; error: string }
> {
  try {
    const raw = {
      companyName: formData.get("companyName") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      name: (formData.get("name") as string) || undefined,
    };
    const validated = freeTrialSignupSchema.parse(raw);

    const normalizedEmail = validated.email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { tenants: { include: { tenant: true } } },
    });
    if (existingUser?.tenants.some((t) => (t.tenant as { registrationType?: string }).registrationType === "FREE_14_DAY")) {
      return {
        success: false,
        error: "Denne e-postadressen har allerede en gratis prøvekonto. Logg inn eller bruk en annen e-post.",
      };
    }

    const baseSlug = validated.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const existingSlug = await prisma.tenant.findUnique({ where: { slug: baseSlug } });
    const slug = existingSlug ? `${baseSlug}-${Date.now()}` : baseSlug;

    const trialEnd = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const hashedPassword = await bcrypt.hash(validated.password, 10);
    const displayName = validated.name?.trim() || normalizedEmail.split("@")[0] || "Bruker";

    const tenant = await prisma.tenant.create({
      data: {
        name: validated.companyName,
        slug,
        status: "TRIAL",
        trialEndsAt: trialEnd,
        contactEmail: normalizedEmail,
        contactPerson: displayName,
        employeeCount: 13,
        pricingTier: "MICRO",
        industry: "OTHER",
        onboardingStatus: "ADMIN_CREATED",
        onboardingCompletedAt: new Date(),
        registrationType: "FREE_14_DAY",
      },
    });

    await provisionIndustryPackage(tenant.id);

    const subscription = await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        plan: "STARTER",
        price: YEARLY_PRICE,
        billingInterval: "YEARLY",
        status: "TRIAL",
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEnd,
      },
    });

    let adminUser: { id: string };
    if (existingUser) {
      await prisma.userTenant.create({
        data: {
          userId: existingUser.id,
          tenantId: tenant.id,
          role: "ADMIN",
        },
      });
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { password: hashedPassword, name: displayName },
      });
      adminUser = { id: existingUser.id };
    } else {
      const created = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: displayName,
          password: hashedPassword,
          emailVerified: new Date(),
          tenants: {
            create: {
              tenantId: tenant.id,
              role: "ADMIN",
            },
          },
        },
      });
      adminUser = { id: created.id };
    }

    const generatorData = buildFreeTrialGeneratorData({
      companyName: validated.companyName,
      email: normalizedEmail,
      name: displayName,
    });

    const createResult = await createGeneratedDocument(generatorData, {
      isFreeTrialPackage: true,
      tenantId: tenant.id,
    });
    if (!createResult.success || !createResult.data?.id) {
      return {
        success: false,
        error: createResult.error || "Kunne ikke opprette HMS-pakke",
      };
    }

    const docId = createResult.data.id;
    const genResult = await generateDocuments(docId);
    if (!genResult.success) {
      return {
        success: false,
        error: genResult.error || "Kunne ikke generere HMS-dokumenter",
      };
    }

    const importResult = await importGeneratedDocumentsToTenant(
      tenant.id,
      docId,
      adminUser.id
    );
    if (!importResult.success && "error" in importResult) {
      return {
        success: false,
        error: importResult.error || "Kunne ikke importere dokumenter til bedriften",
      };
    }

    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`;
    return {
      success: true,
      message: `Konto opprettet. Du kan logge inn med ${normalizedEmail}. Du har ${TRIAL_DAYS} dager gratis – deretter 300 kr/mnd for å fortsette.`,
    };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues.map((e) => e.message).join(". "),
      };
    }
    console.error("Create free trial tenant error:", error);
    return {
      success: false,
      error: error.message || "Kunne ikke opprette gratis prøvekonto",
    };
  }
}
