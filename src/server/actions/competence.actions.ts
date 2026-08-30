"use server";

/**
 * Server actions for kompetanseprofiler
 *
 * Hjemmel:
 *   AML § 3-2: opplæringsplikt
 *   AML § 3-5: HMS-opplæring for arbeidsgiver
 *   IK-HMS § 5 nr. 2/5: kompetansekrav
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import {
  CreateProfileSchema,
  UpdateProfileSchema,
  AddRequirementSchema,
  RemoveRequirementSchema,
  AssignProfileSchema,
  BulkAssignProfileSchema,
  type CreateProfileInput,
  type UpdateProfileInput,
  type AddRequirementInput,
  type RemoveRequirementInput,
  type AssignProfileInput,
  type BulkAssignProfileInput,
} from "@/features/training/schemas/competence.schema";

// ─── Profil CRUD ────────────────────────────────────────────────────────────

export async function createProfile(input: CreateProfileInput) {
  try {
    const auth = await getAuthContext();
    if (!auth.permissions.canCreateTraining) {
      throw new Error("Du har ikke tilgang til å opprette kompetanseprofiler");
    }

    const validated = CreateProfileSchema.parse(input);

    const profile = await prisma.competenceProfile.create({
      data: {
        tenantId: auth.tenantId,
        name: validated.name,
        description: validated.description ?? null,
        industry: validated.industry ?? null,
        requirements: {
          create: validated.requirements.map((r, i) => ({
            courseKey: r.courseKey,
            requiredLevel: r.requiredLevel,
            priority: r.priority ?? i,
            legalRef: r.legalRef ?? null,
            notes: r.notes ?? null,
          })),
        },
      },
      include: { requirements: true },
    });

    revalidatePath("/dashboard/training/profiler");
    return { success: true as const, data: JSON.parse(JSON.stringify(profile)) };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke opprette profil" };
  }
}

export async function updateProfile(input: UpdateProfileInput) {
  try {
    const auth = await getAuthContext();
    if (!auth.permissions.canCreateTraining) {
      throw new Error("Du har ikke tilgang til å redigere kompetanseprofiler");
    }

    const validated = UpdateProfileSchema.parse(input);

    const existing = await prisma.competenceProfile.findFirst({
      where: { id: validated.id, tenantId: auth.tenantId },
    });
    if (!existing) throw new Error("Profil ikke funnet");

    if (validated.requirements) {
      await prisma.competenceRequirement.deleteMany({
        where: { profileId: validated.id },
      });
    }

    const profile = await prisma.competenceProfile.update({
      where: { id: validated.id },
      data: {
        name: validated.name ?? existing.name,
        description: validated.description ?? existing.description,
        industry: validated.industry ?? existing.industry,
        ...(validated.requirements
          ? {
              requirements: {
                create: validated.requirements.map((r, i) => ({
                  courseKey: r.courseKey,
                  requiredLevel: r.requiredLevel,
                  priority: r.priority ?? i,
                  legalRef: r.legalRef ?? null,
                  notes: r.notes ?? null,
                })),
              },
            }
          : {}),
      },
      include: { requirements: true },
    });

    revalidatePath("/dashboard/training/profiler");
    return { success: true as const, data: JSON.parse(JSON.stringify(profile)) };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke oppdatere profil" };
  }
}

export async function deleteProfile(id: string) {
  try {
    const auth = await getAuthContext();
    if (!auth.permissions.canCreateTraining) {
      throw new Error("Du har ikke tilgang til å slette kompetanseprofiler");
    }

    const profile = await prisma.competenceProfile.findFirst({
      where: { id, tenantId: auth.tenantId },
    });
    if (!profile) throw new Error("Profil ikke funnet");

    await prisma.competenceProfile.delete({ where: { id } });

    revalidatePath("/dashboard/training/profiler");
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke slette profil" };
  }
}

// ─── Enkelt krav ────────────────────────────────────────────────────────────

export async function addRequirement(input: AddRequirementInput) {
  try {
    const auth = await getAuthContext();
    if (!auth.permissions.canCreateTraining) throw new Error("Ingen tilgang");

    const validated = AddRequirementSchema.parse(input);

    const profile = await prisma.competenceProfile.findFirst({
      where: { id: validated.profileId, tenantId: auth.tenantId },
    });
    if (!profile) throw new Error("Profil ikke funnet");

    await prisma.competenceRequirement.create({
      data: {
        profileId: validated.profileId,
        courseKey: validated.courseKey,
        requiredLevel: validated.requiredLevel,
        priority: validated.priority ?? 0,
        legalRef: validated.legalRef ?? null,
        notes: validated.notes ?? null,
      },
    });

    revalidatePath(`/dashboard/training/profiler/${validated.profileId}`);
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke legge til krav" };
  }
}

export async function removeRequirement(input: RemoveRequirementInput) {
  try {
    const auth = await getAuthContext();
    if (!auth.permissions.canCreateTraining) throw new Error("Ingen tilgang");

    const validated = RemoveRequirementSchema.parse(input);

    const req = await prisma.competenceRequirement.findFirst({
      where: { id: validated.id },
      include: { profile: { select: { tenantId: true } } },
    });
    if (!req || req.profile.tenantId !== auth.tenantId) {
      throw new Error("Krav ikke funnet");
    }

    await prisma.competenceRequirement.delete({ where: { id: validated.id } });

    revalidatePath(`/dashboard/training/profiler/${req.profileId}`);
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke fjerne krav" };
  }
}

// ─── Tilordning ─────────────────────────────────────────────────────────────

export async function assignProfileToUser(input: AssignProfileInput) {
  try {
    const auth = await getAuthContext();
    if (!auth.permissions.canAssignTraining) {
      throw new Error("Du har ikke tilgang til å tildele profiler");
    }

    const validated = AssignProfileSchema.parse(input);

    const profile = await prisma.competenceProfile.findFirst({
      where: { id: validated.profileId, tenantId: auth.tenantId },
    });
    if (!profile) throw new Error("Profil ikke funnet");

    const userTenant = await prisma.userTenant.findFirst({
      where: { userId: validated.userId, tenantId: auth.tenantId },
    });
    if (!userTenant) throw new Error("Ansatt ikke funnet");

    await prisma.userCompetenceProfile.upsert({
      where: {
        userId_profileId_tenantId: {
          userId: validated.userId,
          profileId: validated.profileId,
          tenantId: auth.tenantId,
        },
      },
      create: {
        tenantId: auth.tenantId,
        userId: validated.userId,
        profileId: validated.profileId,
        assignedBy: auth.userId,
      },
      update: {},
    });

    revalidatePath(`/dashboard/training/profiler/${validated.profileId}`);
    revalidatePath("/dashboard/training/gap");
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke tildele profil" };
  }
}

export async function removeProfileFromUser(userId: string, profileId: string) {
  try {
    const auth = await getAuthContext();
    if (!auth.permissions.canAssignTraining) throw new Error("Ingen tilgang");

    await prisma.userCompetenceProfile.deleteMany({
      where: { userId, profileId, tenantId: auth.tenantId },
    });

    revalidatePath(`/dashboard/training/profiler/${profileId}`);
    revalidatePath("/dashboard/training/gap");
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke fjerne profil" };
  }
}

export async function bulkAssignProfile(input: BulkAssignProfileInput) {
  try {
    const auth = await getAuthContext();
    if (!auth.permissions.canAssignTraining) throw new Error("Ingen tilgang");

    const validated = BulkAssignProfileSchema.parse(input);

    const profile = await prisma.competenceProfile.findFirst({
      where: { id: validated.profileId, tenantId: auth.tenantId },
    });
    if (!profile) throw new Error("Profil ikke funnet");

    for (const userId of validated.userIds) {
      await prisma.userCompetenceProfile.upsert({
        where: {
          userId_profileId_tenantId: {
            userId,
            profileId: validated.profileId,
            tenantId: auth.tenantId,
          },
        },
        create: {
          tenantId: auth.tenantId,
          userId,
          profileId: validated.profileId,
          assignedBy: auth.userId,
        },
        update: {},
      });
    }

    revalidatePath("/dashboard/training/profiler");
    revalidatePath("/dashboard/training/gap");
    return { success: true as const, count: validated.userIds.length };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke tildele profiler" };
  }
}

// ─── Standardprofiler ───────────────────────────────────────────────────────

export async function ensureDefaultProfiles() {
  try {
    const auth = await getAuthContext();
    if (!auth.permissions.canCreateTraining) throw new Error("Ingen tilgang");

    const existing = await prisma.competenceProfile.count({
      where: { tenantId: auth.tenantId },
    });
    if (existing > 0) {
      return { success: true as const, message: "Profiler finnes allerede" };
    }

    const PROFILES = [
      {
        name: "Generell HMS",
        industry: "generell",
        description: "Grunnleggende HMS-kompetanse for alle ansatte (AML § 3-2, IK-HMS § 5)",
        requirements: [
          { courseKey: "hms-intro", requiredLevel: "REQUIRED", legalRef: "AML § 3-5", priority: 10 },
          { courseKey: "first-aid", requiredLevel: "REQUIRED", legalRef: "AML § 3-2", priority: 9 },
          { courseKey: "fire-safety", requiredLevel: "REQUIRED", legalRef: "AML § 3-2", priority: 8 },
          { courseKey: "whistleblowing-procedures", requiredLevel: "REQUIRED", legalRef: "AML § 2A-6", priority: 7 },
        ],
      },
      {
        name: "Bygg og anlegg",
        industry: "bygg",
        description: "Kompetansekrav for bygge- og anleggsarbeid (byggherreforskriften, SGS-krav)",
        requirements: [
          { courseKey: "hms-intro", requiredLevel: "REQUIRED", legalRef: "AML § 3-5", priority: 10 },
          { courseKey: "first-aid", requiredLevel: "REQUIRED", legalRef: "AML § 3-2", priority: 9 },
          { courseKey: "fire-safety", requiredLevel: "REQUIRED", legalRef: "AML § 3-2", priority: 8 },
          { courseKey: "working-at-height", requiredLevel: "REQUIRED", legalRef: "Forskrift om utførelse § 17-1", priority: 10 },
          { courseKey: "hot-work", requiredLevel: "REQUIRED", legalRef: "Forskrift om utførelse § 10-4", priority: 9 },
          { courseKey: "scaffolding", requiredLevel: "RECOMMENDED", priority: 7 },
          { courseKey: "forklift", requiredLevel: "RECOMMENDED", legalRef: "SGS-krav", priority: 6 },
          { courseKey: "hms-card", requiredLevel: "REQUIRED", legalRef: "Byggherreforskriften § 15", priority: 10 },
        ],
      },
      {
        name: "Helse og omsorg",
        industry: "helse",
        description: "Kompetansekrav for helse- og omsorgssektoren",
        requirements: [
          { courseKey: "hms-intro", requiredLevel: "REQUIRED", legalRef: "AML § 3-5", priority: 10 },
          { courseKey: "first-aid", requiredLevel: "REQUIRED", legalRef: "AML § 3-2", priority: 10 },
          { courseKey: "fire-safety", requiredLevel: "REQUIRED", legalRef: "AML § 3-2", priority: 8 },
          { courseKey: "medication-handling", requiredLevel: "REQUIRED", legalRef: "Helsepersonelloven", priority: 9 },
          { courseKey: "infection-control", requiredLevel: "REQUIRED", legalRef: "Smittevernloven", priority: 9 },
          { courseKey: "patient-transfer", requiredLevel: "RECOMMENDED", priority: 7 },
          { courseKey: "violence-threats", requiredLevel: "REQUIRED", legalRef: "AML § 4-3", priority: 8 },
        ],
      },
      {
        name: "Transport",
        industry: "transport",
        description: "Kompetansekrav for transportbransjen (YSK, ADR)",
        requirements: [
          { courseKey: "hms-intro", requiredLevel: "REQUIRED", legalRef: "AML § 3-5", priority: 10 },
          { courseKey: "first-aid", requiredLevel: "REQUIRED", legalRef: "AML § 3-2", priority: 9 },
          { courseKey: "fire-safety", requiredLevel: "REQUIRED", legalRef: "AML § 3-2", priority: 8 },
          { courseKey: "adr-dangerous-goods", requiredLevel: "REQUIRED", legalRef: "ADR/RID-forskriften", priority: 10 },
          { courseKey: "professional-driver-cert", requiredLevel: "REQUIRED", legalRef: "Yrkessjåførforskriften", priority: 10 },
          { courseKey: "driving-resting-time", requiredLevel: "REQUIRED", legalRef: "Kjøre- og hviletidsforskriften", priority: 9 },
        ],
      },
    ];

    for (const p of PROFILES) {
      await prisma.competenceProfile.create({
        data: {
          tenantId: auth.tenantId,
          name: p.name,
          industry: p.industry,
          description: p.description,
          isDefault: true,
          requirements: {
            create: p.requirements.map((r, i) => ({
              courseKey: r.courseKey,
              requiredLevel: r.requiredLevel,
              priority: r.priority ?? i,
              legalRef: r.legalRef ?? null,
            })),
          },
        },
      });
    }

    revalidatePath("/dashboard/training/profiler");
    return { success: true as const, message: "Standardprofiler opprettet" };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke opprette standardprofiler" };
  }
}
