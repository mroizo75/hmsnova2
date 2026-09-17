"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { AuditLog } from "@/lib/audit-log";
import { assertNoManagerCycle } from "@/lib/incident-notification-routing";
import { triggerRealtimeEvent } from "@/lib/pusher-server";
import { Role } from "@prisma/client";
import { getInvitableRoles } from "@/lib/permissions";
import { aliasDashboardMenuHrefs } from "@/lib/legal-link-repair";
import {
  DEFAULT_USER_IMPORT_COLUMNS,
  detectUserImportColumns,
  mapUserImportRow,
  parseUserImportCsv,
  type UserImportColumnIndex,
  type UserImportParseResult,
  type UserImportRow,
} from "@/lib/user-import-rows";
import { sendEmail } from "@/lib/email";
import { invalidateAiEnabledCache } from "@/lib/ai";
import {
  AI_ADDON_BILLING_EMAIL,
  AI_ADDON_NET_MONTHLY_NOK,
} from "@/lib/ai-addon";

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

const MAX_IMPORT_ROWS = 500;
const MAX_IMPORT_FILE_SIZE = 2 * 1024 * 1024; // 2MB

function generateSecurePassword() {
  const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

async function sendInvitationEmail(input: {
  to: string;
  userName: string;
  tempPassword?: string;
  companyName: string;
  invitedByName: string;
}) {
  try {
    const { sendUserInvitationEmail } = await import("@/lib/email-service");
    await sendUserInvitationEmail({
      to: input.to,
      userName: input.userName,
      userEmail: input.to,
      tempPassword: input.tempPassword,
      companyName: input.companyName,
      invitedByName: input.invitedByName,
    });
  } catch {
    // Bruker er opprettet; e-post feilet
  }
}

function excelCellToString(cell: unknown): string {
  if (cell == null) return "";
  if (typeof cell === "string" || typeof cell === "number" || typeof cell === "boolean") {
    return String(cell).trim();
  }
  if (cell instanceof Date) return "";
  if (typeof cell === "object") {
    const value = cell as {
      text?: unknown;
      result?: unknown;
      hyperlink?: unknown;
      richText?: Array<{ text?: string }>;
    };
    if (typeof value.text === "string") return value.text.trim();
    if (typeof value.result === "string" || typeof value.result === "number") {
      return String(value.result).trim();
    }
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text ?? "").join("").trim();
    }
    if (typeof value.hyperlink === "string" && value.hyperlink.toLowerCase().startsWith("mailto:")) {
      return value.hyperlink.replace(/^mailto:/i, "").split("?")[0].trim();
    }
  }
  return "";
}

function excelRowCells(row: ExcelJS.Row): string[] {
  const values = row.values;
  if (!Array.isArray(values)) return [];
  return values.slice(1).map((cell) => excelCellToString(cell));
}

