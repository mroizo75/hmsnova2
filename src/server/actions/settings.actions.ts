"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { AuditLog } from "@/lib/audit-log";
import { Role } from "@prisma/client";

async function getSessionContext() {
  const tenantContext = await getRequiredTenantContext();

  const user = await prisma.user.findUnique({
    where: { id: tenantContext.userId },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    throw new Error("User not associated with a tenant");
  }

  return { user, tenantId: tenantContext.tenantId };
}

const VALID_ROLES: Role[] = ["ADMIN", "HMS", "LEDER", "VERNEOMBUD", "ANSATT", "BHT", "REVISOR"];
const ROLE_ALIASES: Record<string, Role> = {
  administrator: "ADMIN",
  admin: "ADMIN",
  leder: "LEDER",
  hms: "HMS",
  "hms-ansvarlig": "HMS",
  verneombud: "VERNEOMBUD",
  ansatt: "ANSATT",
  bht: "BHT",
  "bedriftshelsetjeneste": "BHT",
  revisor: "REVISOR",
};

function normalizeRole(value: string): Role | null {
  const key = value.trim().toLowerCase().replace(/\s+/g, "-");
  if (VALID_ROLES.includes(value.trim().toUpperCase() as Role)) {
    return value.trim().toUpperCase() as Role;
  }
  return ROLE_ALIASES[key] ?? null;
}

const MAX_IMPORT_ROWS = 500;
const MAX_IMPORT_FILE_SIZE = 2 * 1024 * 1024; // 2MB

interface ImportRow {
  email: string;
  name: string;
  role: Role;
}

function parseCsvToRows(buffer: Buffer): ImportRow[] {
  const text = buffer.toString("utf-8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows: ImportRow[] = [];
  const sep = lines[0]?.includes(";") ? ";" : ",";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cells = line.split(sep).map((c) => c.replace(/^"|"$/g, "").trim());
    if (cells.length < 3) continue;
    const [emailRaw, nameRaw, roleRaw] = cells;
    const email = emailRaw?.toLowerCase().trim() ?? "";
    const name = nameRaw?.trim() ?? "";
    const role = normalizeRole(roleRaw ?? "");
    if (!email || !name || !role) continue;
    const isHeader =
      i === 0 &&
      (email === "email" || email === "e-post" || name.toLowerCase() === "navn" || role.toLowerCase() === "rolle");
    if (isHeader) continue;
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValid) continue;
    if (!VALID_ROLES.includes(role)) continue;
    rows.push({ email, name, role });
  }
  return rows;
}

async function parseExcelToRows(buffer: Buffer): Promise<ImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0]);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const rows: ImportRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    const cells = row.values as (string | number | undefined)[];
    const email = String(cells[1] ?? "").toLowerCase().trim();
    const name = String(cells[2] ?? "").trim();
    const role = normalizeRole(String(cells[3] ?? ""));
    if (!email || !name || !role) return;
    const isHeader =
      rowNumber === 1 &&
      (email === "email" || email === "e-post" || name.toLowerCase() === "navn" || role.toLowerCase() === "rolle");
    if (isHeader) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (!VALID_ROLES.includes(role)) return;
    rows.push({ email, name, role });
  });
  return rows;
}

// ============================================================================
// TENANT SETTINGS
// ============================================================================

export async function updateTenantSettings(data: {
  name: string;
  orgNumber?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  hmsContactName?: string;
  hmsContactPhone?: string;
  hmsContactEmail?: string;
}) {
  try {
    const { user, tenantId } = await getSessionContext();

    // Sjekk om bruker er admin
    const userTenant = user.tenants.find((t) => t.tenantId === tenantId);
    if (!userTenant || userTenant.role !== "ADMIN") {
      return { success: false, error: "Kun administratorer kan endre bedriftsinnstillinger" };
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: data.name,
        orgNumber: data.orgNumber,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        hmsContactName: data.hmsContactName,
        hmsContactPhone: data.hmsContactPhone,
        hmsContactEmail: data.hmsContactEmail,
      },
    });

    await AuditLog.log(tenantId, user.id, "TENANT_SETTINGS_UPDATED", "Tenant", tenantId, {
      name: tenant.name,
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    return { success: true, data: tenant };
  } catch (error: any) {
    console.error("Update tenant settings error:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere innstillinger" };
  }
}

