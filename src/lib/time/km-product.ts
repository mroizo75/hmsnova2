export type CarKind = "COMPANY" | "PRIVATE";

/**
 * Km-produkt til Tripletex-ordre (fakturagrunnlag).
 * Privatbil: kilometergodtgjørelse, trekkfri 3,50 kr/km i 2026
 * (forskrift 7. nov 2025 nr. 2216 § 4). Overskudd over trekkfri sats
 * er skattepliktig hvis bedriften bruker høyere sats.
 * Firmabil: skatteloven § 5-13 — ingen km-godtgjørelse til ansatt;
 * km kan likevel faktureres kunden.
 */
export function kmProductExternalId(input: {
  kmTaxable: boolean;
  taxableProductId: string | null | undefined;
  nonTaxableProductId: string | null | undefined;
}): string | null {
  if (input.kmTaxable) {
    return input.taxableProductId ?? null;
  }
  return input.nonTaxableProductId || input.taxableProductId || null;
}

export function kmTaxableForCar(input: {
  carKind: CarKind;
  tenantKmAllowanceTaxable: boolean;
}): boolean {
  if (input.carKind === "COMPANY") return false;
  return input.tenantKmAllowanceTaxable;
}

export function pickDefaultKmProducts(
  products: Array<{ externalId: string; name: string; unit?: string | null }>
): { taxable: string | null; nonTaxable: string | null } {
  const usable = products.filter((row) => row.externalId && row.name.trim());
  const kmLike = usable.filter((row) => {
    const name = row.name.toLowerCase();
    const unit = (row.unit ?? "").toLowerCase();
    return (
      unit === "km" ||
      name.includes("km") ||
      name.includes("kilometer") ||
      name.includes("kjøring") ||
      name.includes("kjoring") ||
      name.includes("kjøregodtg") ||
      name.includes("reise")
    );
  });
  if (kmLike.length === 0) {
    return { taxable: null, nonTaxable: null };
  }
  const nonTaxable =
    kmLike.find((row) => /ikke.?skatt|trekkfri|skattefri|nontax/i.test(row.name))?.externalId ?? null;
  const taxable =
    kmLike.find((row) => /skattbar|skatteplikt|taxable/i.test(row.name) && row.externalId !== nonTaxable)
      ?.externalId ??
    kmLike.find((row) => row.externalId !== nonTaxable)?.externalId ??
    kmLike[0].externalId;
  return { taxable, nonTaxable: nonTaxable ?? taxable };
}

export function buildKmRegistration(input: {
  carKind: CarKind;
  tenantKmAllowanceTaxable: boolean;
  taxableProductId: string | null | undefined;
  nonTaxableProductId: string | null | undefined;
  defaultKmRate: number | null | undefined;
  productName?: string | null;
  productPrice?: number | null;
}): {
  isPrivateCar: boolean;
  kmTaxable: boolean;
  productExternalId: string;
  productName: string;
  unitPrice: number | null;
  createMileage: boolean;
} {
  const isPrivateCar = input.carKind === "PRIVATE";
  const kmTaxable = kmTaxableForCar({
    carKind: input.carKind,
    tenantKmAllowanceTaxable: input.tenantKmAllowanceTaxable,
  });
  const productExternalId =
    kmProductExternalId({
      kmTaxable,
      taxableProductId: input.taxableProductId,
      nonTaxableProductId: input.nonTaxableProductId,
    }) || "km";
  return {
    isPrivateCar,
    kmTaxable,
    productExternalId,
    productName: input.productName ?? (isPrivateCar ? "Km privatbil" : "Km firmabil"),
    unitPrice: input.productPrice ?? input.defaultKmRate ?? null,
    createMileage: isPrivateCar,
  };
}