async function parseExcelToRows(buffer: Buffer): Promise<UserImportParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0]);
  const sheet = workbook.worksheets.find((item) => item.name === "Brukere") ?? workbook.worksheets[0];
  if (!sheet) return { rows: [], errors: [] };

  const rows: UserImportRow[] = [];
  const errors: string[] = [];
  let columns: UserImportColumnIndex = DEFAULT_USER_IMPORT_COLUMNS;

  sheet.eachRow((row, rowNumber) => {
    const cells = excelRowCells(row);
    if (rowNumber === 1) {
      const detected = detectUserImportColumns(cells);
      if (detected) {
        columns = detected;
        return;
      }
    }
    const mapped = mapUserImportRow(cells, columns, `rad ${rowNumber}`);
    if (mapped.status === "ok") rows.push(mapped.row);
    else if (mapped.status === "error") errors.push(mapped.message);
  });

  return { rows, errors };
}

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
    triggerRealtimeEvent(tenantId, "settings-updated");
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
    triggerRealtimeEvent(tenantId, "settings-updated");
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
      data: { simpleMenuItems: aliasDashboardMenuHrefs(hrefs) ?? hrefs },
    });

    await AuditLog.log(tenantId, user.id, "TENANT_SIMPLE_MENU_UPDATED", "Tenant", tenantId, {
      count: hrefs.length,
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    triggerRealtimeEvent(tenantId, "settings-updated");
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
    const { user, tenantId } = await getSessionContext();
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
    triggerRealtimeEvent(tenantId, "settings-updated");
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
    const { user, tenantId } = await getSessionContext();

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
    triggerRealtimeEvent(tenantId, "settings-updated");
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

export type InviteUserInput = {
  email: string;
  name: string;
  role: string;
  employeeNumber?: string | null;
  position?: string | null;
  departmentId?: string | null;
  managerId?: string | null;
};

type InviteOrgFields = {
  employeeNumber: string | null;
  position: string | null;
  departmentId: string | null;
  department: string | null;
  managerId: string | null;
};

function emptyToNull(value: string | null | undefined, max: number): string | null {
  const text = (value ?? "").trim();
  return text.length > 0 ? text.slice(0, max) : null;
}

async function resolveInviteOrgFields(
  tenantId: string,
  data: InviteUserInput,
  existingUserId: string | null
): Promise<{ ok: true; fields: InviteOrgFields } | { ok: false; error: string }> {
  const employeeNumber = emptyToNull(data.employeeNumber, 40);
  const position = emptyToNull(data.position, 100);

  let departmentId = emptyToNull(data.departmentId, 64);
  if (departmentId === "__none_dept__") departmentId = null;
  let department: string | null = null;
  if (departmentId) {
    const match = await prisma.department.findFirst({
      where: { id: departmentId, tenantId },
      select: { id: true, name: true },
    });
    if (!match) {
      return { ok: false, error: "Avdelingen ble ikke funnet" };
    }
    departmentId = match.id;
    department = match.name;
  }

  let managerId = emptyToNull(data.managerId, 64);
  if (managerId === "__no_manager__") managerId = null;
  if (managerId) {
    if (existingUserId && managerId === existingUserId) {
      return { ok: false, error: "Brukeren kan ikke være sin egen leder" };
    }
    const manager = await prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId: managerId, tenantId } },
      select: { userId: true },
    });
    if (!manager) {
      return { ok: false, error: "Nærmeste leder er ikke medlem i bedriften" };
    }
  }

  return {
    ok: true,
    fields: { employeeNumber, position, departmentId, department, managerId },
  };
}

async function canHaveMultipleTenants(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true, isSupport: true },
  });
  if (user?.isSuperAdmin || user?.isSupport) return true;

  const groupMembership = await prisma.corporateGroupUser.findFirst({
    where: { userId, role: { in: ["GROUP_ADMIN", "GROUP_HMS"] } },
    select: { id: true },
  });
  return Boolean(groupMembership);
}

async function inviteSingleUser(
  ctx: InviteContext,
  data: InviteUserInput
): Promise<{ success: true } | { success: false; error: string }> {
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

    const existingTenantCount = await prisma.userTenant.count({
      where: { userId: existingUser.id },
    });
    if (existingTenantCount > 0) {
      const allowed = await canHaveMultipleTenants(existingUser.id);
      if (!allowed) {
        return {
          success: false,
          error: `${normalizedEmail} er allerede tilknyttet en annen bedrift. En bruker kan kun tilhøre én bedrift.`,
        };
      }
    }
  }

  const org = await resolveInviteOrgFields(ctx.tenantId, data, existingUser?.id ?? null);
  if (org.ok === false) {
    return { success: false, error: org.error };
  }

  const tempPassword = generateSecurePassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  const needsPassword = !existingUser || !existingUser.password;
  const membershipData = {
    tenantId: ctx.tenantId,
    role: data.role as Role,
    invitationSentAt: new Date(),
    ...org.fields,
  };

  if (!existingUser) {
    existingUser = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: data.name,
          password: hashedPassword,
          emailVerified: new Date(),
        },
      });

      await tx.userTenant.create({
        data: {
          userId: createdUser.id,
          ...membershipData,
        },
      });

      return createdUser;
    });
  } else {
    if (needsPassword) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          emailVerified: existingUser.emailVerified ?? new Date(),
        },
      });
    }

    await prisma.userTenant.create({
      data: {
        userId: existingUser.id,
        ...membershipData,
      },
    });
  }

  await sendInvitationEmail({
    to: normalizedEmail,
    userName: existingUser.name || data.name,
    tempPassword: needsPassword ? tempPassword : undefined,
    companyName: ctx.tenantName,
    invitedByName: ctx.user.name || ctx.user.email,
  });

  await AuditLog.log(ctx.tenantId, ctx.user.id, "USER_INVITED", "User", existingUser.id, {
    email: normalizedEmail,
    role: data.role,
  });

  return { success: true };
}