export async function updateDashboardLocked(locked: boolean) {
  try {
    const { user, tenantId } = await getSessionContext();

    const userTenant = user.tenants.find((t) => t.tenantId === tenantId);
    if (!userTenant || userTenant.role !== "ADMIN") {
      return { success: false, error: "Kun administratorer kan endre dashboard-innstillinger" };
    }

    let lockedDashboardConfig: import("@prisma/client").Prisma.InputJsonValue | null = null;

    if (locked) {
      const adminConfig = await prisma.dashboardConfig.findUnique({
        where: { userId_tenantId: { userId: user.id, tenantId } },
        select: { widgets: true },
      });

      if (adminConfig?.widgets) {
        lockedDashboardConfig = adminConfig.widgets as import("@prisma/client").Prisma.InputJsonValue;
      } else {
        const { getDefaultWidgetIdsForIndustry } = await import("@/features/dashboard/lib/widget-registry");
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { industry: true },
        });
        const defaultIds = getDefaultWidgetIdsForIndustry(tenant?.industry);
        lockedDashboardConfig = defaultIds.map((id, i) => ({
          id,
          order: i,
          type: "builtin",
        })) as unknown as import("@prisma/client").Prisma.InputJsonValue;
      }
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        dashboardLocked: locked,
        lockedDashboardConfig,
      },
    });

    await AuditLog.log(tenantId, user.id, "DASHBOARD_LOCK_TOGGLED", "Tenant", tenantId, {
      locked,
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke oppdatere dashboard-lås" };
  }
}

export async function updateTenantSimpleMenuItems(hrefs: string[]) {
  try {
    const { user, tenantId } = await getSessionContext();

    const userTenant = user.tenants.find((t) => t.tenantId === tenantId);
    if (!userTenant || userTenant.role !== "ADMIN") {
      return { success: false, error: "Kun administratorer kan endre enkel meny" };
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { simpleMenuItems: hrefs },
    });

    await AuditLog.log(tenantId, user.id, "TENANT_SIMPLE_MENU_UPDATED", "Tenant", tenantId, {
      count: hrefs.length,
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Update simple menu error:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere enkel meny" };
  }
}

// ============================================================================
// USER SETTINGS
// ============================================================================

export async function updateUserProfile(data: { name?: string; email?: string; preferredLocale?: string }) {
  try {
    const { user } = await getSessionContext();
    const allowedLocales = new Set(["nb", "en"]);
    const preferredLocale = data.preferredLocale && allowedLocales.has(data.preferredLocale)
      ? data.preferredLocale
      : undefined;

    // Sjekk om e-post allerede eksisterer (hvis endret)
    if (data.email && data.email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        return { success: false, error: "E-postadressen er allerede i bruk" };
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: data.name,
        email: data.email,
        ...(preferredLocale ? { preferredLocale } : {}),
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, data: updatedUser };
  } catch (error: any) {
    console.error("Update user profile error:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere profil" };
  }
}

export async function updateUserPassword(data: {
  currentPassword: string;
  newPassword: string;
}) {
  try {
    const { user } = await getSessionContext();

    // Verifiser nåværende passord
    if (!user.password) {
      return { success: false, error: "Ugyldig bruker" };
    }

    const isValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isValid) {
      return { success: false, error: "Nåværende passord er feil" };
    }

    // Hash nytt passord
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Update password error:", error);
    return { success: false, error: error.message || "Kunne ikke endre passord" };
  }
}

// ============================================================================
// USER MANAGEMENT (Admin only)
// ============================================================================

export async function getTenantUsers() {
  try {
    const { tenantId } = await getSessionContext();

    const userTenants = await prisma.userTenant.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: userTenants };
  } catch (error: any) {
    console.error("Get tenant users error:", error);
    return { success: false, error: error.message || "Kunne ikke hente brukere" };
  }
}

type InviteContext = {
  user: Awaited<ReturnType<typeof getSessionContext>>["user"];
  tenantId: string;
  tenantName: string;
};

async function inviteSingleUser(ctx: InviteContext, data: { email: string; name: string; role: string }): Promise<{ success: true } | { success: false; error: string }> {
  const normalizedEmail = data.email.toLowerCase().trim();

  let existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    const inTenant = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: { userId: existingUser.id, tenantId: ctx.tenantId },
      },
    });
    if (inTenant) {
      return { success: false, error: `${normalizedEmail} er allerede medlem` };
    }
  }

  const generateSecurePassword = () => {
    const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 16; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };
  const tempPassword = generateSecurePassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  if (!existingUser) {
    existingUser = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: data.name,
          password: hashedPassword,
        },
      });

      await tx.userTenant.create({
        data: {
          userId: createdUser.id,
          tenantId: ctx.tenantId,
          role: data.role as Role,
          invitationSentAt: new Date(),
        },
      });

      return createdUser;
    });
  } else {
    existingUser = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: existingUser!.id },
        data: { password: hashedPassword },
      });

      await tx.userTenant.create({
        data: {
          userId: updatedUser.id,
          tenantId: ctx.tenantId,
          role: data.role as Role,
          invitationSentAt: new Date(),
        },
      });

      return updatedUser;
    });
  }

  try {
    const { sendUserInvitationEmail } = await import("@/lib/email-service");
    await sendUserInvitationEmail({
      to: normalizedEmail,
      userName: data.name,
      userEmail: normalizedEmail,
      tempPassword,
      companyName: ctx.tenantName,
      invitedByName: ctx.user.name || ctx.user.email,
    });
  } catch {
    // Bruker er opprettet; epost feilet
  }

  await AuditLog.log(ctx.tenantId, ctx.user.id, "USER_INVITED", "User", existingUser.id, {
    email: normalizedEmail,
    role: data.role,
  });

  return { success: true };
}

