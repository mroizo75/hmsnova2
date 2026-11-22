export const PRODUCT_UPDATE_KINDS = ["NEW_FEATURE", "IMPROVEMENT", "PLANNED", "FIX"] as const;

export type ProductUpdateKindValue = (typeof PRODUCT_UPDATE_KINDS)[number];

export const PRODUCT_UPDATE_KIND_LABELS: Record<ProductUpdateKindValue, string> = {
  NEW_FEATURE: "Ny funksjon",
  IMPROVEMENT: "Forbedret",
  PLANNED: "Planlagt",
  FIX: "Rettet",
};

export function isProductUpdateKind(value: string): value is ProductUpdateKindValue {
  return (PRODUCT_UPDATE_KINDS as readonly string[]).includes(value);
}

export function productUpdateNotificationTitle(kind: ProductUpdateKindValue, title: string): string {
  return `${PRODUCT_UPDATE_KIND_LABELS[kind]}: ${title.trim()}`;
}

export function productUpdateExcerpt(body: string, max = 160): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).trimEnd()}…`;
}