export async function inviteUser(data: InviteUserInput) {
  try {
    const { user, tenantId } = await getSessionContext();

    const userTenant = user.tenants.find((t) => t.tenantId === tenantId);
    if (!userTenant) {
      return { success: false, error: "Ikke innlogget" };
    }
    const allowedRoles = getInvitableRoles(userTenant.role);
    if (allowedRoles.length === 0) {
      return { success: false, error: "Du har ikke tilgang til å invitere brukere" };
    }
    if (!allowedRoles.includes(data.role as Role)) {
      return { success: false, error: "Du kan ikke tildele denne rollen" };
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
    revalidatePath("/dashboard/brukere");
    triggerRealtimeEvent(tenantId, "settings-updated");
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
      select: { pricingTier: true, name: true },
    });
    if (!tenant) {
      return { success: false, error: "Tenant ikke funnet" };
    }

    const currentUserCount = await prisma.userTenant.count({ where: { tenantId } });
    const { getSubscriptionLimits } = await import("@/lib/subscription");
    const limits = getSubscriptionLimits(tenant.pricingTier as any);

    let parsed: UserImportParseResult;
    const buffer = Buffer.from(await file.arrayBuffer());

    if (ext === ".csv") {
      parsed = parseUserImportCsv(buffer.toString("utf-8"));
    } else {
      parsed = await parseExcelToRows(buffer);
    }

    const rows = parsed.rows;
    const errors: string[] = [...parsed.errors];

    if (rows.length === 0) {
      return {
        success: false,
        error:
          errors.length > 0
            ? errors.slice(0, 5).join(" ")
            : "Ingen gyldige rader i filen. Påkrevd er bare e-post og navn. Rolle, ansattnummer, stilling, avdeling og leder kan stå tomme.",
      };
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

    const departments = await prisma.department.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });
    const departmentByName = new Map(
      departments.map((department) => [department.name.trim().toLowerCase(), department] as const)
    );

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

      if (existingUser) {
        const allowed = await canHaveMultipleTenants(existingUser.id);
        if (!allowed) {
          errors.push(`${normalizedEmail} er allerede tilknyttet en annen bedrift`);
          skipped++;
          continue;
        }
      }

      let departmentId: string | null = null;
      let department: string | null = null;
      if (row.departmentName) {
        const match = departmentByName.get(row.departmentName.toLowerCase());
        if (!match) {
          errors.push(`${normalizedEmail}: fant ingen avdeling med navn ${row.departmentName}`);
        } else {
          departmentId = match.id;
          department = match.name;
        }
      }

      const membershipOrg = {
        position: row.position,
        employeeNumber: row.employeeNumber,
        departmentId,
        department,
      };

      const needsPassword = !existingUser || !existingUser.password;
      const tempPassword = generateSecurePassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      if (!existingUser) {
        existingUser = await prisma.$transaction(async (tx) => {
          const createdUser = await tx.user.create({
            data: {
              email: normalizedEmail,
              name: row.name,
              password: hashedPassword,
              emailVerified: new Date(),
            },
          });

          await tx.userTenant.create({
            data: {
              userId: createdUser.id,
              tenantId,
              role: row.role,
              invitationSentAt: new Date(),
              ...membershipOrg,
            },
          });

          return createdUser;
        });
      } else {
        if (needsPassword) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              password: hashedPassword,
              emailVerified: existingUser.emailVerified ?? new Date(),
            },
          });
        }

        await prisma.userTenant.create({
          data: {
            userId: existingUser.id,
            tenantId,
            role: row.role,
            invitationSentAt: new Date(),
            ...membershipOrg,
          },
        });
      }

      await sendInvitationEmail({
        to: normalizedEmail,
        userName: existingUser.name || row.name,
        tempPassword: needsPassword ? tempPassword : undefined,
        companyName: tenant.name || "Bedrift",
        invitedByName: user.name || user.email,
      });
      imported++;
    }

    // Andre runde: koble nærmeste leder når alle rader er opprettet, slik at
    // rekkefølgen i filen ikke spiller noen rolle (AML § 3-1)
    const managerAssignments = rows.filter((row) => row.managerEmail !== null);
    if (managerAssignments.length > 0) {
      const emailsInTenant = await prisma.userTenant.findMany({
        where: { tenantId },
        select: { userId: true, user: { select: { email: true } } },
      });
      const userIdByEmail = new Map(
        emailsInTenant.map((membership) => [
          membership.user.email.toLowerCase(),
          membership.userId,
        ])
      );

      for (const row of managerAssignments) {
        const managerId = userIdByEmail.get(row.managerEmail!);
        const employeeId = userIdByEmail.get(row.email);

        if (!employeeId) continue;
        if (!managerId) {
          errors.push(`${row.email}: fant ingen bruker med leder-e-post ${row.managerEmail}`);
          continue;
        }
        if (managerId === employeeId) {
          errors.push(`${row.email}: kan ikke være sin egen leder`);
          continue;
        }

        try {
          await assertNoManagerCycle(employeeId, managerId, createManagerLookup(tenantId));
          await prisma.userTenant.update({
            where: { userId_tenantId: { userId: employeeId, tenantId } },
            data: { managerId },
          });
        } catch (cycleError: any) {
          errors.push(`${row.email}: ${cycleError.message}`);
        }
      }
    }

    await AuditLog.log(tenantId, user.id, "USERS_IMPORTED", "User", "", {
      imported,
      skipped,
      total: rows.length,
      managerWarnings: errors.length,
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/brukere");
    triggerRealtimeEvent(tenantId, "settings-updated");
    return { success: true, imported, skipped, errors };
  } catch (error: any) {
    console.error("Import users error:", error);
    return { success: false, error: error.message || "Kunne ikke importere brukere" };
  }
}

