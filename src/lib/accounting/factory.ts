import { prisma } from "@/lib/db";
import { decryptField } from "@/lib/field-encryption";
import type { AccountingProvider } from "./provider";
import { TripletexAdapter } from "./tripletex/adapter";
import { TripletexClient } from "./tripletex/client";
import { FikenAccountingAdapter } from "./fiken/adapter";

export function isAccountingEnabled(provider: string | null | undefined): boolean {
  return provider === "TRIPLETEX" || provider === "FIKEN";
}

export async function getAccountingProvider(tenantId: string): Promise<AccountingProvider | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      accountingProvider: true,
      tripletexEmployeeToken: true,
    },
  });

  if (!tenant || tenant.accountingProvider === "NONE") return null;

  if (tenant.accountingProvider === "FIKEN") {
    return new FikenAccountingAdapter();
  }

  if (!tenant.tripletexEmployeeToken) return null;
  const employeeToken = decryptField(tenant.tripletexEmployeeToken);
  const client = new TripletexClient(tenantId, employeeToken);
  return new TripletexAdapter(client);
}

export async function getTripletexAdapterForToken(
  tenantId: string,
  employeeTokenPlain: string
): Promise<TripletexAdapter> {
  const client = new TripletexClient(tenantId, employeeTokenPlain);
  return new TripletexAdapter(client);
}
