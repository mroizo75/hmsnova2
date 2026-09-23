export type DocumentAttentionInput = {
  nextReviewDate?: Date | string | null;
  effectiveTo?: Date | string | null;
};

export type DocumentSortMode = "red" | "number" | "origin";

function toTime(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? null : time;
}

/** IK-HMS § 5: styrende dokumenter og avtaler skal holdes gjeldende. */
export function isDocumentAttention(doc: DocumentAttentionInput, now = new Date()): boolean {
  const nowTime = now.getTime();
  const review = toTime(doc.nextReviewDate);
  const effectiveTo = toTime(doc.effectiveTo);
  if (review !== null && review < nowTime) return true;
  if (effectiveTo !== null && effectiveTo < nowTime) return true;
  return false;
}

export function parseDocumentSort(value: string | null | undefined): DocumentSortMode {
  if (value === "number" || value === "origin" || value === "red") return value;
  return "red";
}

function createdTime(value: Date | string): number {
  return toTime(value) ?? 0;
}

export function compareDocuments<
  T extends DocumentAttentionInput & { title: string; createdAt: Date | string },
>(a: T, b: T, mode: DocumentSortMode, now = new Date()): number {
  if (mode === "number") {
    return a.title.localeCompare(b.title, "nb", { numeric: true, sensitivity: "base" });
  }

  if (mode === "red") {
    const aRed = isDocumentAttention(a, now) ? 0 : 1;
    const bRed = isDocumentAttention(b, now) ? 0 : 1;
    if (aRed !== bRed) return aRed - bRed;
  }

  return createdTime(a.createdAt) - createdTime(b.createdAt);
}
