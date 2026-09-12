import { prisma } from "@/lib/db";

export async function upsertCustomers(
  tenantId: string,
  customers: Array<{
    externalId: string;
    name: string;
    organizationNumber?: string | null;
    customerNumber?: string | null;
    email?: string | null;
    phone?: string | null;
    isInactive: boolean;
  }>
) {
  for (const c of customers) {
    await prisma.accountingCustomer.upsert({
      where: { tenantId_externalId: { tenantId, externalId: c.externalId } },
      create: {
        tenantId,
        externalId: c.externalId,
        name: c.name,
        organizationNumber: c.organizationNumber,
        customerNumber: c.customerNumber,
        email: c.email,
        phone: c.phone,
        isInactive: c.isInactive,
      },
      update: {
        name: c.name,
        organizationNumber: c.organizationNumber,
        customerNumber: c.customerNumber,
        email: c.email,
        phone: c.phone,
        isInactive: c.isInactive,
      },
    });
  }
}

export async function upsertProducts(
  tenantId: string,
  products: Array<{
    externalId: string;
    name: string;
    number?: string | null;
    unit?: string | null;
    categoryExternalId?: string | null;
    categoryName?: string | null;
    priceExclVat?: number | null;
    priceInclVat?: number | null;
    isStockItem: boolean;
    isInactive: boolean;
  }>
) {
  for (const p of products) {
    await prisma.accountingProduct.upsert({
      where: { tenantId_externalId: { tenantId, externalId: p.externalId } },
      create: {
        tenantId,
        externalId: p.externalId,
        name: p.name,
        number: p.number,
        unit: p.unit,
        categoryExternalId: p.categoryExternalId,
        categoryName: p.categoryName,
        priceExclVat: p.priceExclVat,
        priceInclVat: p.priceInclVat,
        isStockItem: p.isStockItem,
        isInactive: p.isInactive,
      },
      update: {
        name: p.name,
        number: p.number,
        unit: p.unit,
        categoryExternalId: p.categoryExternalId,
        categoryName: p.categoryName,
        priceExclVat: p.priceExclVat,
        priceInclVat: p.priceInclVat,
        isStockItem: p.isStockItem,
        isInactive: p.isInactive,
      },
    });
  }
}

export async function upsertSalaryTypes(
  tenantId: string,
  rows: Array<{
    externalId: string;
    name: string;
    number?: string | null;
    isInactive: boolean;
  }>
) {
  for (const s of rows) {
    await prisma.accountingSalaryType.upsert({
      where: { tenantId_externalId: { tenantId, externalId: s.externalId } },
      create: {
        tenantId,
        externalId: s.externalId,
        name: s.name,
        number: s.number,
        isInactive: s.isInactive,
      },
      update: {
        name: s.name,
        number: s.number,
        isInactive: s.isInactive,
      },
    });
  }
}

export async function upsertContacts(
  tenantId: string,
  rows: Array<{
    externalId: string;
    customerExternalId: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    isInactive: boolean;
  }>
) {
  for (const c of rows) {
    await prisma.accountingContact.upsert({
      where: { tenantId_externalId: { tenantId, externalId: c.externalId } },
      create: {
        tenantId,
        customerExternalId: c.customerExternalId,
        externalId: c.externalId,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        isInactive: c.isInactive,
      },
      update: {
        customerExternalId: c.customerExternalId,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        isInactive: c.isInactive,
      },
    });
  }
}
