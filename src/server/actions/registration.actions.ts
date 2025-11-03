"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { Resend } from "resend";
import { PricingTier, OnboardingStatus } from "@prisma/client";
import { getCustomerWelcomeEmail, getAdminNotificationEmail } from "@/lib/email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);

const registrationSchema = z.object({
  companyName: z.string().min(2, "Bedriftsnavn må være minst 2 tegn"),
  orgNumber: z.string().regex(/^[0-9\s]{9,11}$/, "Ugyldig organisasjonsnummer"),
  employeeCount: z.enum(["1-20", "21-50", "51+"]),
  industry: z.string().min(1, "Bransje er påkrevd"),
  contactPerson: z.string().min(2, "Kontaktperson er påkrevd"),
  contactEmail: z.string().email("Ugyldig e-postadresse"),
  contactPhone: z.string().min(8, "Ugyldig telefonnummer"),
  invoiceEmail: z.string().email("Ugyldig e-postadresse for faktura").optional().or(z.literal("")),
  useEHF: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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
      invoiceEmail: formData.get("invoiceEmail") as string,
      useEHF: formData.get("useEHF") as string | null,
      address: formData.get("address") as string | null,
      postalCode: formData.get("postalCode") as string | null,
      city: formData.get("city") as string | null,
      notes: formData.get("notes") as string | null,
    };

    const validated = registrationSchema.parse(data);

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

    // VIKTIG: Opprett KUN en "pending" tenant - INGEN subscription eller brukere før godkjenning!
    const tenant = await prisma.tenant.create({
      data: {
        name: validated.companyName,
        slug,
        orgNumber: validated.orgNumber,
        status: "TRIAL", // Status, men ingen aktiv tilgang ennå
        trialEndsAt: null, // Settes først når aktivert
        contactEmail: validated.contactEmail,
        contactPhone: validated.contactPhone,
        contactPerson: validated.contactPerson,
        address: validated.address || undefined,
        postalCode: validated.postalCode || undefined,
        city: validated.city || undefined,
        // Fakturainformasjon
        invoiceEmail: validated.invoiceEmail || validated.contactEmail,
        useEHF: validated.useEHF === "true",
        invoiceAddress: validated.useEHF === "true" ? undefined : validated.address,
        invoicePostalCode: validated.useEHF === "true" ? undefined : validated.postalCode,
        invoiceCity: validated.useEHF === "true" ? undefined : validated.city,
        // Bedriftsinformasjon
        employeeCount,
        pricingTier,
        industry: validated.industry,
        notes: validated.notes || undefined,
        onboardingStatus: "NOT_STARTED", // Venter på godkjenning
        // VIKTIG: subscription opprettes FØRST når superadmin aktiverer
        // VIKTIG: users opprettes FØRST når superadmin aktiverer
      },
    });

    // Get pricing info for email
    const yearlyPrice = pricingTier === "MICRO" ? 6000 : pricingTier === "SMALL" ? 8000 : 12000;

    // Send confirmation email to customer
    if (process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: "HMS Nova <noreply@hmsnova.com>",
          to: validated.contactEmail,
          subject: "Velkommen til HMS Nova - Din søknad er mottatt 🎉",
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
        // Don't fail the registration if email fails
      }
    }

    // Send notification to admin/support
    if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
      try {
        await resend.emails.send({
          from: "HMS Nova <noreply@hmsnova.com>",
          to: process.env.ADMIN_EMAIL,
          subject: `🎯 Ny registrering: ${validated.companyName}`,
          html: getAdminNotificationEmail({
            companyName: validated.companyName,
            orgNumber: validated.orgNumber,
            employeeCount: validated.employeeCount,
            industry: validated.industry,
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
            notes: validated.notes || undefined,
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

