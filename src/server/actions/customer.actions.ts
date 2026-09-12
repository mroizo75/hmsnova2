"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { brregClient } from "@/lib/brreg";
import { getAuthContext, requirePermission } from "@/lib/server-authorization";
import { getAccountingProvider, isAccountingEnabled } from "@/lib/accounting/factory";
import { upsertContacts, upsertCustomers } from "@/lib/accounting/cache";
import { enqueueAccountingJob } from "@/lib/accounting/sync";
import { findCustomerDuplicate } from "@/lib/time/customer-duplicate";

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

export async function searchBrregCompanies(query: string) {
  const ctx = await getAuthContext();
  if (!ctx) return [];
  const q = query.trim();
  if (q.length < 2) return [];
  if (/^\d{9}$/.test(q.replace(/\s/g, ""))) {
    const one = await brregClient.getEnhet(q.replace(/\s/g, ""));
    return one ? [one] : [];
  }
  return brregClient.searchEnheter(q, 10);
}

export async function createCustomerFromBrreg(input: {
  organizationNumber: string;
  name?: string;
  email?: string;
  phone?: string;
}) {
  try {
    const ctx = await requirePermission("canCreateFieldProject");
    const org = input.organizationNumber.replace(/\s/g, "");
    if (!/^\d{9}$/.test(org)) {
      return { success: false as const, error: "Organisasjonsnummer må være 9 siffer" };
    }

    const existing = await prisma.accountingCustomer.findMany({
      where: { tenantId: ctx.tenantId },
    });
    const duplicate = findCustomerDuplicate(existing, {
      organizationNumber: org,
      name: input.name,
      email: input.email,
      phone: input.phone,
    });
    if (duplicate) {
      return {
        success: false as const,
        error: `Kunden finnes allerede (${duplicate.name})`,
        duplicateExternalId: duplicate.externalId,
      };
    }

    const enhet = await brregClient.getEnhet(org);
    if (!enhet) {
      return { success: false as const, error: "Fant ikke enheten i Brønnøysund" };
    }

    const provider = await getAccountingProvider(ctx.tenantId);
    if (!provider) {
      const local = await prisma.accountingCustomer.create({
        data: {
          tenantId: ctx.tenantId,
          externalId: `local-${org}`,
          name: input.name?.trim() || enhet.navn,
          organizationNumber: org,
          email: input.email || enhet.epost || null,
          phone: input.phone || enhet.telefon || null,
        },
      });
      return { success: true as const, data: local };
    }

    const created = await provider.createCustomer({
      name: input.name?.trim() || enhet.navn,
      organizationNumber: org,
      email: input.email || enhet.epost || null,
      phone: input.phone || enhet.telefon || null,
    });
    await upsertCustomers(ctx.tenantId, [created]);
    revalidatePath("/dashboard/projects/new");
    revalidatePath("/ansatt/jobber/ny");
    return { success: true as const, data: created };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke opprette kunde") };
  }
}

export async function createCustomerContact(input: {
  customerExternalId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
}) {
  try {
    const ctx = await requirePermission("canCreateFieldProject");
    if (!input.firstName.trim()) {
      return { success: false as const, error: "Fornavn er påkrevd" };
    }
    const existing = await prisma.accountingContact.findMany({
      where: { tenantId: ctx.tenantId, customerExternalId: input.customerExternalId },
    });
    const email = input.email?.trim().toLowerCase();
    const phone = input.phone?.trim();
    const dup = existing.find(
      (c) =>
        (email && c.email?.toLowerCase() === email) ||
        (phone && c.phone === phone && (c.firstName ?? "").toLowerCase() === input.firstName.trim().toLowerCase())
    );
    if (dup) {
      return { success: false as const, error: "Kontakten finnes allerede" };
    }

    const provider = await getAccountingProvider(ctx.tenantId);
    if (!provider) {
      const local = await prisma.accountingContact.create({
        data: {
          tenantId: ctx.tenantId,
          customerExternalId: input.customerExternalId,
          externalId: `local-${Date.now()}`,
          firstName: input.firstName.trim(),
          lastName: input.lastName?.trim() || null,
          email: email || null,
          phone: phone || null,
        },
      });
      return { success: true as const, data: local };
    }

    const created = await provider.createContact({
      customerExternalId: input.customerExternalId,
      firstName: input.firstName.trim(),
      lastName: input.lastName?.trim() || null,
      email: email || null,
      phone: phone || null,
    });
    await upsertContacts(ctx.tenantId, [created]);
    return { success: true as const, data: created };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke opprette kontakt") };
  }
}

export async function listCustomerContacts(customerExternalId: string) {
  const ctx = await getAuthContext();
  if (!ctx) return [];
  return prisma.accountingContact.findMany({
    where: { tenantId: ctx.tenantId, customerExternalId, isInactive: false },
    orderBy: { lastName: "asc" },
  });
}

export async function createProjectWithOptionalCustomer(input: {
  name: string;
  reference?: string;
  startDate?: string;
  customerExternalId?: string;
  contactExternalId?: string;
  parentId?: string;
  location?: string;
  description?: string;
  jobKind?: "SERVICE" | "HMS";
}) {
  try {
    const ctx = await requirePermission("canCreateFieldProject");
    const tenant = await prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { accountingProvider: true },
    });

    let clientName: string | null = null;
    let externalCustomerId: string | null = input.customerExternalId || null;
    if (externalCustomerId) {
      const customer = await prisma.accountingCustomer.findUnique({
        where: { tenantId_externalId: { tenantId: ctx.tenantId, externalId: externalCustomerId } },
      });
      if (!customer) return { success: false as const, error: "Kunde ikke funnet" };
      clientName = customer.name;
    }

    if (input.parentId) {
      const parent = await prisma.project.findFirst({
        where: { id: input.parentId, tenantId: ctx.tenantId },
      });
      if (!parent) return { success: false as const, error: "Hovedprosjekt ikke funnet" };
      if (!externalCustomerId) {
        externalCustomerId = parent.externalCustomerId;
        clientName = parent.clientName;
      }
    }

    const project = await prisma.project.create({
      data: {
        tenantId: ctx.tenantId,
        name: input.name.trim(),
        orderNumber: input.reference?.trim() || null,
        clientName,
        location: input.location?.trim() || null,
        description: input.description?.trim() || null,
        status: "ACTIVE",
        startDate: input.startDate ? new Date(input.startDate) : new Date(),
        jobKind: input.jobKind ?? "HMS",
        billingStatus: "OPEN",
        externalCustomerId,
        contactExternalId: input.contactExternalId || null,
        parentId: input.parentId || null,
        createdById: ctx.userId,
      },
    });

    if (isAccountingEnabled(tenant?.accountingProvider)) {
      await enqueueAccountingJob({
        tenantId: ctx.tenantId,
        entityType: "Project",
        entityId: project.id,
        action: "CREATE_PROJECT",
        payload: { customerExternalId: externalCustomerId },
      });
    }

    revalidatePath("/dashboard/projects");
    revalidatePath("/ansatt/jobber");
    return { success: true as const, data: project };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke opprette prosjekt") };
  }
}
