import type { SjaConclusion, SjaStatus } from "@prisma/client";

/**
 * AML § 3-1 og IK-HMS § 5 nr. 6 krever at farer er kartlagt før arbeidet.
 * Om en annen person skal godkjenne SJA-en, er virksomhetens eget valg.
 */
export function submittedSjaState(approvalRequired: boolean): {
  status: SjaStatus;
  conclusion: SjaConclusion;
} {
  if (approvalRequired) {
    return { status: "DRAFT", conclusion: "NOT_DECIDED" };
  }
  return { status: "ACTIVE", conclusion: "NOT_DECIDED" };
}
