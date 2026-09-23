"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { getAuthContext, type AuthContext } from "@/lib/server-authorization";
import { canAccessPersonnelFile } from "@/features/personnel/lib/personnel-categories";
import {
  CopyCompetenceStatementsSchema,
  CreateCompetenceStatementSchema,
  CreateProfileCompetenceStatementSchema,
  DeleteCompetenceStatementSchema,
  DeleteProfileCompetenceStatementSchema,
  SetCompetenceRatingSchema,
} from "@/features/personnel/schemas/competence.schema";

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message).join(". ");
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

function revalidateEmployee(userId: string) {
  revalidatePath("/dashboard/personalarkiv");
  revalidatePath(`/dashboard/personalarkiv/${userId}`);
  revalidatePath("/ansatt/personalmappe");
}

async function assertCanEditCompetence(auth: AuthContext, userId: string) {
  if (!auth.permissions.canCreateEmployeeReviews && !auth.permissions.canReadHrNotes) {
    return "Du har ikke tilgang til å vurdere kompetanse";
  }

  const membership = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId, tenantId: auth.tenantId } },
    select: { departmentId: true },
  });
  if (!membership) return "Ansatt ikke funnet i denne bedriften";

  const allowed = canAccessPersonnelFile({
    viewerId: auth.userId,
    employeeId: userId,
    canReadOwn: auth.permissions.canReadOwnPersonnelFile,
    canReadAll: auth.permissions.canReadAllPersonnelFiles,
    canReadDepartment: auth.permissions.canReadDepartmentPersonnelFiles,
    viewerDepartmentId: auth.departmentId,
    employeeDepartmentId: membership.departmentId,
  });
  if (!allowed) return "Du har ikke tilgang til denne personalmappen";
  return null;
}

export async function createCompetenceStatement(input: unknown) {
  try {
    const auth = await getAuthContext();
    if (!auth) return { success: false as const, error: "Ikke innlogget" };
    const data = CreateCompetenceStatementSchema.parse(input);
    const denied = await assertCanEditCompetence(auth, data.userId);
    if (denied) return { success: false as const, error: denied };

    await prisma.competenceStatement.create({
      data: {
        tenantId: auth.tenantId,
        userId: data.userId,
        dimension: data.dimension,
        statement: data.statement,
      },
    });
    revalidateEmployee(data.userId);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke lagre konkretiseringen") };
  }
}

export async function setCompetenceRating(input: unknown) {
  try {
    const auth = await getAuthContext();
    if (!auth) return { success: false as const, error: "Ikke innlogget" };
    const data = SetCompetenceRatingSchema.parse(input);
    const denied = await assertCanEditCompetence(auth, data.userId);
    if (denied) return { success: false as const, error: denied };

    const statement = await prisma.competenceStatement.findFirst({
      where: { id: data.statementId, tenantId: auth.tenantId, userId: data.userId },
      select: { id: true },
    });
    if (!statement) return { success: false as const, error: "Konkretiseringen finnes ikke" };

    let reviewId: string | null = null;
    if (data.reviewId) {
      const review = await prisma.employeeReview.findFirst({
        where: { id: data.reviewId, tenantId: auth.tenantId, employeeId: data.userId },
        select: { id: true },
      });
      if (!review) return { success: false as const, error: "Samtalen finnes ikke for denne ansatte" };
      reviewId = review.id;
    }

    await prisma.employeeCompetenceRating.upsert({
      where: { userId_statementId: { userId: data.userId, statementId: data.statementId } },
      create: {
        tenantId: auth.tenantId,
        userId: data.userId,
        statementId: data.statementId,
        level: data.level,
        comment: data.comment || null,
        reviewId,
        assessedById: auth.userId,
      },
      update: {
        level: data.level,
        comment: data.comment || null,
        reviewId,
        assessedAt: new Date(),
        assessedById: auth.userId,
      },
    });
    revalidateEmployee(data.userId);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke lagre vurderingen") };
  }
}

