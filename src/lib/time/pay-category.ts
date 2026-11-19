export type PayCategory = "HOURLY" | "MONTHLY";

export function payCategoryFromRemuneration(remunerationType: string | null | undefined): PayCategory | null {
  if (!remunerationType) return null;
  if (remunerationType === "MONTHLY_WAGE") return "MONTHLY";
  return "HOURLY";
}

/** Fastlønn uten avhuking for overtid skal ikke få overtid. Timelønn og ukjent type følger dagsreglene. */
export function overtimeAllowed(input: {
  payCategory?: string | null;
  overtimeEligible?: boolean | null;
}): boolean {
  if (input.payCategory === "MONTHLY") return Boolean(input.overtimeEligible);
  return true;
}

export function payCategoryLabel(input: {
  payCategory?: string | null;
  overtimeEligible?: boolean | null;
}): string {
  if (input.payCategory === "MONTHLY" && input.overtimeEligible) return "Fastlønn med overtid";
  if (input.payCategory === "MONTHLY") return "Fastlønn";
  if (input.payCategory === "HOURLY") return "Timelønn";
  return "";
}