export async function inviteUser(data: { email: string; name: string; role: string }) {
  try {
    const { user, tenantId } = await getSessionContext();

    const userTenant = user.tenants.find((t) => t.tenantId === tenantId);
    if (!userTenant || userTenant.role !== "ADMIN") {
      return { success: false, error: "Kun administratorer kan invitere brukere" };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { pricingTier: true, name: true },
    });
    if (!tenant) {
      return { success: false, error: "Tenant ikke funnet" };
    }

    const currentUserCount = await prisma.userTenant.count({ where: { tenantId } });
    const { getSubscriptionLimits } = await import("@/lib/subscription");
    const limits = getSubscriptionLimits(tenant.pricingTier as any);
    if (currentUserCount >= limits.maxUsers) {
      return {
        success: false,
        error: `Du har nådd maks antall brukere (${limits.maxUsers}) for din pakke. Kontakt support for å oppgradere.`,
      };
    }

    const ctx: InviteContext = {
      user,
      tenantId,
      tenantName: tenant.name || "Bedrift",
    };
    const result = await inviteSingleUser(ctx, data);

    if (!result.success) {
      const err = "error" in result ? result.error : "Kunne ikke invitere bruker";
      return { success: false, error: err };
    }

    revalidatePath("/dashboard/settings");
    return { success: true, data: {} };
  } catch (error: any) {
    console.error("Invite user error:", error);
    return { success: false, error: error.message || "Kunne ikke invitere bruker" };
  }
}

export type ImportUsersResult =
  | { success: true; imported: number; skipped: number; errors: string[] }
  | { success: false; error: string };

export async function importUsersFromFile(formData: FormData): Promise<ImportUsersResult> {
  try {
    const { user, tenantId } = await getSessionContext();

    const userTenant = user.tenants.find((t) => t.tenantId === tenantId);
    if (!userTenant || userTenant.role !== "ADMIN") {
      return { success: false, error: "Kun administratorer kan importere brukere" };
    }

    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File)) {
      return { success: false, error: "Ingen fil valgt" };
    }

    if (file.size > MAX_IMPORT_FILE_SIZE) {
      return { success: false, error: "Filen er for stor. Maks 2 MB." };
    }

    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (ext !== ".csv" && ext !== ".xlsx") {
      return { success: false, error: "Kun CSV eller Excel (.xlsx) er tillatt" };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { pricingTier: true },
    });
    if (!tenant) {
      return { success: false, error: "Tenant ikke funnet" };
    }

    const currentUserCount = await prisma.userTenant.count({ where: { tenantId } });
    const { getSubscriptionLimits } = await import("@/lib/subscription");
    const limits = getSubscriptionLimits(tenant.pricingTier as any);

    let rows: ImportRow[];
    const buffer = Buffer.from(await file.arrayBuffer());

    if (ext === ".csv") {
      rows = parseCsvToRows(buffer);
    } else {
      rows = await parseExcelToRows(buffer);
    }

    if (rows.length === 0) {
      return { success: false, error: "Ingen gyldige rader i filen. Bruk kolonner: e-post, navn, rolle." };
    }

    if (rows.length > MAX_IMPORT_ROWS) {
      return {
        success: false,
        error: `Maks ${MAX_IMPORT_ROWS} brukere per import. Filen inneholder ${rows.length} rader.`,
      };
    }

    if (currentUserCount + rows.length > limits.maxUsers && limits.maxUsers !== 999) {
      return {
        success: false,
        error: `Importen vil overskride brukergrensen (${limits.maxUsers}). Du har ${currentUserCount} brukere.`,
      };
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const normalizedEmail = row.email.toLowerCase().trim();

      let existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      const existingInTenant = existingUser
        ? await prisma.userTenant.findUnique({
            where: {
              userId_tenantId: { userId: existingUser.id, tenantId },
            },
          })
        : null;

      if (existingInTenant) {
        skipped++;
        continue;
      }

      if (!existingUser) {
        existingUser = await prisma.$transaction(async (tx) => {
          const createdUser = await tx.user.create({
            data: {
              email: normalizedEmail,
              name: row.name,
              password: null,
            },
          });

          await tx.userTenant.create({
            data: {
              userId: createdUser.id,
              tenantId,
              role: row.role,
              invitationSentAt: null,
            },
          });

          return createdUser;
        });
      } else {
        await prisma.userTenant.create({
          data: {
            userId: existingUser.id,
            tenantId,
            role: row.role,
            invitationSentAt: null,
          },
        });
      }
      imported++;
    }

    await AuditLog.log(tenantId, user.id, "USERS_IMPORTED", "User", "", {
      imported,
      skipped,
      total: rows.length,
    });

    revalidatePath("/dashboard/settings");
    return { success: true, imported, skipped, errors };
  } catch (error: any) {
    console.error("Import users error:", error);
    return { success: false, error: error.message || "Kunne ikke importere brukere" };
  }
}

