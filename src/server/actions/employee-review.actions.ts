"use server";

/**
 * Server actions for medarbeidersamtale
 *
 * Hjemmel:
 *   AML § 4-2 (2): faglig og personlig utvikling skal legges til rette for
 *   AML § 4-3 (presisert 1. jan 2026): psykososialt arbeidsmiljø
 *   IK-HMS § 5: systematisk HMS-arbeid med dokumentasjon og tiltaksoppfølging
 *   GDPR art. 5 og 9: konfidensialitet og minimering av personopplysninger
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import {
  CreateEmployeeReviewSchema,
  UpdateEmployeeReviewSchema,
  EmployeeReviewGoalSchema,
  EmployeeReviewActionSchema,
  type CreateEmployeeReviewInput,
  type UpdateEmployeeReviewInput,
  type EmployeeReviewGoalInput,
  type EmployeeReviewActionInput,
} from "@/features/employee-reviews/schemas/employee-review.schema";

// ─── Kontekst-hjelper ────────────────────────────────────────────────────────

async function getReviewContext() {
  const auth = await getAuthContext();
  if (!auth) throw new Error("Ikke autentisert");
  const canRead =
    auth.permissions.canReadOwnEmployeeReviews ||
    auth.permissions.canReadAllEmployeeReviews;
  if (!canRead) throw new Error("Ingen tilgang til medarbeidersamtaler");
  return auth;
}

// ─── Hent liste ──────────────────────────────────────────────────────────────

export async function getEmployeeReviews() {
  try {
    const auth = await getReviewContext();
    const { tenantId, userId } = auth;

    const where = auth.permissions.canReadAllEmployeeReviews
      ? { tenantId }
      : { tenantId, OR: [{ employeeId: userId }, { reviewerId: userId }] };

    const reviews = await prisma.employeeReview.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, email: true, image: true } },
        reviewer: { select: { id: true, name: true, email: true, image: true } },
        _count: { select: { goals: true, actions: true } },
      },
      orderBy: { scheduledDate: "desc" },
    });

    return { success: true as const, data: reviews };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke hente medarbeidersamtaler" };
  }
}

// ─── Hent én ─────────────────────────────────────────────────────────────────

export async function getEmployeeReview(id: string) {
  try {
    const auth = await getReviewContext();
    const { tenantId, userId } = auth;

    const review = await prisma.employeeReview.findFirst({
      where: {
        id,
        tenantId,
        ...(auth.permissions.canReadAllEmployeeReviews
          ? {}
          : { OR: [{ employeeId: userId }, { reviewerId: userId }] }),
      },
      include: {
        employee: { select: { id: true, name: true, email: true, image: true } },
        reviewer: { select: { id: true, name: true, email: true, image: true } },
        goals: { orderBy: { createdAt: "asc" } },
        actions: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!review) throw new Error("Medarbeidersamtale ikke funnet");

    return { success: true as const, data: review };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke hente medarbeidersamtalen" };
  }
}

// ─── Opprett samtale ─────────────────────────────────────────────────────────

export async function createEmployeeReview(input: CreateEmployeeReviewInput) {
  try {
    const auth = await getReviewContext();
    if (!auth.permissions.canCreateEmployeeReviews) {
      throw new Error("Du har ikke tilgang til å opprette medarbeidersamtaler");
    }

    const validated = CreateEmployeeReviewSchema.parse(input);

    // Verifiser at ansatt tilhører samme tenant
    const employee = await prisma.userTenant.findFirst({
      where: { userId: validated.employeeId, tenantId: auth.tenantId },
    });
    if (!employee) throw new Error("Ansatt er ikke tilknyttet denne bedriften");

    const review = await prisma.employeeReview.create({
      data: {
        tenantId: auth.tenantId,
        employeeId: validated.employeeId,
        reviewerId: auth.userId,
        scheduledDate: validated.scheduledDate,
        nextReviewDate: validated.nextReviewDate ?? null,
        konfidensielt: validated.konfidensielt,
        status: "PLANLAGT",
      },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true, email: true } },
      },
    });

    revalidatePath("/dashboard/medarbeidersamtale");
    return { success: true as const, data: review };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke opprette medarbeidersamtalen" };
  }
}

// ─── Oppdater samtale ────────────────────────────────────────────────────────

export async function updateEmployeeReview(id: string, input: UpdateEmployeeReviewInput) {
  try {
    const auth = await getReviewContext();
    const { tenantId, userId } = auth;

    const review = await prisma.employeeReview.findFirst({
      where: { id, tenantId },
    });
    if (!review) throw new Error("Medarbeidersamtale ikke funnet");

    const canEdit =
      auth.permissions.canConductEmployeeReviews ||
      review.employeeId === userId;
    if (!canEdit) throw new Error("Du har ikke tilgang til å redigere denne samtalen");

    const validated = UpdateEmployeeReviewSchema.parse(input);

    // Ansatt kan kun oppdatere eget forberedelsesfelt
    const isAnsattUpdate = review.employeeId === userId && !auth.permissions.canConductEmployeeReviews;
    const updateData = isAnsattUpdate
      ? {
          ansattForberedelse: validated.ansattForberedelse,
          ansattMedvirkning: validated.ansattMedvirkning,
          status: review.status === "PLANLAGT" ? ("FORBEREDT" as const) : review.status,
        }
      : validated;

    const updated = await prisma.employeeReview.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/dashboard/medarbeidersamtale");
    revalidatePath(`/dashboard/medarbeidersamtale/${id}`);
    return { success: true as const, data: updated };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke oppdatere medarbeidersamtalen" };
  }
}

// ─── Signering ───────────────────────────────────────────────────────────────

export async function signEmployeeReview(id: string, rolle: "LEDER" | "ANSATT") {
  try {
    const auth = await getReviewContext();
    const { tenantId, userId } = auth;

    const review = await prisma.employeeReview.findFirst({
      where: { id, tenantId },
    });
    if (!review) throw new Error("Medarbeidersamtale ikke funnet");
    if (review.status === "AVBRUTT") throw new Error("Kan ikke signere en avbrutt samtale");
    if (review.status === "PLANLAGT" || review.status === "FORBEREDT") {
      throw new Error("Samtalen må gjennomføres før den kan signeres");
    }

    if (rolle === "ANSATT" && review.employeeId !== userId) {
      throw new Error("Kun den ansatte kan signere på egne vegne");
    }
    if (rolle === "LEDER" && review.reviewerId !== userId && !auth.permissions.canConductEmployeeReviews) {
      throw new Error("Kun lederen kan signere på leders vegne");
    }

    const updateData =
      rolle === "ANSATT"
        ? { signertAvAnsatt: true, ansattSignertAt: new Date() }
        : { signertAvLeder: true, lederSignertAt: new Date() };

    const updated = await prisma.employeeReview.update({
      where: { id },
      data: {
        ...updateData,
        ...(rolle === "ANSATT"
          ? review.signertAvLeder
            ? { status: "SIGNERT" as const }
            : {}
          : review.signertAvAnsatt
          ? { status: "SIGNERT" as const }
          : {}),
      },
    });

    revalidatePath("/dashboard/medarbeidersamtale");
    revalidatePath(`/dashboard/medarbeidersamtale/${id}`);
    return { success: true as const, data: updated };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke signere samtalen" };
  }
}

// ─── Merk som gjennomført ────────────────────────────────────────────────────

export async function markEmployeeReviewCompleted(id: string) {
  try {
    const auth = await getReviewContext();
    if (!auth.permissions.canConductEmployeeReviews) {
      throw new Error("Ingen tilgang til å markere samtalen som gjennomført");
    }

    const review = await prisma.employeeReview.findFirst({
      where: { id, tenantId: auth.tenantId },
    });
    if (!review) throw new Error("Medarbeidersamtale ikke funnet");

    const updated = await prisma.employeeReview.update({
      where: { id },
      data: { status: "GJENNOMFORT", completedDate: new Date() },
    });

    revalidatePath("/dashboard/medarbeidersamtale");
    revalidatePath(`/dashboard/medarbeidersamtale/${id}`);
    return { success: true as const, data: updated };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke oppdatere status" };
  }
}

// ─── Slett samtale ───────────────────────────────────────────────────────────

export async function deleteEmployeeReview(id: string) {
  try {
    const auth = await getReviewContext();
    if (!auth.permissions.canDeleteEmployeeReviews) {
      throw new Error("Ingen tilgang til å slette medarbeidersamtaler");
    }

    const review = await prisma.employeeReview.findFirst({
      where: { id, tenantId: auth.tenantId },
    });
    if (!review) throw new Error("Medarbeidersamtale ikke funnet");

    await prisma.employeeReview.delete({ where: { id } });

    revalidatePath("/dashboard/medarbeidersamtale");
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke slette medarbeidersamtalen" };
  }
}

// ─── Mål: opprett / oppdater / slett ────────────────────────────────────────

export async function upsertEmployeeReviewGoals(
  reviewId: string,
  goals: EmployeeReviewGoalInput[]
) {
  try {
    const auth = await getReviewContext();
    const { tenantId } = auth;

    const review = await prisma.employeeReview.findFirst({
      where: { id: reviewId, tenantId },
    });
    if (!review) throw new Error("Medarbeidersamtale ikke funnet");

    const canEdit =
      auth.permissions.canConductEmployeeReviews ||
      review.employeeId === auth.userId;
    if (!canEdit) throw new Error("Ingen tilgang til å redigere mål");

    const validated = goals.map((g) => EmployeeReviewGoalSchema.parse(g));

    // Slett eksisterende og opprett på nytt (enklest for batch-oppdatering)
    await prisma.employeeReviewGoal.deleteMany({ where: { reviewId } });
    const created = await prisma.employeeReviewGoal.createMany({
      data: validated.map((g) => ({
        reviewId,
        tenantId,
        description: g.description,
        category: g.category,
        status: g.status,
        deadline: g.deadline ?? null,
        note: g.note ?? null,
        overfortTilNeste: g.overfortTilNeste,
      })),
    });

    revalidatePath(`/dashboard/medarbeidersamtale/${reviewId}`);
    return { success: true as const, count: created.count };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke lagre mål" };
  }
}

// ─── Tiltak: opprett / oppdater / slett ─────────────────────────────────────

export async function upsertEmployeeReviewActions(
  reviewId: string,
  actions: EmployeeReviewActionInput[]
) {
  try {
    const auth = await getReviewContext();
    const { tenantId } = auth;

    const review = await prisma.employeeReview.findFirst({
      where: { id: reviewId, tenantId },
    });
    if (!review) throw new Error("Medarbeidersamtale ikke funnet");

    if (!auth.permissions.canConductEmployeeReviews) {
      throw new Error("Ingen tilgang til å redigere tiltak");
    }

    const validated = actions.map((a) => EmployeeReviewActionSchema.parse(a));

    await prisma.employeeReviewAction.deleteMany({ where: { reviewId } });
    const created = await prisma.employeeReviewAction.createMany({
      data: validated.map((a) => ({
        reviewId,
        tenantId,
        description: a.description,
        ansvarlig: a.ansvarlig ?? null,
        dueDate: a.dueDate ?? null,
        completed: a.completed,
        note: a.note ?? null,
      })),
    });

    revalidatePath(`/dashboard/medarbeidersamtale/${reviewId}`);
    return { success: true as const, count: created.count };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke lagre tiltak" };
  }
}

// ─── Hent ansatte for valg i skjema ─────────────────────────────────────────

export async function getEmployeesForReview() {
  try {
    const auth = await getReviewContext();
    if (!auth.permissions.canCreateEmployeeReviews) {
      throw new Error("Ingen tilgang");
    }

    const users = await prisma.userTenant.findMany({
      where: { tenantId: auth.tenantId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { user: { name: "asc" } },
    });

    return {
      success: true as const,
      data: users.map((ut) => ut.user),
    };
  } catch (error: any) {
    return { success: false as const, error: error.message || "Kunne ikke hente ansatte" };
  }
}
