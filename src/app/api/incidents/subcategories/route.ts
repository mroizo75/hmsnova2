import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { IncidentType } from "@prisma/client";
import { getIncidentIndustryScopes } from "@/lib/tenant-features";

type SubcategoryOption = {
  id: string;
  key: string;
  label: string;
  industry: string;
  tenantId: string | null;
};

const HEALTHCARE_FALLBACK_SUBCATEGORIES: Partial<
  Record<IncidentType, Array<{ key: string; label: string; industry: string }>>
> = {
  ULYKKE: [
    { key: "PASIENTFORFLYTNING", label: "Pasientforflytning / belastningsskade", industry: "HELSE" },
    { key: "VOLD_TRUSLER", label: "Vold eller trusler fra bruker/pårørende", industry: "HELSE" },
    { key: "STIKK_KUTT", label: "Stikk-/kuttskade", industry: "HELSE" },
  ],
  NESTEN: [
    { key: "NESTEN_MEDIKAMENT", label: "Nesten-feil i medikamenthåndtering", industry: "HELSE" },
    { key: "NESTEN_FALL", label: "Nesten fall ved hjemmebesøk", industry: "HELSE" },
  ],
  FARLIG_SITUASJON: [
    { key: "ALENEARBEID", label: "Alenearbeid med forhøyet risiko", industry: "HELSE" },
    { key: "SMITTE_RISIKO", label: "Smitterisiko i oppdragssituasjon", industry: "HELSE" },
  ],
  YRKESSYKDOM: [
    { key: "BIOLOGISK_EKSPONERING", label: "Biologisk eksponering", industry: "HELSE" },
    { key: "MUSKEL_SKJELETT", label: "Muskel- og skjelettplager", industry: "HELSE" },
  ],
};

function mergeFallbackSubcategories(
  type: IncidentType,
  existingOptions: SubcategoryOption[],
  industryScopes: string[],
): SubcategoryOption[] {
  const fallbackOptions = HEALTHCARE_FALLBACK_SUBCATEGORIES[type] ?? [];
  if (fallbackOptions.length === 0 || !industryScopes.includes("HELSE")) {
    return existingOptions;
  }

  const optionMap = new Map(existingOptions.map((option) => [option.key, option]));
  for (const fallbackOption of fallbackOptions) {
    if (!optionMap.has(fallbackOption.key)) {
      optionMap.set(fallbackOption.key, {
        id: `fallback-${fallbackOption.key}`,
        key: fallbackOption.key,
        label: fallbackOption.label,
        industry: fallbackOption.industry,
        tenantId: null,
      });
    }
  }

  return Array.from(optionMap.values());
}

// GET /api/incidents/subcategories?type=ULYKKE
// Henter systemstandard + tenant-egne underkategorier for en gitt hendelsestype
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as IncidentType | null;

    if (!type) {
      return NextResponse.json({ error: "type er påkrevd" }, { status: 400 });
    }

    const tenantId = session.user.tenantId;
    const tenant = tenantId
      ? await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { industry: true },
        })
      : null;
    const industryScopes = getIncidentIndustryScopes(tenant?.industry);

    const tenantSpecificFilter = tenantId ? [{ tenantId }] : [];

    // Hent systemstandard (tenantId = null) + tenant-egne for denne typen
    const options = await prisma.incidentSubcategoryOption.findMany({
      where: {
        incidentType: type,
        isActive: true,
        OR: [
          {
            tenantId: null,
            industry: {
              in: industryScopes,
            },
          },
          ...tenantSpecificFilter,
        ],
      },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      select: {
        id: true,
        key: true,
        label: true,
        industry: true,
        tenantId: true,
      },
    });

    return NextResponse.json({
      options: mergeFallbackSubcategories(type, options, industryScopes),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Intern feil" },
      { status: 500 }
    );
  }
}
