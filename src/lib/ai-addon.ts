/**
 * Betalt AI-tillegg for HMS Nova.
 * 99 kr/mnd + mva (AML/IK-HMS-hjelp, tale-til-tekst, valgfrie forslag).
 */

export const AI_ADDON_NET_MONTHLY_NOK = 99;
export const AI_ADDON_VAT_RATE = 0.25;
export const AI_ADDON_GROSS_MONTHLY_NOK = AI_ADDON_NET_MONTHLY_NOK * (1 + AI_ADDON_VAT_RATE);
export const AI_ADDON_INVOICE_DESCRIPTION = "HMS Nova AI";
export const AI_ADDON_BILLING_EMAIL = "post@hmsnova.no";
export const AI_ADDON_FIKEN_ACCOUNT = "3000";

export type FikenInvoiceLine = {
  description: string;
  netAmount: number;
  vatType: string;
  account: string;
};

export function getAiAddonGrossMonthlyNok(): number {
  return AI_ADDON_GROSS_MONTHLY_NOK;
}

export function buildAiAddonFikenLine(): FikenInvoiceLine {
  return {
    description: `${AI_ADDON_INVOICE_DESCRIPTION} – ${AI_ADDON_NET_MONTHLY_NOK} kr/mnd`,
    netAmount: AI_ADDON_NET_MONTHLY_NOK,
    vatType: "HIGH",
    account: AI_ADDON_FIKEN_ACCOUNT,
  };
}

export function buildSubscriptionInvoiceTotals(input: {
  subscriptionGrossAmount: number;
  aiEnabled: boolean;
}): {
  grossTotal: number;
  netSubscription: number;
  lines: FikenInvoiceLine[];
} {
  const netSubscription = Math.round(input.subscriptionGrossAmount / (1 + AI_ADDON_VAT_RATE));
  const lines: FikenInvoiceLine[] = [
    {
      description: "HMS Nova – abonnement",
      netAmount: netSubscription,
      vatType: "HIGH",
      account: AI_ADDON_FIKEN_ACCOUNT,
    },
  ];

  let grossTotal = input.subscriptionGrossAmount;
  if (input.aiEnabled) {
    lines.push(buildAiAddonFikenLine());
    grossTotal += AI_ADDON_GROSS_MONTHLY_NOK;
  }

  return { grossTotal, netSubscription, lines };
}