export async function updateUserRole(userId: string, role: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    // Sjekk om bruker er admin
    const userTenant = user.tenants.find((t) => t.tenantId === tenantId);
    if (!userTenant) {
      return { success: false, error: "Ikke innlogget" };
    }
    const allowedRoles = getInvitableRoles(userTenant.role);
    if (allowedRoles.length === 0) {
      return { success: false, error: "Kun administratorer og HR kan endre brukerroller" };
    }
    if (!allowedRoles.includes(role as Role)) {
      return { success: false, error: "Du kan ikke tildele denne rollen" };
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
    triggerRealtimeEvent(tenantId, "settings-updated");
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
    revalidatePath("/dashboard/brukere");
    triggerRealtimeEvent(tenantId, "settings-updated");
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
    triggerRealtimeEvent(tenantId, "settings-updated");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke oppdatere ansattnummer" };
  }
}

// ============================================================================
// ORGANISASJONSHIERARKI (AML § 3-1: HMS-ansvar plassert i linjen)
// ============================================================================

async function requireAdminContext() {
  const { user, tenantId } = await getSessionContext();
  const userTenant = user.tenants.find((t) => t.tenantId === tenantId);
  if (!userTenant || (userTenant.role !== "ADMIN" && userTenant.role !== "HR")) {
    throw new Error("Kun administrator eller HR kan endre organisasjonshierarkiet");
  }
  return { user, tenantId };
}

function createManagerLookup(tenantId: string) {
  return async (userId: string): Promise<string | null> => {
    const membership = await prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      select: { managerId: true },
    });
    return membership?.managerId ?? null;
  };
}

async function assertMembership(userId: string, tenantId: string) {
  const membership = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
    select: { id: true },
  });
  if (!membership) {
    throw new Error("Brukeren er ikke medlem i denne virksomheten");
  }
}

export async function updateUserManager(userId: string, managerId: string | null) {
  try {
    const { user, tenantId } = await requireAdminContext();
    await assertMembership(userId, tenantId);

    if (managerId) {
      await assertMembership(managerId, tenantId);
      await assertNoManagerCycle(userId, managerId, createManagerLookup(tenantId));
    }

    await prisma.userTenant.update({
      where: { userId_tenantId: { userId, tenantId } },
      data: { managerId },
    });

    await AuditLog.log(tenantId, user.id, "USER_MANAGER_UPDATED", "UserTenant", userId, {
      managerId,
    });

    revalidatePath("/dashboard/settings");
    triggerRealtimeEvent(tenantId, "settings-updated");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke oppdatere nærmeste leder" };
  }
}

