import { NextRequest, NextResponse } from "next/server";
import { ChemicalStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";

const managerRoles = new Set(["ADMIN", "LEDER", "HMS"]);
const allowedStatuses = new Set<ChemicalStatus>(["ACTIVE", "PHASED_OUT", "ARCHIVED"]);
const parseStatus = (value: string | null): ChemicalStatus | null => {
  if (!value) {
    return null;
  }
  if (!allowedStatuses.has(value as ChemicalStatus)) {
    return null;
  }
  return value as ChemicalStatus;
};


const normalizeJsonArrayField = (value: unknown): string | null => {
  if (Array.isArray(value)) {
    const normalized = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
    return JSON.stringify(normalized);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean);
        return JSON.stringify(normalized);
      }
    } catch {
      // ifall klient sender ren tekst, lagre som enkel-element liste
      return JSON.stringify([trimmed]);
    }
  }

  return null;
};

const hasManagerRole = async (userId: string, tenantId: string): Promise<boolean> => {
  const membership = await prisma.userTenant.findUnique({
    where: {
      userId_tenantId: {
        userId,
        tenantId,
      },
    },
    select: {
      role: true,
    },
  });

  return membership ? managerRoles.has(membership.role) : false;
};

/**
 * GET /api/chemicals
 */
export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getRequiredTenantContext();
    const statusParam = request.nextUrl.searchParams.get("status");
    const statusFilter = parseStatus(statusParam);

    const chemicals = await prisma.chemical.findMany({
      where: {
        tenantId: tenantContext.tenantId,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ chemicals }, { status: 200 });
  } catch (error) {
    console.error("[Chemicals GET] Error:", error);
    return NextResponse.json({ error: "Kunne ikke hente stoffkartotek" }, { status: 500 });
  }
}

/**
 * POST /api/chemicals
 */
export async function POST(request: NextRequest) {
  try {
    const tenantContext = await getRequiredTenantContext();
    const canManage = await hasManagerRole(tenantContext.userId, tenantContext.tenantId);

    if (!canManage) {
      return NextResponse.json({ error: "Ingen tilgang til å opprette stoff" }, { status: 403 });
    }

    const payload = (await request.json()) as Record<string, unknown>;
    const productName = typeof payload.productName === "string" ? payload.productName.trim() : "";

    if (!productName) {
      return NextResponse.json({ error: "productName er obligatorisk" }, { status: 400 });
    }

    const statusValue =
      typeof payload.status === "string" ? parseStatus(payload.status) ?? "ACTIVE" : "ACTIVE";

    const chemical = await prisma.chemical.create({
      data: {
        tenantId: tenantContext.tenantId,
        productName,
        supplier: typeof payload.supplier === "string" ? payload.supplier.trim() || null : null,
        casNumber: typeof payload.casNumber === "string" ? payload.casNumber.trim() || null : null,
        hazardClass: typeof payload.hazardClass === "string" ? payload.hazardClass.trim() || null : null,
        hazardStatements:
          typeof payload.hazardStatements === "string" ? payload.hazardStatements.trim() || null : null,
        precautionaryStatements:
          typeof payload.precautionaryStatements === "string"
            ? payload.precautionaryStatements.trim() || null
            : null,
        warningPictograms: normalizeJsonArrayField(payload.warningPictograms),
        requiredPPE: normalizeJsonArrayField(payload.requiredPPE),
        containsIsocyanates: payload.containsIsocyanates === true,
        isCMR: payload.isCMR === true,
        isSVHC: payload.isSVHC === true,
        sdsKey: typeof payload.sdsKey === "string" ? payload.sdsKey.trim() || null : null,
        sdsVersion: typeof payload.sdsVersion === "string" ? payload.sdsVersion.trim() || null : null,
        sdsDate: typeof payload.sdsDate === "string" && payload.sdsDate ? new Date(payload.sdsDate) : null,
        nextReviewDate:
          typeof payload.nextReviewDate === "string" && payload.nextReviewDate
            ? new Date(payload.nextReviewDate)
            : null,
        location: typeof payload.location === "string" ? payload.location.trim() || null : null,
        quantity:
          typeof payload.quantity === "number"
            ? payload.quantity
            : typeof payload.quantity === "string" && payload.quantity.trim()
              ? Number(payload.quantity)
              : null,
        unit: typeof payload.unit === "string" ? payload.unit.trim() || null : null,
        status: statusValue,
        notes: typeof payload.notes === "string" ? payload.notes.trim() || null : null,
      },
    });

    return NextResponse.json({ chemical }, { status: 201 });
  } catch (error) {
    console.error("[Chemicals POST] Error:", error);
    return NextResponse.json({ error: "Kunne ikke opprette stoff" }, { status: 500 });
  }
}
