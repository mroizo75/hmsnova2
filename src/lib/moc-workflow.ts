export type MocStatus =
  | "DRAFT"
  | "IMPACT_ASSESSMENT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "IMPLEMENTING"
  | "VERIFYING"
  | "CLOSED"
  | "REJECTED"
  | "CANCELLED";

export type MocClassification = "MINOR" | "SIGNIFICANT" | "MAJOR";
export type MocSource = "PLANNED" | "UNINTENDED";
export type MocDuration = "TEMPORARY" | "PERMANENT";

export interface MocTransitionContext {
  classification: MocClassification;
  source: MocSource;
  duration: MocDuration;
  hasImpactAssessment: boolean;
  hasRiskLink: boolean;
  hasVoReview: boolean;
  hasPlannedEnd: boolean;
  hasInformed: boolean;
  hasVerification: boolean;
  hasEnvironmentalImpact: boolean;
}

export interface MocTransitionResult {
  ok: boolean;
  code?: string;
  message?: string;
}

const TERMINAL: ReadonlySet<MocStatus> = new Set(["CLOSED", "REJECTED", "CANCELLED"]);

function fail(code: string, message: string): MocTransitionResult {
  return { ok: false, code, message };
}

export function canTransitionMocStatus(
  from: MocStatus,
  to: MocStatus,
  ctx: MocTransitionContext,
): MocTransitionResult {
  if (from === to) {
    return { ok: true };
  }
  if (TERMINAL.has(from)) {
    return fail("TERMINAL", "Saken er lukket og kan ikke endre status.");
  }

  if (to === "CANCELLED") {
    if (from === "IMPLEMENTING" || from === "VERIFYING") {
      return fail("CANCEL_LATE", "Påbegynt iverksetting kan ikke kanselleres. Bruk verifikasjon eller ny endring.");
    }
    return { ok: true };
  }

  if (to === "DRAFT") {
    return from === "IMPACT_ASSESSMENT" ? { ok: true } : fail("INVALID", "Ugyldig statusovergang.");
  }

  if (to === "IMPACT_ASSESSMENT") {
    return from === "DRAFT" || from === "PENDING_APPROVAL"
      ? { ok: true }
      : fail("INVALID", "Ugyldig statusovergang.");
  }

  if (to === "PENDING_APPROVAL") {
    if (from !== "IMPACT_ASSESSMENT") {
      return fail("INVALID", "Konsekvensvurdering må fullføres før godkjenning.");
    }
    if (!ctx.hasImpactAssessment) {
      return fail("IMPACT_REQUIRED", "Beskriv konsekvenser for HMS før saken sendes til godkjenning. IK-HMS § 5 nr. 6.");
    }
    if (!ctx.hasEnvironmentalImpact) {
      return fail(
        "ENV_IMPACT_REQUIRED",
        "Beskriv konsekvenser for ytre miljø før godkjenning, eller dokumenter at påvirkningen ikke er vesentlig. ISO 14001:2026 6.3.",
      );
    }
    if (ctx.duration === "TEMPORARY" && !ctx.hasPlannedEnd) {
      return fail("END_DATE_REQUIRED", "Midlertidige endringer krever planlagt sluttdato.");
    }
    if (ctx.source === "UNINTENDED") {
      return fail("UNINTENDED_SKIP", "Utilsiktede endringer går til iverksetting etter konsekvensvurdering, uten forhåndsgodkjenning. ISO 45001 8.1.3.");
    }
    return { ok: true };
  }

  if (to === "APPROVED") {
    if (from !== "PENDING_APPROVAL") {
      return fail("INVALID", "Kun saker til godkjenning kan godkjennes.");
    }
    if ((ctx.classification === "SIGNIFICANT" || ctx.classification === "MAJOR") && !ctx.hasRiskLink) {
      return fail("RISK_REQUIRED", "Vesentlige og alvorlige endringer krever koblet risikovurdering. IK-HMS § 5 nr. 6.");
    }
    if ((ctx.classification === "SIGNIFICANT" || ctx.classification === "MAJOR") && !ctx.hasVoReview) {
      return fail("VO_REQUIRED", "Verneombud skal medvirke ved vesentlige endringer. AML § 4-2 og § 6-2.");
    }
    return { ok: true };
  }

  if (to === "REJECTED") {
    return from === "PENDING_APPROVAL"
      ? { ok: true }
      : fail("INVALID", "Kun saker til godkjenning kan avvises.");
  }

  if (to === "IMPLEMENTING") {
    if (from === "APPROVED") return { ok: true };
    if (from === "IMPACT_ASSESSMENT" && ctx.source === "UNINTENDED") {
      if (!ctx.hasImpactAssessment) {
        return fail("IMPACT_REQUIRED", "Utilsiktede endringer skal konsekvensvurderes før tiltak. ISO 45001 8.1.3.");
      }
      if (!ctx.hasEnvironmentalImpact) {
        return fail(
          "ENV_IMPACT_REQUIRED",
          "Utilsiktede endringer skal også vurderes for ytre miljø. ISO 14001:2026 6.3.",
        );
      }
      return { ok: true };
    }
    return fail("NOT_APPROVED", "Endringen må være godkjent før iverksetting.");
  }

  if (to === "VERIFYING") {
    if (from !== "IMPLEMENTING") {
      return fail("INVALID", "Verifikasjon starter etter iverksetting.");
    }
    if (!ctx.hasInformed) {
      return fail("INFORM_REQUIRED", "Berørte arbeidstakere skal være informert før verifikasjon. IK-HMS § 5 nr. 2.");
    }
    return { ok: true };
  }

  if (to === "CLOSED") {
    if (from !== "VERIFYING") {
      return fail("INVALID", "Saken lukkes etter verifikasjon.");
    }
    if (!ctx.hasVerification) {
      return fail("VERIFY_REQUIRED", "Dokumenter at endringen er verifisert før lukking.");
    }
    if (!ctx.hasInformed) {
      return fail("INFORM_REQUIRED", "Berørte arbeidstakere skal være informert. IK-HMS § 5 nr. 2.");
    }
    return { ok: true };
  }

  return fail("INVALID", "Ugyldig statusovergang.");
}

const MOC_STATUS_CANDIDATES: readonly MocStatus[] = [
  "DRAFT",
  "IMPACT_ASSESSMENT",
  "PENDING_APPROVAL",
  "APPROVED",
  "IMPLEMENTING",
  "VERIFYING",
  "CLOSED",
  "REJECTED",
  "CANCELLED",
];

export function getAllowedNextMocStatuses(
  from: MocStatus,
  ctx: MocTransitionContext,
): MocStatus[] {
  return MOC_STATUS_CANDIDATES.filter(
    (to) => to !== from && canTransitionMocStatus(from, to, ctx).ok,
  );
}