export async function deleteCompetenceStatement(input: unknown) {
  try {
    const auth = await getAuthContext();
    if (!auth) return { success: false as const, error: "Ikke innlogget" };
    const data = DeleteCompetenceStatementSchema.parse(input);
    const denied = await assertCanEditCompetence(auth, data.userId);
    if (denied) return { success: false as const, error: denied };

    const statement = await prisma.competenceStatement.findFirst({
      where: { id: data.statementId, tenantId: auth.tenantId, userId: data.userId },
      select: { id: true },
    });
    if (!statement) return { success: false as const, error: "Konkretiseringen finnes ikke" };

    await prisma.competenceStatement.delete({ where: { id: statement.id } });
    revalidateEmployee(data.userId);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke slette konkretiseringen") };
  }
}

export async function copyCompetenceFromProfiles(input: unknown) {
  try {
    const auth = await getAuthContext();
    if (!auth) return { success: false as const, error: "Ikke innlogget" };
    const data = CopyCompetenceStatementsSchema.parse(input);
    const denied = await assertCanEditCompetence(auth, data.userId);
    if (denied) return { success: false as const, error: denied };

    const [templates, existing] = await Promise.all([
      prisma.competenceStatement.findMany({
        where: {
          tenantId: auth.tenantId,
          userId: null,
          profile: { users: { some: { userId: data.userId, tenantId: auth.tenantId } } },
        },
        select: { dimension: true, statement: true, sortOrder: true },
      }),
      prisma.competenceStatement.findMany({
        where: { tenantId: auth.tenantId, userId: data.userId },
        select: { dimension: true, statement: true },
      }),
    ]);

    const existingKeys = new Set(existing.map((row) => `${row.dimension}:${row.statement.trim()}`));
    const toCreate = templates.filter((row) => !existingKeys.has(`${row.dimension}:${row.statement.trim()}`));
    if (toCreate.length === 0) {
      return { success: false as const, error: "Ingen nye konkretiseringer å hente fra kompetanseprofilen" };
    }

    await prisma.competenceStatement.createMany({
      data: toCreate.map((row) => ({
        tenantId: auth.tenantId,
        userId: data.userId,
        dimension: row.dimension,
        statement: row.statement.trim(),
        sortOrder: row.sortOrder,
      })),
    });
    revalidateEmployee(data.userId);
    return { success: true as const, data: { created: toCreate.length } };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke hente konkretiseringer") };
  }
}

export async function createProfileCompetenceStatement(input: unknown) {
  try {
    const auth = await getAuthContext();
    if (!auth?.permissions.canCreateTraining) {
      return { success: false as const, error: "Du har ikke tilgang til å redigere kompetanseprofiler" };
    }
    const data = CreateProfileCompetenceStatementSchema.parse(input);
    const profile = await prisma.competenceProfile.findFirst({
      where: { id: data.profileId, tenantId: auth.tenantId },
      select: { id: true },
    });
    if (!profile) return { success: false as const, error: "Profilen finnes ikke" };

    await prisma.competenceStatement.create({
      data: {
        tenantId: auth.tenantId,
        profileId: data.profileId,
        dimension: data.dimension,
        statement: data.statement,
      },
    });
    revalidatePath(`/dashboard/training/profiler/${data.profileId}`);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke lagre konkretiseringen") };
  }
}

export async function deleteProfileCompetenceStatement(input: unknown) {
  try {
    const auth = await getAuthContext();
    if (!auth?.permissions.canCreateTraining) {
      return { success: false as const, error: "Du har ikke tilgang til å redigere kompetanseprofiler" };
    }
    const data = DeleteProfileCompetenceStatementSchema.parse(input);
    const statement = await prisma.competenceStatement.findFirst({
      where: {
        id: data.statementId,
        tenantId: auth.tenantId,
        profileId: data.profileId,
        userId: null,
      },
      select: { id: true },
    });
    if (!statement) return { success: false as const, error: "Konkretiseringen finnes ikke" };

    await prisma.competenceStatement.delete({ where: { id: statement.id } });
    revalidatePath(`/dashboard/training/profiler/${data.profileId}`);
    return { success: true as const };
  } catch (error: unknown) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke slette konkretiseringen") };
  }
}
