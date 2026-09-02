"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { Resend } from "resend";
import { PricingTier } from "@prisma/client";
import {
  getActivationEmail,
  getContractAcceptanceEmail,
  getCustomerWelcomeEmail,
  getAdminNotificationEmail,
} from "@/lib/email-templates";
import { getBindingPrice } from "@/lib/subscription";
import {
  ACTIVATION_TOKEN_EXPIRY_HOURS,
  createPasswordResetToken,
} from "@/lib/password-reset";
import {
  getIndustryLabel,
  isSupportedIndustry,
  normalizeIndustryValue,
} from "@/lib/industry-packages";
import { provisionIndustryPackage } from "@/server/actions/industry-provision.actions";
import { brregClient } from "@/lib/brreg";
import { getSubIndustryFromNace } from "@/lib/nace-mapping";
import {
  CONTRACT_BINDING_LABEL,
  CONTRACT_DOCUMENT_VERSION,
  CONTRACT_TERMS_LABEL,
  CONTRACT_WITHDRAWAL_LABEL,
  getBindingStart,
  getWithdrawalDeadline,
} from "@/lib/contract-terms";

const resend = new Resend(process.env.RESEND_API_KEY);

const registrationSchema = z.object({
  companyName: z.string().min(2, "Bedriftsnavn må være minst 2 tegn"),
  orgNumber: z.string().regex(/^[0-9\s]{9,11}$/, "Ugyldig organisasjonsnummer"),
  employeeCount: z.enum(["1-20", "21-50", "51+"]),
  industry: z
    .string()
    .min(1, "Bransje er påkrevd")
    .refine((value) => isSupportedIndustry(value), "Ugyldig bransje"),
  contactPerson: z.string().min(2, "Kontaktperson er påkrevd"),
  contactEmail: z.string().email("Ugyldig e-postadresse"),
  contactPhone: z.string().min(8, "Ugyldig telefonnummer"),
  farmType: z.string().optional(),
  invoiceEmail: z.string().email("Ugyldig e-postadresse for faktura").optional().or(z.literal("")),
  useEHF: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // Avtaleaksept — begge må være "true" for at registrering skal godtas
  acceptedTerms: z.literal("true", { message: "Du må godta abonnementsavtalen." }),
  acceptedAngrerrett: z.literal("true", {
    message: "Du må bekrefte at du har lest angreretten.",
  }),
  acceptedBinding: z.literal("true", {
    message: "Du må bekrefte 12 måneders binding og 3 måneders oppsigelse.",
  }),
  registrationSource: z.string().optional(),
});

function calculatePricingTier(employeeCount: string): PricingTier {
  switch (employeeCount) {
    case "1-20":
      return "MICRO";
    case "21-50":
      return "SMALL";
    case "51+":
      return "MEDIUM";
    default:
      return "MICRO";
  }
}

function calculateEmployeeCount(range: string): number {
  switch (range) {
    case "1-20":
      return 10; // Gjennomsnitt
    case "21-50":
      return 35; // Gjennomsnitt
    case "51+":
      return 75; // Gjennomsnitt
    default:
      return 10;
  }
}

