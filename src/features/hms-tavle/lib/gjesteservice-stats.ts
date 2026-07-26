/**
 * Anonymiserte nøkkeltall for gjesteservice.
 *
 * Kun aggregerte tall forlater databasen – aldri meldingstekst, navn eller
 * romnummer. Tallene skjules når volumet er lavt, slik at enkeltsaker ikke
 * kan utledes av gjester som står foran tavlen (GDPR art. 5).
 */

import { prisma } from "@/lib/db";
import { TRUST_PANEL_MIN_VOLUME } from "./gjesteservice-config";

export interface GuestServiceStats {
  total: number;
  resolved: number;
  medianResponseMinutes: number | null;
  visible: boolean;
}

const RESOLVED_STATUSES = ["BEHANDLET", "LUKKET"];

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

export async function getGuestServiceStats(tavleId: string): Promise<GuestServiceStats> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const rows = await prisma.tavleGuestSubmission.findMany({
    where: { tavleId, createdAt: { gte: cutoff } },
    select: { status: true, createdAt: true, respondedAt: true },
  });

  const responseTimes = rows
    .filter((row) => row.respondedAt !== null)
    .map((row) => Math.round((row.respondedAt!.getTime() - row.createdAt.getTime()) / 60_000));

  const total = rows.length;

  return {
    total,
    resolved: rows.filter((row) => RESOLVED_STATUSES.includes(row.status)).length,
    medianResponseMinutes: median(responseTimes),
    visible: total >= TRUST_PANEL_MIN_VOLUME,
  };
}