export async function updateUserPosition(userId: string, position: string) {
  try {
    const { user, tenantId } = await requireAdminContext();
    await assertMembership(userId, tenantId);

    const value = position.trim().slice(0, 100) || null;

    await prisma.userTenant.update({
      where: { userId_tenantId: { userId, tenantId } },
      data: { position: value },
    });

    await AuditLog.log(tenantId, user.id, "USER_POSITION_UPDATED", "UserTenant", userId, {
      position: value,
    });

    revalidatePath("/dashboard/settings");
    triggerRealtimeEvent(tenantId, "settings-updated");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke oppdatere stilling" };
  }
}

export async function assignManagerToUsers(userIds: string[], managerId: string | null) {
  try {
    const { user, tenantId } = await requireAdminContext();

    const uniqueUserIds = Array.from(new Set(userIds.filter((id) => id.trim().length > 0)));
    if (uniqueUserIds.length === 0) {
      return { success: false, error: "Ingen ansatte er valgt" };
    }
    if (managerId && uniqueUserIds.includes(managerId)) {
      return { success: false, error: "En ansatt kan ikke være sin egen leder" };
    }

    const memberships = await prisma.userTenant.findMany({
      where: { tenantId, userId: { in: uniqueUserIds } },
      select: { userId: true },
    });
    if (memberships.length !== uniqueUserIds.length) {
      return { success: false, error: "En eller flere av de valgte brukerne finnes ikke i virksomheten" };
    }

    if (managerId) {
      await assertMembership(managerId, tenantId);
      const lookup = createManagerLookup(tenantId);
      for (const id of uniqueUserIds) {
        await assertNoManagerCycle(id, managerId, lookup);
      }
    }

    const result = await prisma.userTenant.updateMany({
      where: { tenantId, userId: { in: uniqueUserIds } },
      data: { managerId },
    });

    await AuditLog.log(tenantId, user.id, "USER_MANAGER_BULK_UPDATED", "UserTenant", tenantId, {
      managerId,
      userCount: result.count,
    });

    revalidatePath("/dashboard/settings");
    triggerRealtimeEvent(tenantId, "settings-updated");
    return { success: true, updated: result.count };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke tildele nærmeste leder" };
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
    triggerRealtimeEvent(tenantId, "settings-updated");
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

// ============================================================================
// RUH-MODUL
// ============================================================================

/**
 * Slår RUH-modulen av eller på for virksomheten.
 * IK-HMS § 5 stiller krav om systematisk avviksbehandling, men ikke om at
 * uønskede hendelser må registreres i et eget spor. Virksomheter som samler alt
 * under Avvik kan derfor skjule RUH.
 */
export async function updateRuhModuleEnabled(enabled: boolean) {
  try {
    const { user, tenantId } = await getSessionContext();

    const userTenant = user.tenants.find((t) => t.tenantId === tenantId);
    if (!userTenant || userTenant.role !== "ADMIN") {
      return { success: false, error: "Kun administratorer kan endre RUH-modulen" };
    }

    const previous = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { ruhModuleEnabled: true },
    });

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { ruhModuleEnabled: enabled },
    });

    await AuditLog.log(tenantId, user.id, "RUH_MODULE_UPDATED", "Tenant", tenantId, {
      before: previous?.ruhModuleEnabled ?? true,
      after: enabled,
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/incidents");
    revalidatePath("/ansatt");
    triggerRealtimeEvent(tenantId, "settings-updated");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke oppdatere RUH-modulen" };
  }
}

/**
 * Slår MoC-modulen av eller på. ISO 45001 8.1.3 krever prosess for endringer
 * som påvirker HMS; virksomheter uten formell MoC kan holde den av.
 */