export async function submitRegistrationRequest(formData: FormData) {
  try {
    // Parse and validate
    const data = {
      companyName: formData.get("companyName") as string,
      orgNumber: (formData.get("orgNumber") as string).replace(/\s/g, ""),
      employeeCount: formData.get("employeeCount") as string,
      industry: formData.get("industry") as string,
      contactPerson: formData.get("contactPerson") as string,
      contactEmail: formData.get("contactEmail") as string,
      contactPhone: formData.get("contactPhone") as string,
      farmType: (formData.get("farmType") as string) || undefined,
      invoiceEmail: formData.get("invoiceEmail") as string,
      useEHF: formData.get("useEHF") as string | null,
      address: formData.get("address") as string | null,
      postalCode: formData.get("postalCode") as string | null,
      city: formData.get("city") as string | null,
      notes: formData.get("notes") as string | null,
      acceptedTerms: formData.get("acceptedTerms") as string,
      acceptedAngrerrett: formData.get("acceptedAngrerrett") as string,
      acceptedBinding: formData.get("acceptedBinding") as string,
      registrationSource: (formData.get("registrationSource") as string) || "registrer-bedrift",
    };

    const validated = registrationSchema.parse(data);
    const normalizedIndustry = normalizeIndustryValue(validated.industry);
    const farmTypeNote =
      normalizedIndustry === "agriculture" && validated.farmType
        ? `Gårdstype: ${validated.farmType}`
        : undefined;
    const mergedNotes = [validated.notes || "", farmTypeNote || ""]
      .filter((part) => part.trim().length > 0)
      .join("\n");

    // Check if org number already exists
    const existingTenant = await prisma.tenant.findFirst({
      where: {
        orgNumber: validated.orgNumber,
      },
    });

    if (existingTenant) {
      return {
        success: false,
        error: "Denne bedriften er allerede registrert. Ta kontakt med oss hvis du har glemt innloggingsinformasjon.",
      };
    }

    // Generate slug from company name
    const baseSlug = validated.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if slug exists, if so add timestamp
    const existingSlug = await prisma.tenant.findUnique({
      where: { slug: baseSlug },
    });

    const slug = existingSlug ? `${baseSlug}-${Date.now()}` : baseSlug;

    // Calculate pricing
    const pricingTier = calculatePricingTier(validated.employeeCount);
    const employeeCount = calculateEmployeeCount(validated.employeeCount);
    const yearlyPrice = getBindingPrice("1year").yearlyPrice;
    const acceptedAt = new Date();
    const withdrawalDeadlineAt = getWithdrawalDeadline(acceptedAt);
    const bindingStartsAt = getBindingStart(acceptedAt);
    const requestHeaders = await headers();
    const ipAddress =
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      requestHeaders.get("x-real-ip") ||
      null;
    const userAgent = requestHeaders.get("user-agent");

    const normalizedEmail = validated.contactEmail.toLowerCase().trim();

    // Auto-aktivering: opprett tenant + admin-bruker + subscription i én transaksjon
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: validated.companyName,
          slug,
          orgNumber: validated.orgNumber,
          status: "ACTIVE",
          trialEndsAt: withdrawalDeadlineAt,
          withdrawalDeadlineAt,
          bindingStartsAt,
          contactEmail: validated.contactEmail,
          contactPhone: validated.contactPhone,
          contactPerson: validated.contactPerson,
          address: validated.address || undefined,
          postalCode: validated.postalCode || undefined,
          city: validated.city || undefined,
          invoiceEmail: validated.invoiceEmail || validated.contactEmail,
          useEHF: validated.useEHF === "true",
          invoiceAddress: validated.useEHF === "true" ? undefined : validated.address,
          invoicePostalCode: validated.useEHF === "true" ? undefined : validated.postalCode,
          invoiceCity: validated.useEHF === "true" ? undefined : validated.city,
          employeeCount,
          pricingTier,
          industry: normalizedIndustry,
          notes: mergedNotes || undefined,
          onboardingStatus: "ADMIN_CREATED",
          onboardingCompletedAt: new Date(),
          registrationType: "STANDARD",
          termsAcceptedAt: acceptedAt,
          angrerrettInfoAt: acceptedAt,
          contractAcceptedIp: ipAddress,
          contractAcceptedUa: userAgent,
          contractDocumentVersion: CONTRACT_DOCUMENT_VERSION,
        },
      });

      await tx.contractAcceptance.create({
        data: {
          tenantId: tenant.id,
          acceptedAt,
          source: validated.registrationSource || "registrer-bedrift",
          ipAddress,
          userAgent,
          companyName: validated.companyName,
          orgNumber: validated.orgNumber,
          contactPerson: validated.contactPerson,
          contactEmail: normalizedEmail,
          documentVersion: CONTRACT_DOCUMENT_VERSION,
          withdrawalLabel: CONTRACT_WITHDRAWAL_LABEL,
          bindingLabel: CONTRACT_BINDING_LABEL,
          termsLabel: CONTRACT_TERMS_LABEL,
          acceptedWithdrawal: true,
          acceptedBinding: true,
          acceptedTerms: true,
          withdrawalDeadlineAt,
          bindingStartsAt,
          yearlyPrice,
        },
      });

      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          plan: "PROFESSIONAL",
          price: yearlyPrice,
          billingInterval: "YEARLY",
          status: "ACTIVE",
          currentPeriodStart: bindingStartsAt,
          currentPeriodEnd: new Date(bindingStartsAt.getTime() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      const existingUser = await tx.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        await tx.userTenant.create({
          data: {
            userId: existingUser.id,
            tenantId: tenant.id,
            role: "ADMIN",
          },
        });
        return { tenant, isExistingUser: true, userId: existingUser.id };
      }

      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: validated.contactPerson,
          password: null,
          emailVerified: null,
          tenants: {
            create: { tenantId: tenant.id, role: "ADMIN" },
          },
        },
      });

      return { tenant, isExistingUser: false, userId: user.id };
    });

    const { tenant, isExistingUser, userId } = result;

    // NACE-kode fra Brreg (best-effort)
    try {
      const enhet = await brregClient.getEnhet(validated.orgNumber);
      if (enhet?.naeringskode1) {
        const naceCode = enhet.naeringskode1.kode;
        const naceDescription = enhet.naeringskode1.beskrivelse;
        const subIndustry = getSubIndustryFromNace(naceCode);
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            naceCode,
            naceDescription,
            ...(subIndustry ? { subIndustry } : {}),
          },
        });
      }
    } catch {
      // NACE-oppslag er ikke kritisk
    }

    await provisionIndustryPackage(tenant.id);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://hmsnova.no";
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "HMS Nova <noreply@hmsnova.no>";

    if (!isExistingUser) {
      const tokenResult = await createPasswordResetToken(
        userId,
        undefined,
        undefined,
        ACTIVATION_TOKEN_EXPIRY_HOURS,
      );
      if (process.env.RESEND_API_KEY && "token" in tokenResult) {
        const activationUrl = `${appUrl}/aktiver-konto?token=${tokenResult.token}`;
        try {
          await resend.emails.send({
            from: fromEmail,
            to: validated.contactEmail,
            subject: "Aktiver din HMS Nova-konto",
            html: getActivationEmail({
              contactPerson: validated.contactPerson,
              companyName: validated.companyName,
              activationUrl,
            }),
          });
        } catch (emailError) {
          console.error("Failed to send activation email:", emailError);
        }
      }
    } else if (process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: fromEmail,
          to: validated.contactEmail,
          subject: "Ny bedrift lagt til i HMS Nova",
          html: getCustomerWelcomeEmail({
            contactPerson: validated.contactPerson,
            companyName: validated.companyName,
            orgNumber: validated.orgNumber,
            employeeCount: validated.employeeCount,
            pricingTier,
            yearlyPrice,
          }),
        });
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
      }
    }

    if (process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: fromEmail,
          to: validated.contactEmail,
          subject: `Avtalebekreftelse: ${validated.companyName} – HMS Nova`,
          html: getContractAcceptanceEmail({
            contactPerson: validated.contactPerson,
            companyName: validated.companyName,
            orgNumber: validated.orgNumber,
            acceptedAt,
            withdrawalDeadlineAt,
            bindingStartsAt,
            yearlyPrice,
            documentVersion: CONTRACT_DOCUMENT_VERSION,
          }),
        });
      } catch (emailError) {
        console.error("Failed to send contract acceptance email:", emailError);
      }
    }

    // Varsle admin
    if (process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? "HMS Nova <noreply@hmsnova.no>",
          to: "kenneth@kksas.no",
          subject: `🎯 Ny kunde registrert: ${validated.companyName}`,
          html: getAdminNotificationEmail({
            companyName: validated.companyName,
            orgNumber: validated.orgNumber,
            employeeCount: validated.employeeCount,
            industry: getIndustryLabel(normalizedIndustry),
            pricingTier,
            yearlyPrice,
            contactPerson: validated.contactPerson,
            contactEmail: validated.contactEmail,
            contactPhone: validated.contactPhone,
            useEHF: !!validated.useEHF,
            invoiceEmail: validated.invoiceEmail,
            address: validated.address || undefined,
            postalCode: validated.postalCode || undefined,
            city: validated.city || undefined,
            notes: mergedNotes || undefined,
            tenantId: tenant.id,
          }),
        });
      } catch (emailError) {
        console.error("Failed to send admin notification:", emailError);
      }
    }

    return { success: true, data: { tenantId: tenant.id } };
  } catch (error: any) {
    console.error("Registration error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues.map((e) => e.message).join(", "),
      };
    }

    return {
      success: false,
      error: "En uventet feil oppstod. Prøv igjen senere.",
    };
  }
}

