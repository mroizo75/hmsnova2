export const ACCOUNTING_OUTBOX_MAX_ATTEMPTS = 8;

export function nextRetryDelayMs(attempts: number): number {
  const base = 2000 * 2 ** Math.max(0, attempts);
  return Math.min(30 * 60 * 1000, base);
}

export function shouldMarkSyncError(
  attempts: number,
  maxAttempts = ACCOUNTING_OUTBOX_MAX_ATTEMPTS
): boolean {
  return attempts >= maxAttempts;
}

export type OutboxAction =
  | "CREATE_PROJECT"
  | "UPDATE_PROJECT"
  | "UPSERT_TIME"
  | "DELETE_TIME"
  | "UPSERT_LINE"
  | "CREATE_INVOICE"
  | "PULL_MASTER"
  | "UPSERT_ABSENCE";