export async function updateMocModuleEnabled(enabled: boolean) {
  try {
    const { user, tenantId } = await getSessionContext();

    const userTenant = user.tenants.find((t) => t.tenantId === tenantId);
    if (!userTenant || userTenant.role !== "ADMIN") {
      return { success: false, error: "Kun administratorer kan endre endringsledelse" };
    }

    const previous = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { mocModuleEnabled: true },
    });

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { mocModuleEnabled: enabled },
    });

    await AuditLog.log(tenantId, user.id, "MOC_MODULE_UPDATED", "Tenant", tenantId, {
      before: previous?.mocModuleEnabled ?? false,
      after: enabled,
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/moc");
    revalidatePath("/ansatt");
    triggerRealtimeEvent(tenantId, "settings-updated");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke oppdatere endringsledelse" };
  }
}

/**
 * Selvbetjent av/på for betalt AI-tillegg (99 kr/mnd + mva).
 * Aktivering varsler faktura; deaktivering slår av AI med en gang.
 */
export async function updateAiSettings(enabled: boolean) {
  try {
    const { user, tenantId } = await getSessionContext();

    const userTenant = user.tenants.find((t) => t.tenantId === tenantId);
    if (!userTenant || userTenant.role !== "ADMIN") {
      return { success: false, error: "Kun administratorer kan endre AI-innstillinger" };
    }

    const previous = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        aiEnabled: true,
        name: true,
        orgNumber: true,
        contactEmail: true,
        invoiceEmail: true,
      },
    });

    const now = new Date();
    await prisma.tenant.update({
      where: { id: tenantId },
      data: enabled
        ? {
            aiEnabled: true,
            speechToTextEnabled: true,
            aiAddonActivatedAt: now,
            aiAddonCanceledAt: null,
          }
        : {
            aiEnabled: false,
            speechToTextEnabled: false,
            aiAddonCanceledAt: now,
          },
    });

    invalidateAiEnabledCache(tenantId);

    await AuditLog.log(tenantId, user.id, "AI_SETTINGS_UPDATED", "Tenant", tenantId, {
      before: previous?.aiEnabled ?? false,
      after: enabled,
    });

    try {
      await sendEmail({
        to: AI_ADDON_BILLING_EMAIL,
        subject: enabled
          ? `HMS Nova AI aktivert: ${previous?.name ?? "Ukjent"}`
          : `HMS Nova AI deaktivert: ${previous?.name ?? "Ukjent"}`,
        html: `<h2>HMS Nova AI ${enabled ? "aktivert" : "deaktivert"}</h2>
<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;">
  <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Bedrift:</td><td>${previous?.name ?? "Ukjent"}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Org.nr:</td><td>${previous?.orgNumber ?? "–"}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Pris:</td><td>kr ${AI_ADDON_NET_MONTHLY_NOK}/mnd + mva</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Endret av:</td><td>${user.name ?? user.email}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Kontakt-e-post:</td><td>${previous?.invoiceEmail ?? previous?.contactEmail ?? "–"}</td></tr>
</table>
<p style="margin-top:16px;font-size:13px;color:#666;">${
          enabled
            ? `Faktura: kr ${AI_ADDON_NET_MONTHLY_NOK}/mnd + mva legges til neste HMS Nova-faktura.`
            : "AI er slått av med en gang. Ingen AI-linje på neste faktura. Ingen refusjon for inneværende måned."
        }</p>`,
      });
    } catch {
      // Ikke blokker aktiveringen om intern varsel feiler
    }

    revalidatePath("/dashboard/settings");
    triggerRealtimeEvent(tenantId, "settings-updated");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke oppdatere AI-innstillinger";
    return { success: false, error: message };
  }
}

export async function updateSpeechToTextSettings(enabled: boolean) {
  try {
    const { user, tenantId } = await getSessionContext();

    const userTenant = user.tenants.find((t) => t.tenantId === tenantId);
    if (!userTenant || userTenant.role !== "ADMIN") {
      return { success: false, error: "Kun administratorer kan endre tale-til-tekst" };
    }

    const previous = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { speechToTextEnabled: true },
    });

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { speechToTextEnabled: enabled },
    });

    await AuditLog.log(tenantId, user.id, "SPEECH_TO_TEXT_SETTINGS_UPDATED", "Tenant", tenantId, {
      before: previous?.speechToTextEnabled ?? false,
      after: enabled,
    });

    revalidatePath("/dashboard/settings");
    triggerRealtimeEvent(tenantId, "settings-updated");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke oppdatere tale-til-tekst" };
  }
}

