import { prisma } from "@/lib/db";
import type { WhistleblowAuditAction } from "@prisma/client";

export async function logWhistleblowAccess(input: {
  tenantId: string;
  userId: string;
  action: WhistleblowAuditAction;
  whistleblowingId?: string | null;
  object?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    await prisma.whistleblowAuditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        action: input.action,
        whistleblowingId: input.whistleblowingId ?? null,
        object: input.object ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch {
    // Aldri la logging hindre saksbehandling, men ikke svelg stille uten spor i prosess.
  }
}
