export function tokenizeProductQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
}

/** AND-søk: alle ord må finnes i navn, nummer eller kategori. */
export function productMatchesAndQuery(
  product: { name: string; number?: string | null; categoryName?: string | null },
  query: string
): boolean {
  const words = tokenizeProductQuery(query);
  if (words.length === 0) return true;
  const hay = [product.name, product.number ?? "", product.categoryName ?? ""]
    .join(" ")
    .toLowerCase();
  return words.every((word) => hay.includes(word));
}

export function filterProductsByAndQuery<
  T extends { name: string; number?: string | null; categoryName?: string | null },
>(products: T[], query: string): T[] {
  return products.filter((p) => productMatchesAndQuery(p, query));
}
