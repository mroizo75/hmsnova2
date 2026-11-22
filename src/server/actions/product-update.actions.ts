"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { Role, type ProductUpdateKind } from "@prisma/client";
import { ZodError, z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import {
  PRODUCT_UPDATE_KINDS,
  productUpdateExcerpt,
  productUpdateNotificationTitle,
} from "@/lib/product-updates";
import { notifyUsersByRoles } from "@/server/actions/notification.actions";

const kindSchema = z.enum(PRODUCT_UPDATE_KINDS);

const draftSchema = z.object({
  kind: kindSchema,
  title: z.string().trim().min(3, "Tittel må være minst 3 tegn").max(120, "Tittel kan være maks 120 tegn"),
  body: z.string().trim().min(10, "Teksten må være minst 10 tegn").max(2000, "Teksten kan være maks 2000 tegn"),
});

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message).join(". ");
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Ikke autentisert");
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, isSuperAdmin: true },
  });
  if (!user?.isSuperAdmin) {
    throw new Error("Kun superadmin kan publisere nyheter");
  }
  return user;
}

function revalidateNews() {
  revalidatePath("/admin/nyheter");
  revalidatePath("/dashboard/nyheter");
}

export async function listProductUpdatesAdmin() {
  try {
    await requireSuperAdmin();
    const updates = await prisma.productUpdate.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { reads: true } },
      },
    });
    return { success: true as const, data: JSON.parse(JSON.stringify(updates)) };
  } catch (error) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke hente nyheter") };
  }
}

export async function saveProductUpdateDraft(input: {
  id?: string;
  kind: ProductUpdateKind;
  title: string;
  body: string;
}) {
  try {
    const admin = await requireSuperAdmin();
    const data = draftSchema.parse(input);

    if (input.id) {
      const existing = await prisma.productUpdate.findUnique({
        where: { id: input.id },
        select: { status: true },
      });
      if (!existing) return { success: false as const, error: "Nyheten ble ikke funnet" };
      if (existing.status !== "DRAFT") {
        return { success: false as const, error: "Bare utkast kan endres" };
      }
      await prisma.productUpdate.update({
        where: { id: input.id },
        data,
      });
    } else {
      await prisma.productUpdate.create({
        data: {
          ...data,
          createdById: admin.id,
        },
      });
    }

    revalidateNews();
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke lagre utkast") };
  }
}

export async function publishProductUpdate(id: string) {
  try {
    await requireSuperAdmin();
    const update = await prisma.productUpdate.findUnique({ where: { id } });
    if (!update) return { success: false as const, error: "Nyheten ble ikke funnet" };
    if (update.status !== "DRAFT") {
      return { success: false as const, error: "Nyheten er allerede publisert" };
    }

    const tenants = await prisma.tenant.findMany({
      where: { status: { in: ["ACTIVE", "TRIAL"] } },
      select: { id: true },
    });

    const title = productUpdateNotificationTitle(update.kind, update.title);
    const message = productUpdateExcerpt(update.body);
    let notified = 0;

    for (const tenant of tenants) {
      const result = await notifyUsersByRoles(tenant.id, [Role.ADMIN, Role.HMS, Role.LEDER], {
        type: "PRODUCT_NEWS",
        title,
        message,
        link: "/dashboard/nyheter",
      });
      if (result.success) notified += 1;
    }

    await prisma.productUpdate.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        notifiedAt: new Date(),
        notifiedTenantCount: notified,
      },
    });

    revalidateNews();
    return { success: true as const, notified };
  } catch (error) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke publisere") };
  }
}

export async function archiveProductUpdate(id: string) {
  try {
    await requireSuperAdmin();
    const update = await prisma.productUpdate.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!update) return { success: false as const, error: "Nyheten ble ikke funnet" };
    if (update.status !== "PUBLISHED") {
      return { success: false as const, error: "Bare publiserte nyheter kan arkiveres" };
    }
    await prisma.productUpdate.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });
    revalidateNews();
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke arkivere") };
  }
}

export async function deleteProductUpdateDraft(id: string) {
  try {
    await requireSuperAdmin();
    const update = await prisma.productUpdate.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!update) return { success: false as const, error: "Nyheten ble ikke funnet" };
    if (update.status !== "DRAFT") {
      return { success: false as const, error: "Bare utkast kan slettes" };
    }
    await prisma.productUpdate.delete({ where: { id } });
    revalidateNews();
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: formatActionError(error, "Kunne ikke slette utkast") };
  }
}

const publicSelect = {
  id: true,
  kind: true,
  title: true,
  body: true,
  publishedAt: true,
} as const;

export async function openProductUpdateFeed() {
  const context = await getAuthContext();
  if (!context) {
    return { success: false as const, error: "Ikke autentisert" };
  }

  const updates = await prisma.productUpdate.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 50,
    select: publicSelect,
  });

  if (updates.length > 0) {
    await prisma.productUpdateRead.createMany({
      data: updates.map((update) => ({
        updateId: update.id,
        userId: context.userId,
      })),
      skipDuplicates: true,
    });
  }

  return {
    success: true as const,
    data: updates.map((update) => ({
      ...update,
      publishedAt: update.publishedAt?.toISOString() ?? null,
    })),
  };
}

export async function getUnreadProductUpdateCount() {
  try {
    const context = await getAuthContext();
    if (!context) return 0;

    const published = await prisma.productUpdate.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true },
    });
    if (published.length === 0) return 0;

    const read = await prisma.productUpdateRead.count({
      where: {
        userId: context.userId,
        updateId: { in: published.map((update) => update.id) },
      },
    });

    return Math.max(published.length - read, 0);
  } catch {
    return 0;
  }
}
