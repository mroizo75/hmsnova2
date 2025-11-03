"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { FikenClient } from "@/lib/fiken";
import { deleteTenantFiles } from "@/lib/storage";
import { TenantStatus, SubscriptionPlan, BillingInterval, PricingTier } from "@prisma/client";
import { calculatePricingTier, getPriceForEmployeeCount } from "@/lib/pricing";
import { AuditLog } from "@/lib/audit-log";

const createTenantSchema = z.object({
  name: z.string().min(2, "Navn må være minst 2 tegn"),
  orgNumber: z.string().optional(),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  contactPerson: z.string().min(2, "Kontaktperson er påkrevd"),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  employeeCount: z.number().min(1),
  pricingTier: z.nativeEnum(PricingTier).optional(),
  industry: z.string(),
  notes: z.string().optional(),
  salesRep: z.string(),
  createInFiken: z.boolean().default(false),
});

export async function createTenant(input: z.infer<typeof createTenantSchema>) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.isSuperAdmin && !user?.isSupport) {
      return { success: false, error: "Ingen tilgang" };
    }

    const validated = createTenantSchema.parse(input);

    // Generer slug fra bedriftsnavn
    const slug = validated.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Sjekk om slug allerede eksisterer
    const existing = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (existing) {
      // Legg til timestamp for å gjøre den unik
      const uniqueSlug = `${slug}-${Date.now()}`;
      return { success: false, error: `Slug "${slug}" er allerede i bruk. Foreslår: ${uniqueSlug}` };
    }

    // Beregn pricing tier og pris
    const pricingTier = validated.pricingTier || calculatePricingTier(validated.employeeCount);
    const yearlyPrice = getPriceForEmployeeCount(validated.employeeCount, true);

    let fikenCompanyId: string | undefined;

    // Opprett kunde i Fiken hvis ønsket
    if (validated.createInFiken && process.env.FIKEN_API_TOKEN && process.env.FIKEN_COMPANY_SLUG) {
      try {
        const fikenClient = new FikenClient({
          apiToken: process.env.FIKEN_API_TOKEN,
          companySlug: process.env.FIKEN_COMPANY_SLUG,
        });

        const fikenCustomer = await fikenClient.createCustomer({
          name: validated.name,
          organizationNumber: validated.orgNumber,
          email: validated.contactEmail,
          phone: validated.contactPhone,
          address: {
            streetAddress: validated.address,
            city: validated.city,
            postalCode: validated.postalCode,
            country: "NO",
          },
        }) as any;

        fikenCompanyId = fikenCustomer?.contactId;
      } catch (error) {
        console.error("Fiken error:", error);
        // Fortsett selv om Fiken feiler
      }
    }

    // Opprett tenant med subscription og CRM-data
    const tenant = await prisma.tenant.create({
      data: {
        name: validated.name,
        slug,
        orgNumber: validated.orgNumber,
        contactEmail: validated.contactEmail,
        contactPhone: validated.contactPhone,
        contactPerson: validated.contactPerson,
        address: validated.address,
        city: validated.city,
        postalCode: validated.postalCode,
        fikenCompanyId,
        // CRM/Onboarding fields
        employeeCount: validated.employeeCount,
        pricingTier,
        industry: validated.industry,
        notes: validated.notes,
        salesRep: validated.salesRep,
        onboardingStatus: "NOT_STARTED",
        status: "TRIAL",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 dager
        subscription: {
          create: {
            plan: pricingTier === "MICRO" || pricingTier === "SMALL" ? "STARTER" : pricingTier === "MEDIUM" ? "PROFESSIONAL" : "ENTERPRISE",
            price: yearlyPrice,
            billingInterval: "YEARLY",
            status: "TRIAL",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        },
      },
      include: {
        subscription: true,
      },
    });

    // Audit log
    await AuditLog.log(
      "superadmin",
      user.id,
      "TENANT_CREATED",
      "Tenant",
      tenant.id,
      {
        name: tenant.name,
        employeeCount: validated.employeeCount,
        pricingTier,
        yearlyPrice,
        salesRep: validated.salesRep,
      }
    );

    return { success: true, data: tenant };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Ugyldig data: " + error.issues.map((e: any) => e.message).join(", ") };
    }
    console.error("Create tenant error:", error);
    return { success: false, error: error.message || "Noe gikk galt" };
  }
}

const updateTenantStatusSchema = z.object({
  tenantId: z.string().cuid(),
  status: z.nativeEnum(TenantStatus),
});

export async function updateTenantStatus(input: z.infer<typeof updateTenantStatusSchema>) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.isSuperAdmin) {
      return { success: false, error: "Ingen tilgang" };
    }

    const validated = updateTenantStatusSchema.parse(input);

    const tenant = await prisma.tenant.update({
      where: { id: validated.tenantId },
      data: { status: validated.status },
    });

    return { success: true, data: tenant };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Ugyldig data" };
    }
    console.error("Update tenant status error:", error);
    return { success: false, error: "Noe gikk galt" };
  }
}

export async function deleteTenant(tenantId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.isSuperAdmin) {
      return { success: false, error: "Ingen tilgang" };
    }

    // Slett alle filer fra storage (R2/lokal)
    console.log(`Sletter filer for tenant ${tenantId}...`);
    const fileResult = await deleteTenantFiles(tenantId);
    console.log(`Slettet ${fileResult.deleted} filer, ${fileResult.errors} feil`);

    // Slett tenant fra database (cascade vil slette relaterte data)
    await prisma.tenant.delete({
      where: { id: tenantId },
    });

    return { 
      success: true, 
      data: { 
        filesDeleted: fileResult.deleted,
        fileErrors: fileResult.errors,
      } 
    };
  } catch (error) {
    console.error("Delete tenant error:", error);
    return { success: false, error: "Kunne ikke slette tenant" };
  }
}

export async function syncAllInvoices() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.isSuperAdmin) {
      return { success: false, error: "Ingen tilgang" };
    }

    const tenants = await prisma.tenant.findMany({
      where: {
        fikenCompanyId: { not: null },
      },
    });

    const { syncInvoiceStatus } = await import("@/lib/fiken");

    let syncedCount = 0;
    for (const tenant of tenants) {
      try {
        await syncInvoiceStatus(tenant.id);
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync tenant ${tenant.id}:`, error);
      }
    }

    return { 
      success: true, 
      data: { 
        syncedCount, 
        totalCount: tenants.length 
      } 
    };
  } catch (error) {
    console.error("Sync all invoices error:", error);
    return { success: false, error: "Noe gikk galt" };
  }
}
