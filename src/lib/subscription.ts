/**
 * Subscription utility functions
 * Håndterer logikk for abonnements-pakker og brukerbegrensninger
 * 
 * Ny prismodell (kun software):
 * - 12 mnd binding: 300 kr/mnd (3600 kr/år)
 * 
 * Alle planer inkluderer ubegrenset antall brukere.
 */

export type PricingTier = "MICRO" | "SMALL" | "MEDIUM" | "LARGE";
export type BindingPeriod = "none" | "1year" | "2year";

export interface SubscriptionLimits {
  maxUsers: number;
  price: number;
  monthlyPrice: number;
  name: string;
  description: string;
}

export interface BindingPricing {
  period: BindingPeriod;
  monthlyPrice: number;
  yearlyPrice: number;
  name: string;
}

/**
 * Priser basert på bindingsperiode
 */
export const BINDING_PRICES: Record<BindingPeriod, BindingPricing> = {
  none: {
    period: "none",
    monthlyPrice: 300,
    yearlyPrice: 3600,
    name: "12 mnd binding",
  },
  "1year": {
    period: "1year",
    monthlyPrice: 300,
    yearlyPrice: 3600,
    name: "12 mnd binding",
  },
  "2year": {
    period: "2year",
    monthlyPrice: 300,
    yearlyPrice: 3600,
    name: "12 mnd binding",
  },
};

/**
 * Hent grenser og info for en gitt pricing tier
 * Alle tier har nå samme pris og ubegrenset brukere
 * Legacy-støtte for eksisterende kunder
 */
export function getSubscriptionLimits(tier: PricingTier | null): SubscriptionLimits {
  // Ny prismodell: Alle får samme pris (1 år binding som standard)
  // og ubegrenset brukere
  const defaultLimits: SubscriptionLimits = {
    maxUsers: 999,
    price: 3600,
    monthlyPrice: 300,
    name: "HMS Nova Software",
    description: "Ubegrenset brukere inkludert",
  };

  // For bakoverkompatibilitet, returner alltid default
  return defaultLimits;
}

/**
 * Hent pris basert på bindingsperiode
 */
export function getBindingPrice(period: BindingPeriod): BindingPricing {
  return BINDING_PRICES[period] || BINDING_PRICES["1year"];
}

/** Standard HMS Nova-programvare: 3 600 kr/år, 12 mnd. */
export function standardSoftwareSubscription(status: "TRIAL" | "ACTIVE") {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  return {
    plan: "PROFESSIONAL" as const,
    status,
    price: getBindingPrice("1year").yearlyPrice,
    billingInterval: "YEARLY" as const,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
  };
}

/**
 * Sjekk om tenant har nådd maks antall brukere
 * Med ny prismodell er dette alltid false (ubegrenset brukere)
 */
export function hasReachedUserLimit(currentUsers: number, tier: PricingTier | null): boolean {
  // Ny modell: Ubegrenset brukere for alle
  return false;
}

/**
 * Få anbefalt tier basert på antall ansatte
 * Med ny modell returnerer vi alltid MICRO (alle har samme pris)
 */
export function getRecommendedTier(employeeCount: number): PricingTier {
  return "MICRO"; // Alle får samme tier nå
}

