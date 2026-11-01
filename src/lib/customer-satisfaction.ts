/** ISO 9001:2015 pkt. 9.1.2: innhentet kundetilfredshet på skala 1–5. */

export type SatisfactionSentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

export function sentimentFromRating(rating: number): SatisfactionSentiment {
  if (rating >= 4) return "POSITIVE";
  if (rating <= 2) return "NEGATIVE";
  return "NEUTRAL";
}

export function averageRating(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((total, value) => total + value, 0);
  return Math.round((sum / values.length) * 10) / 10;
}
