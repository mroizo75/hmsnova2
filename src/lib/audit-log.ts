import { prisma } from "@/lib/db";

/**
 * Audit Log Utility
 * 
 * Sentralisert logging av alle endringer i systemet for ISO 9001 compliance.
 * Hver endring dokumenteres med:
 * - Hvem: userId
 * - Hva: action (f.eks. "DOCUMENT_CREATED")
 * - Hvor: resource (f.eks. "Document:abc123")
 * - Når: timestamp (automatisk)
 * - Detaljer: metadata (JSON)
 */

export class AuditLog {
  /**
   * Log en handling til audit trail
   * 
   * @param tenantId - ID til tenant som handlingen gjelder
   * @param userId - ID til brukeren som utførte handlingen
   * @param action - Type handling (f.eks. "DOCUMENT_CREATED", "AUDIT_CREATED")
   * @param resource - Ressurs som ble påvirket (f.eks. "Document:abc123")
   * @param resourceId - ID til ressursen
   * @param metadata - Ekstra informasjon (JSON)
   */
  static async log(
    tenantId: string,
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action,
          resource: `${resource}:${resourceId}`,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });
    } catch (error) {
      // Log til console hvis database-logging feiler
      console.error("Failed to create audit log:", error);
      console.log("Audit log details:", {
        tenantId,
        userId,
        action,
        resource: `${resource}:${resourceId}`,
        metadata,
      });
    }
  }

  /**
   * Hent audit logs for en tenant
   */
  static async getLogsForTenant(
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
      action?: string;
      userId?: string;
      resource?: string;
    }
  ) {
    return prisma.auditLog.findMany({
      where: {
        tenantId,
        ...(options?.action && { action: options.action }),
        ...(options?.userId && { userId: options.userId }),
        ...(options?.resource && { resource: { contains: options.resource } }),
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit || 100,
      skip: options?.offset || 0,
      include: {
        tenant: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  /**
   * Hent audit logs for en spesifikk ressurs
   */
  static async getLogsForResource(resourceId: string) {
    return prisma.auditLog.findMany({
      where: {
        resource: { contains: resourceId },
      },
      orderBy: { createdAt: "desc" },
      include: {
        tenant: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  /**
   * Hent audit logs for en bruker
   */
  static async getLogsForUser(userId: string, limit: number = 100) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        tenant: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  /**
   * Slett gamle audit logs (for GDPR compliance)
   * ISO 9001: Dokumentert informasjon skal bevares, men kan slettes etter en viss tid
   */
  static async deleteOldLogs(daysToKeep: number = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    return prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });
  }
}