export async function activateUserInTenant(userId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { user, tenantId } = await getSessionContext();

    const adminTenant = user.tenants.find((t) => t.tenantId === tenantId);
    if (!adminTenant || adminTenant.role !== "ADMIN") {
      return { success: false, error: "Kun administratorer kan aktivere brukere" };
    }
    if (userId === user.id) {
      return { success: false, error: "Du kan ikke aktivere deg selv" };
    }

    const userTenant = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: { userId, tenantId },
      },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    if (!userTenant) {
      return { success: false, error: "Bruker ikke funnet i denne bedriften" };
    }
    if (userTenant.invitationSentAt) {
      return { success: false, error: "Brukeren er allerede aktivert" };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    const tenantName = tenant?.name ?? "Bedrift";

    const generateSecurePassword = () => {
      const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
      let password = "";
      for (let i = 0; i < 16; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      return password;
    };
    const tempPassword = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await prisma.userTenant.update({
      where: { id: userTenant.id },
      data: { invitationSentAt: new Date() },
    });

    try {
      const { sendUserInvitationEmail } = await import("@/lib/email-service");
      await sendUserInvitationEmail({
        to: userTenant.user.email,
        userName: userTenant.user.name ?? userTenant.user.email,
        userEmail: userTenant.user.email,
        tempPassword,
        companyName: tenantName,
        invitedByName: user.name || user.email,
      });
    } catch (emailErr) {
      // Bruker er aktivert; logg men ikke feil
    }

    await AuditLog.log(tenantId, user.id, "USER_ACTIVATED", "User", userId, {
      email: userTenant.user.email,
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Activate user error:", error);
    return { success: false, error: error.message || "Kunne ikke aktivere bruker" };
  }
}

export type ActivateAllResult =
  | { success: true; activated: number; failed: number; errors: string[] }
  | { success: false; error: string };

export async function activateAllPendingUsers(): Promise<ActivateAllResult> {
  try {
    const { user, tenantId } = await getSessionContext();

    const adminTenant = user.tenants.find((t) => t.tenantId === tenantId);
    if (!adminTenant || adminTenant.role !== "ADMIN") {
      return { success: false, error: "Kun administratorer kan aktivere brukere" };
    }

    const pending = await prisma.userTenant.findMany({
      where: {
        tenantId,
        invitationSentAt: null,
        userId: { not: user.id },
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    if (pending.length === 0) {
      return { success: false, error: "Ingen brukere å aktivere. Alle importerte brukere er allerede aktiverte." };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    const tenantName = tenant?.name ?? "Bedrift";

    const generateSecurePassword = () => {
      const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
      let password = "";
      for (let i = 0; i < 16; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      return password;
    };

    let activated = 0;
    let failed = 0;
    const errors: string[] = [];
    const { sendUserInvitationEmail } = await import("@/lib/email-service");

    for (const ut of pending) {
      try {
        const tempPassword = generateSecurePassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        await prisma.user.update({
          where: { id: ut.userId },
          data: { password: hashedPassword },
        });

        await prisma.userTenant.update({
          where: { id: ut.id },
          data: { invitationSentAt: new Date() },
        });

        await sendUserInvitationEmail({
          to: ut.user.email,
          userName: ut.user.name ?? ut.user.email,
          userEmail: ut.user.email,
          tempPassword,
          companyName: tenantName,
          invitedByName: user.name || user.email,
        });

        await AuditLog.log(tenantId, user.id, "USER_ACTIVATED", "User", ut.userId, {
          email: ut.user.email,
        });
        activated++;
      } catch (err) {
        failed++;
        errors.push(`${ut.user.email}: ${err instanceof Error ? err.message : "Ukjent feil"}`);
      }
    }

    revalidatePath("/dashboard/settings");
    return { success: true, activated, failed, errors };
  } catch (error: any) {
    console.error("Activate all users error:", error);
    return { success: false, error: error.message ?? "Kunne ikke aktivere brukere" };
  }
}

export async function updateUserRole(userId: string, role: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    // Sjekk om bruker er admin
    const userTenant = user.tenants.find((t) => t.tenantId === tenantId);
    if (!userTenant || userTenant.role !== "ADMIN") {
      return { success: false, error: "Kun administratorer kan endre brukerroller" };
    }

    // Ikke la admin endre sin egen rolle
    if (userId === user.id) {
      return { success: false, error: "Du kan ikke endre din egen rolle" };
    }

    const updatedUserTenant = await prisma.userTenant.update({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
      data: { role: role as any },
    });

    await AuditLog.log(tenantId, user.id, "USER_ROLE_UPDATED", "User", userId, {
      newRole: role,
    });

    revalidatePath("/dashboard/settings");
    return { success: true, data: updatedUserTenant };
  } catch (error: any) {
    console.error("Update user role error:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere rolle" };
  }
}

export async function removeUserFromTenant(userId: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    // Sjekk om bruker er admin
    const userTenant = user.tenants.find((t) => t.tenantId === tenantId);
    if (!userTenant || userTenant.role !== "ADMIN") {
      return { success: false, error: "Kun administratorer kan fjerne brukere" };
    }

    // Ikke la admin fjerne seg selv
    if (userId === user.id) {
      return { success: false, error: "Du kan ikke fjerne deg selv" };
    }

    await prisma.userTenant.delete({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    await AuditLog.log(tenantId, user.id, "USER_REMOVED", "User", userId, {});

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Remove user error:", error);
    return { success: false, error: error.message || "Kunne ikke fjerne bruker" };
  }
}

// ============================================================================
// EMPLOYEE NUMBER
// ============================================================================

export async function updateEmployeeNumber(userId: string, employeeNumber: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    const userTenant = user.tenants.find((t) => t.tenantId === tenantId);
    if (!userTenant || userTenant.role !== "ADMIN") {
      return { success: false, error: "Kun administratorer kan sette ansattnummer" };
    }

    const value = employeeNumber.trim() || null;

    await prisma.userTenant.update({
      where: { userId_tenantId: { userId, tenantId } },
      data: { employeeNumber: value },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke oppdatere ansattnummer" };
  }
}

// ============================================================================
// SUBSCRIPTION & INVOICES
// ============================================================================

export async function getSubscriptionInfo() {
  try {
    const { tenantId } = await getSessionContext();

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: true,
        invoices: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!tenant) {
      return { success: false, error: "Tenant ikke funnet" };
    }

    return { success: true, data: tenant };
  } catch (error: any) {
    console.error("Get subscription info error:", error);
    return { success: false, error: error.message || "Kunne ikke hente abonnementsinformasjon" };
  }
}

// ============================================================================
// MODUL-SYNLIGHET
// ============================================================================

export async function updateModuleVisibility(config: Record<string, string[]>) {
  try {
    const { user, tenantId } = await getSessionContext();

    const userTenant = user.tenants.find((t) => t.tenantId === tenantId);
    if (!userTenant || userTenant.role !== "ADMIN") {
      return { success: false, error: "Kun administratorer kan endre modul-synlighet" };
    }

    const { parseModuleVisibilityConfig } = await import("@/lib/module-visibility");
    const validated = parseModuleVisibilityConfig(config);

    const previous = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { moduleVisibilityConfig: true },
    });

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { moduleVisibilityConfig: validated ?? {} },
    });

    await AuditLog.log(
      tenantId,
      user.id,
      "MODULE_VISIBILITY_UPDATED",
      "Tenant",
      tenantId,
      {
        before: parseModuleVisibilityConfig(previous?.moduleVisibilityConfig),
        after: validated ?? {},
      }
    );

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke oppdatere modul-synlighet" };
  }
}

export async function getModuleVisibilityConfig() {
  try {
    const { tenantId } = await getSessionContext();

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { moduleVisibilityConfig: true },
    });

    const { parseModuleVisibilityConfig } = await import("@/lib/module-visibility");
    const config = parseModuleVisibilityConfig(tenant?.moduleVisibilityConfig);
    return { success: true, data: config };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente modul-synlighet" };
  }
}

