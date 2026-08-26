"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { CorporateGroupRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "HMS Nova <noreply@hmsnova.no>";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%&*";
  const all = upper + lower + digits + special;
  let pw = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  for (let i = pw.length; i < 12; i++) {
    pw.push(all[Math.floor(Math.random() * all.length)]);
  }
  return pw.sort(() => Math.random() - 0.5).join("");
}

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Ikke autentisert");
  if (!session.user.isSuperAdmin && !session.user.isSupport) {
    throw new Error("Krever superadmin-tilgang");
  }
  return session.user;
}

export async function listAllCorporateGroups() {
  await requireSuperAdmin();

  return prisma.corporateGroup.findMany({
    include: {
      _count: {
        select: { tenants: true, users: true, content: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCorporateGroupAdmin(groupId: string) {
  await requireSuperAdmin();

  return prisma.corporateGroup.findUnique({
    where: { id: groupId },
    include: {
      tenants: {
        include: {
          tenant: {
            select: { id: true, name: true, slug: true, orgNumber: true, status: true, city: true },
          },
        },
      },
      users: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      _count: {
        select: { content: true, distributions: true },
      },
    },
  });
}

export async function createCorporateGroup(data: {
  name: string;
  slug: string;
  orgNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
}) {
  await requireSuperAdmin();

  const existing = await prisma.corporateGroup.findUnique({
    where: { slug: data.slug },
  });

  if (existing) {
    throw new Error("Slug er allerede i bruk");
  }

  const group = await prisma.corporateGroup.create({
    data: {
      name: data.name,
      slug: data.slug,
      orgNumber: data.orgNumber,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
    },
  });

  // Auto-opprett morselskap-tenant med samme navn
  const tenantSlug = `konsern-${data.slug}`;
  let parentTenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });

  if (!parentTenant) {
    parentTenant = await prisma.tenant.create({
      data: {
        name: data.name,
        slug: tenantSlug,
        orgNumber: data.orgNumber,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        status: "ACTIVE",
        onboardingStatus: "COMPLETED",
      },
    });

    await prisma.corporateGroupTenant.create({
      data: { groupId: group.id, tenantId: parentTenant.id },
    });
  }

  // Opprett admin-bruker og send velkomst-e-post hvis kontakt-e-post er oppgitt
  if (data.contactEmail) {
    const password = generatePassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    let user = await prisma.user.findUnique({
      where: { email: data.contactEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: data.contactEmail,
          name: data.name,
          password: hashedPassword,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
    }

    // Knytt bruker til konsernet som GROUP_ADMIN
    const existingGroupUser = await prisma.corporateGroupUser.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: user.id } },
    });

    if (!existingGroupUser) {
      await prisma.corporateGroupUser.create({
        data: { groupId: group.id, userId: user.id, role: "GROUP_ADMIN" },
      });
    }

    // Knytt bruker til morselskap-tenant som ADMIN (gir tilgang til bedrift-dashboard)
    const existingUserTenant = await prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId: parentTenant.id } },
    });

    if (!existingUserTenant) {
      await prisma.userTenant.create({
        data: { userId: user.id, tenantId: parentTenant.id, role: "ADMIN" },
      });
    }

    if (process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: data.contactEmail,
          subject: `Du er konsern-administrator for ${data.name} – HMS Nova`,
          html: `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
  <tr><td style="background:linear-gradient(135deg,#0d9488,#0f766e);padding:32px 40px;text-align:center;">
    <img src="${BASE_URL}/logo-nova.png" alt="HMS Nova" style="width:120px;height:auto;margin-bottom:12px;">
    <h1 style="color:#fff;font-size:22px;margin:0;">Konsern-administrator</h1>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <p style="font-size:16px;color:#333;">Hei,</p>
    <p style="color:#555;line-height:1.6;">
      Du er nå opprettet som <strong>konsern-administrator</strong> for <strong>${data.name}</strong> i HMS Nova.
      Som konsern-admin kan du administrere alle bedrifter i konsernet, distribuere HMS-innhold
      og følge opp HMS-status på tvers av organisasjonen.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:8px;margin:24px 0;">
    <tr><td style="padding:20px 24px;">
      <p style="margin:0 0 8px;font-size:13px;color:#666;text-transform:uppercase;letter-spacing:0.5px;">Dine innloggingsdetaljer</p>
      <table cellpadding="0" cellspacing="0">
        <tr><td style="padding:4px 0;color:#888;font-size:14px;width:80px;">E-post:</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#333;">${data.contactEmail}</td></tr>
        <tr><td style="padding:4px 0;color:#888;font-size:14px;">Passord:</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#333;font-family:monospace;letter-spacing:1px;">${password}</td></tr>
      </table>
    </td></tr>
    </table>
    <div style="text-align:center;margin:28px 0;">
      <a href="${BASE_URL}/login" style="background:#0d9488;color:#fff;padding:14px 36px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;font-size:15px;">Logg inn nå</a>
    </div>
    <p style="color:#ef4444;font-size:13px;line-height:1.5;">
      Vi anbefaler at du endrer passordet ditt etter første innlogging.
    </p>
  </td></tr>
  <tr><td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;color:#9ca3af;font-size:12px;">HMS Nova · Ditt digitale HMS-system · <a href="mailto:post@hmsnova.no" style="color:#0d9488;">post@hmsnova.no</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
        });
      } catch {
        // E-postfeil skal ikke stoppe opprettelsen
      }
    }
  }

  revalidatePath("/admin/konsern");
  return group;
}

export async function adminAddTenantToGroup(groupId: string, tenantId: string) {
  await requireSuperAdmin();

  const existing = await prisma.corporateGroupTenant.findUnique({
    where: { groupId_tenantId: { groupId, tenantId } },
  });

  if (existing) {
    if (existing.status === "REMOVED") {
      await prisma.corporateGroupTenant.update({
        where: { id: existing.id },
        data: { status: "ACTIVE", joinedAt: new Date() },
      });
    } else {
      throw new Error("Bedriften er allerede tilknyttet konsernet");
    }
  } else {
    await prisma.corporateGroupTenant.create({
      data: { groupId, tenantId },
    });
  }

  revalidatePath("/admin/konsern");
}

export async function adminRemoveTenantFromGroup(groupId: string, tenantId: string) {
  await requireSuperAdmin();

  await prisma.corporateGroupTenant.update({
    where: { groupId_tenantId: { groupId, tenantId } },
    data: { status: "REMOVED" },
  });

  revalidatePath("/admin/konsern");
}

export async function adminAddUserToGroup(
  groupId: string,
  userId: string,
  role: CorporateGroupRole
) {
  await requireSuperAdmin();

  await prisma.corporateGroupUser.create({
    data: { groupId, userId, role },
  });

  revalidatePath("/admin/konsern");
}

export async function adminRemoveUserFromGroup(groupId: string, userId: string) {
  await requireSuperAdmin();

  await prisma.corporateGroupUser.delete({
    where: { groupId_userId: { groupId, userId } },
  });

  revalidatePath("/admin/konsern");
}

export async function getAvailableUsersForGroup() {
  await requireSuperAdmin();

  return prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
    take: 500,
  });
}

export async function getAvailableTenantsForGroup() {
  await requireSuperAdmin();

  return prisma.tenant.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
}

export async function deleteCorporateGroup(groupId: string) {
  await requireSuperAdmin();

  const group = await prisma.corporateGroup.findUnique({
    where: { id: groupId },
    include: {
      tenants: { select: { tenantId: true } },
    },
  });

  if (!group) throw new Error("Konsernet finnes ikke");

  // Finn morselskap-tenant (auto-opprettet med slug `konsern-{slug}`)
  const parentTenantSlug = `konsern-${group.slug}`;
  const parentTenant = await prisma.tenant.findUnique({
    where: { slug: parentTenantSlug },
  });

  await prisma.$transaction(async (tx) => {
    await tx.corporateGroupDistribution.deleteMany({ where: { groupId } });
    await tx.corporateGroupContent.deleteMany({ where: { groupId } });
    await tx.corporateGroupAuditLog.deleteMany({ where: { groupId } });
    await tx.corporateGroupUser.deleteMany({ where: { groupId } });
    await tx.corporateGroupTenant.deleteMany({ where: { groupId } });
    await tx.corporateGroup.delete({ where: { id: groupId } });

    // Slett morselskap-tenant og tilhørende data
    if (parentTenant) {
      await tx.userTenant.deleteMany({ where: { tenantId: parentTenant.id } });
      await tx.tenant.delete({ where: { id: parentTenant.id } });
    }
  });

  revalidatePath("/admin/konsern");
}
