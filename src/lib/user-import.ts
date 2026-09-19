import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { Role } from "@prisma/client";

import { AuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/db";
import { assertNoManagerCycle } from "@/lib/incident-notification-routing";
import { getSubscriptionLimits } from "@/lib/subscription";
import {
  DEFAULT_USER_IMPORT_COLUMNS,
  detectUserImportColumns,
  mapUserImportRow,
  parseUserImportCsv,
  USER_IMPORT_ROLES,
  type UserImportColumnIndex,
  type UserImportParseResult,
  type UserImportRow,
} from "@/lib/user-import-rows";

export const MAX_IMPORT_ROWS = 500;
export const MAX_IMPORT_FILE_SIZE = 2 * 1024 * 1024;

export type ImportUsersResult =
  | { success: true; imported: number; skipped: number; errors: string[] }
  | { success: false; error: string };

export type InviteUserIntoTenantInput = {
  email: string;
  name: string;
  role: string;
  employeeNumber?: string | null;
  position?: string | null;
  departmentId?: string | null;
  managerId?: string | null;
};

export type UserImportActor = {
  id: string;
  name: string | null;
  email: string;
};

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

export async function parseExcelToRows(buffer: Buffer): Promise<UserImportParseResult> {
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

export async function parseUserImportFile(file: File): Promise<
  | { success: true; rows: UserImportRow[]; errors: string[] }
  | { success: false; error: string }
> {
  if (file.size > MAX_IMPORT_FILE_SIZE) {
    return { success: false, error: "Filen er for stor. Maks 2 MB." };
  }

  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  if (ext !== ".csv" && ext !== ".xlsx") {
    return { success: false, error: "Kun CSV eller Excel (.xlsx) er tillatt" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed =
    ext === ".csv" ? parseUserImportCsv(buffer.toString("utf-8")) : await parseExcelToRows(buffer);

  if (parsed.rows.length === 0) {
    return {
      success: false,
      error:
        parsed.errors.length > 0
          ? parsed.errors.slice(0, 5).join(" ")
          : "Ingen gyldige rader i filen. Påkrevd er bare e-post og navn. Rolle, ansattnummer, stilling, avdeling og leder kan stå tomme.",
    };
  }

  if (parsed.rows.length > MAX_IMPORT_ROWS) {
    return {
      success: false,
      error: `Maks ${MAX_IMPORT_ROWS} brukere per import. Filen inneholder ${parsed.rows.length} rader.`,
    };
  }

  return { success: true, rows: parsed.rows, errors: parsed.errors };
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

function createManagerLookup(tenantId: string) {
  return async (userId: string): Promise<string | null> => {
    const membership = await prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      select: { managerId: true },
    });
    return membership?.managerId ?? null;
  };
}

function emptyToNull(value: string | null | undefined, max: number): string | null {
  const text = (value ?? "").trim();
  return text.length > 0 ? text.slice(0, max) : null;
}

export async function importUsersIntoTenant(input: {
  tenantId: string;
  rows: UserImportRow[];
  parseErrors?: string[];
  actor: UserImportActor;
  importedByStaff?: boolean;
}): Promise<ImportUsersResult> {
  const { tenantId, rows, actor } = input;
  const errors: string[] = [...(input.parseErrors ?? [])];

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { pricingTier: true, name: true },
  });
  if (!tenant) {
    return { success: false, error: "Bedrift ikke funnet" };
  }

  const currentUserCount = await prisma.userTenant.count({ where: { tenantId } });
  const limits = getSubscriptionLimits(tenant.pricingTier);
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
      invitedByName: actor.name || actor.email,
    });
    imported++;
  }

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
      } catch (cycleError: unknown) {
        const message = cycleError instanceof Error ? cycleError.message : "Ugyldig leder";
        errors.push(`${row.email}: ${message}`);
      }
    }
  }

  await AuditLog.log(tenantId, actor.id, "USERS_IMPORTED", "User", "", {
    imported,
    skipped,
    total: rows.length,
    managerWarnings: errors.length,
    importedByStaff: Boolean(input.importedByStaff),
  });

  return { success: true, imported, skipped, errors };
}

export async function inviteUserIntoTenant(input: {
  tenantId: string;
  data: InviteUserIntoTenantInput;
  actor: UserImportActor;
  invitedByStaff?: boolean;
}): Promise<{ success: true } | { success: false; error: string }> {
  const { tenantId, data, actor } = input;
  const normalizedEmail = data.email.toLowerCase().trim();

  if (!USER_IMPORT_ROLES.includes(data.role as Role)) {
    return { success: false, error: "Ugyldig rolle" };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { pricingTier: true, name: true },
  });
  if (!tenant) {
    return { success: false, error: "Bedrift ikke funnet" };
  }

  const currentUserCount = await prisma.userTenant.count({ where: { tenantId } });
  const limits = getSubscriptionLimits(tenant.pricingTier);
  if (currentUserCount >= limits.maxUsers && limits.maxUsers !== 999) {
    return {
      success: false,
      error: `Maks antall brukere (${limits.maxUsers}) er nådd.`,
    };
  }

  let existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    const inTenant = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: { userId: existingUser.id, tenantId },
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
      return { success: false, error: "Avdelingen ble ikke funnet" };
    }
    departmentId = match.id;
    department = match.name;
  }

  let managerId = emptyToNull(data.managerId, 64);
  if (managerId === "__no_manager__") managerId = null;
  if (managerId) {
    if (existingUser && managerId === existingUser.id) {
      return { success: false, error: "Brukeren kan ikke være sin egen leder" };
    }
    const manager = await prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId: managerId, tenantId } },
      select: { userId: true },
    });
    if (!manager) {
      return { success: false, error: "Nærmeste leder er ikke medlem i bedriften" };
    }
  }

  const tempPassword = generateSecurePassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 10);
  const needsPassword = !existingUser || !existingUser.password;
  const membershipData = {
    tenantId,
    role: data.role as Role,
    invitationSentAt: new Date(),
    employeeNumber,
    position,
    departmentId,
    department,
    managerId,
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
    companyName: tenant.name || "Bedrift",
    invitedByName: actor.name || actor.email,
  });

  await AuditLog.log(tenantId, actor.id, "USER_INVITED", "User", existingUser.id, {
    email: normalizedEmail,
    role: data.role,
    invitedByStaff: Boolean(input.invitedByStaff),
  });

  return { success: true };
}
