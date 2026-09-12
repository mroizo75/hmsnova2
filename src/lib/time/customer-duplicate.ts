export type CustomerDuplicateInput = {
  organizationNumber?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type CachedCustomer = {
  externalId: string;
  organizationNumber?: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
};

function normOrg(value?: string | null): string {
  return (value ?? "").replace(/\s/g, "");
}

function normText(value?: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

export function findCustomerDuplicate(
  existing: CachedCustomer[],
  input: CustomerDuplicateInput
): CachedCustomer | null {
  const org = normOrg(input.organizationNumber);
  if (org) {
    const byOrg = existing.find((c) => normOrg(c.organizationNumber) === org);
    if (byOrg) return byOrg;
  }

  const name = normText(input.name);
  const phone = normText(input.phone);
  const email = normText(input.email);
  if (!name) return null;

  return (
    existing.find((c) => {
      if (normText(c.name) !== name) return false;
      if (phone && normText(c.phone) === phone) return true;
      if (email && normText(c.email) === email) return true;
      return false;
    }) ?? null
  );
}
