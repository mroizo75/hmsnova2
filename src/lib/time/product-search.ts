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

export function uniqueProductCategories(
  products: Array<{ categoryName?: string | null }>
): string[] {
  return [...new Set(products.map((p) => p.categoryName).filter((c): c is string => Boolean(c)))].sort(
    (a, b) => a.localeCompare(b, "nb")
  );
}

export function filterProductsByCategory<T extends { categoryName?: string | null }>(
  products: T[],
  category: string | null | undefined
): T[] {
  if (!category) return products;
  return products.filter((p) => p.categoryName === category);
}
