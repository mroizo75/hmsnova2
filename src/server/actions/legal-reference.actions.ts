"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Henter juridiske referanser som gjelder for tenantens bransje.
 * Tilgjengelig for alle roller – ingen rollebasert begrensning.
 */
export async function getLegalReferencesForIndustry(industry: string | null) {
  const all = await prisma.legalReference.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const applicable = all.filter((ref) => {
    const industries = ref.industries as string[];
    if (!industries || industries.length === 0) return false;
    if (industries.includes("all")) return true;
    if (!industry) return false;
    return industries.includes(industry.toLowerCase());
  });

  return applicable;
}

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Ikke autentisert");
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user?.isSuperAdmin) throw new Error("Kun superadmin har tilgang");
}

export async function getAllLegalReferencesAdmin() {
  try {
    await requireSuperAdmin();
    const refs = await prisma.legalReference.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return { success: true, data: refs };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Ukjent feil", data: [] };
  }
}

export async function getPaginatedLegalReferencesAdmin(page: number, search: string) {
  const ITEMS_PER_PAGE = 25;
  try {
    await requireSuperAdmin();

    const where = search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
            { paragraphRef: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [total, refs] = await Promise.all([
      prisma.legalReference.count({ where }),
      prisma.legalReference.findMany({
        where,
        orderBy: { sortOrder: "asc" },
        skip: (page - 1) * ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
      }),
    ]);

    return { success: true, data: refs, total };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Ukjent feil", data: [], total: 0 };
  }
}

export async function createLegalReference(formData: FormData) {
  try {
    await requireSuperAdmin();
    const title = (formData.get("title") as string)?.trim();
    const paragraphRef = (formData.get("paragraphRef") as string)?.trim() || null;
    const description = (formData.get("description") as string)?.trim();
    const sourceUrl = (formData.get("sourceUrl") as string)?.trim();
    const industriesRaw = formData.get("industries") as string;
    const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;

    if (!title || !description || !sourceUrl) {
      return { success: false, error: "Tittel, beskrivelse og kilde-URL er påkrevd" };
    }

    const industries = industriesRaw
      ? industriesRaw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : ["all"];

    await prisma.legalReference.create({
      data: {
        title,
        paragraphRef,
        description,
        sourceUrl,
        industries: industries.length > 0 ? industries : ["all"],
        sortOrder,
        lastVerifiedAt: new Date(),
      },
    });
    revalidatePath("/admin/legal-references");
    revalidatePath("/dashboard/juridisk-register");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Kunne ikke opprette" };
  }
}

export async function updateLegalReference(id: string, formData: FormData) {
  try {
    await requireSuperAdmin();
    const title = (formData.get("title") as string)?.trim();
    const paragraphRef = (formData.get("paragraphRef") as string)?.trim() || null;
    const description = (formData.get("description") as string)?.trim();
    const sourceUrl = (formData.get("sourceUrl") as string)?.trim();
    const industriesRaw = formData.get("industries") as string;
    const sortOrder = parseInt(formData.get("sortOrder") as string) || 0;

    if (!title || !description || !sourceUrl) {
      return { success: false, error: "Tittel, beskrivelse og kilde-URL er påkrevd" };
    }

    const industries = industriesRaw
      ? industriesRaw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : ["all"];

    await prisma.legalReference.update({
      where: { id },
      data: {
        title,
        paragraphRef,
        description,
        sourceUrl,
        industries: industries.length > 0 ? industries : ["all"],
        sortOrder,
        lastVerifiedAt: new Date(),
      },
    });
    revalidatePath("/admin/legal-references");
    revalidatePath("/dashboard/juridisk-register");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Kunne ikke oppdatere" };
  }
}

export async function deleteLegalReference(id: string) {
  try {
    await requireSuperAdmin();
    await prisma.legalReference.delete({ where: { id } });
    revalidatePath("/admin/legal-references");
    revalidatePath("/dashboard/juridisk-register");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Kunne ikke slette" };
  }
}
