"use server";

import { Prisma, type Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getRequiredTenantContext } from "@/lib/tenant-context";
import {
  AZURE_AD_JIT_ROLES,
  extractEmailDomain,
  isPublicEmailDomain,
  isValidAzureAdDomain,
  normalizeAzureAdDomain,
  resolveAzureAdJitRole,
} from "@/lib/azure-ad-email";

async function getSessionContext() {
  const tenantContext = await getRequiredTenantContext().catch(() => null);
  if (!tenantContext) {
    return { error: "Ikke autentisert" };
  }

  const user = await prisma.user.findUnique({
    where: { id: tenantContext.userId },
    select: {
      id: true,
      email: true,
      isSuperAdmin: true,
      tenants: {
        where: { tenantId: tenantContext.tenantId },
        take: 1,
        select: { tenantId: true, role: true },
      },
    },
  });

  const membership = user?.tenants[0];
  if (!user || !membership) {
    return { error: "Ingen tenant funnet" };
  }

  if (membership.role !== "ADMIN") {
    return { error: "Kun administratorer kan endre Azure AD-innstillinger" };
  }

  return {
    user,
    tenantId: membership.tenantId,
    role: membership.role,
  };
}

export async function updateAzureAdSettings(data: {
  azureAdEnabled?: boolean;
  azureAdDomain?: string;
  azureAdAutoRole?: string;
}) {
  try {
    const context = await getSessionContext();
    if ("error" in context) {
      return { success: false, error: context.error };
    }

    const { tenantId, user } = context;
    const normalizedDomain = data.azureAdDomain
      ? normalizeAzureAdDomain(data.azureAdDomain)
      : undefined;

    if (data.azureAdEnabled && !normalizedDomain) {
      return {
        success: false,
        error: "E-postdomene er påkrevd for å aktivere SSO",
      };
    }

    if (normalizedDomain) {
      if (!isValidAzureAdDomain(normalizedDomain)) {
        return {
          success: false,
          error: "Ugyldig domene-format. Eksempel: bedrift.no (uten @)",
        };
      }

      if (isPublicEmailDomain(normalizedDomain)) {
        return {
          success: false,
          error: "Offentlige e-postdomener kan ikke brukes til bedrifts-SSO",
        };
      }

      if (!user.isSuperAdmin) {
        const adminDomain = extractEmailDomain(user.email);
        if (adminDomain !== normalizedDomain) {
          return {
            success: false,
            error:
              "E-postdomenet må være det samme som din egen innloggede e-postadresse",
          };
        }
      }

      const taken = await prisma.tenant.findFirst({
        where: {
          azureAdDomain: normalizedDomain,
          NOT: { id: tenantId },
        },
        select: { id: true },
      });

      if (taken) {
        return {
          success: false,
          error: "Dette e-postdomenet er allerede i bruk av en annen bedrift",
        };
      }
    }

    if (data.azureAdAutoRole && !AZURE_AD_JIT_ROLES.includes(data.azureAdAutoRole as Role)) {
      return {
        success: false,
        error: "Ugyldig rolle for automatisk tildeling",
      };
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        azureAdEnabled: data.azureAdEnabled,
        azureAdDomain: normalizedDomain,
        ...(data.azureAdAutoRole
          ? { azureAdAutoRole: resolveAzureAdJitRole(data.azureAdAutoRole) }
          : {}),
      },
    });

    revalidatePath("/dashboard/settings");

    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        success: false,
        error: "Dette e-postdomenet er allerede i bruk av en annen bedrift",
      };
    }

    return {
      success: false,
      error: "Kunne ikke oppdatere Microsoft SSO-innstillinger",
    };
  }
}
