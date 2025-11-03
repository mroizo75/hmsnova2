/**
 * Subscription utility functions
 * Håndterer logikk for abonnements-pakker og brukerbegrensninger
 * 
 * Pakker speiler priser fra /priser siden og er lik Grønn Jobb sine pakker
 */

export type PricingTier = "MICRO" | "SMALL" | "MEDIUM" | "LARGE";

export interface SubscriptionLimits {
  maxUsers: number;
  price: number;
  name: string;
  description: string;
}

/**
 * Hent grenser og info for en gitt pricing tier
 * Speiler prisene fra /priser siden
 */
export function getSubscriptionLimits(tier: PricingTier | null): SubscriptionLimits {
  switch (tier) {
    case "MICRO":
      // Micro/Trial pakke (ikke brukt i produksjon, kun for testing)
      return {
        maxUsers: 5,
        price: 0,
        name: "Trial",
        description: "Prøveperiode (maks 5 brukere)",
      };
    case "SMALL":
      // Liten bedrift: 1-20 ansatte
      return {
        maxUsers: 20,
        price: 6000,
        name: "Liten bedrift",
        description: "1-20 ansatte",
      };
    case "MEDIUM":
      // Medium bedrift: 21-50 ansatte
      return {
        maxUsers: 50,
        price: 8000,
        name: "Medium bedrift",
        description: "21-50 ansatte",
      };
    case "LARGE":
      // Stor bedrift: 51+ ansatte
      return {
        maxUsers: 999, // "Ubegrenset" for store bedrifter
        price: 12000,
        name: "Stor bedrift",
        description: "51+ ansatte",
      };
    default:
      // Default til SMALL hvis ikke satt (standard pakke)
      return {
        maxUsers: 20,
        price: 6000,
        name: "Liten bedrift",
        description: "1-20 ansatte",
      };
  }
}

/**
 * Sjekk om tenant har nådd maks antall brukere
 */
export function hasReachedUserLimit(currentUsers: number, tier: PricingTier | null): boolean {
  const limits = getSubscriptionLimits(tier);
  return currentUsers >= limits.maxUsers;
}

/**
 * Få anbefalt tier basert på antall ansatte
 */
export function getRecommendedTier(employeeCount: number): PricingTier {
  if (employeeCount <= 20) return "SMALL";
  if (employeeCount <= 50) return "MEDIUM";
  return "LARGE";
}

