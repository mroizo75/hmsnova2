"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import {
  mapPowerOfficeHeaders,
  matchPowerOfficeRow,
  parsePowerOfficeRow,
  type PowerOfficeMatchCandidate,
  type PowerOfficeMatchResult,
} from "@/lib/hr/poweroffice";

function fail(message: string) {
  return { success: false as const, error: message };
}

async function loadCandidates(tenantId: string): Promise<PowerOfficeMatchCandidate[]> {
  const memberships = await prisma.userTenant.findMany({
    where: { tenantId },
    select: {
      id: true,
      userId: true,
      employeeNumber: true,
      user: { select: { email: true, name: true } },
    },
  });
  return memberships.map((membership) => ({
    userId: membership.userId,
    userTenantId: membership.id,
    email: membership.user.email,
    name: membership.user.name,
    employeeNumber: membership.employeeNumber,
  }));
}

async function parseWorkbook(buffer: Buffer): Promise<PowerOfficeMatchResult[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const headers: unknown[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = cell.value;
  });
  const headerMap = mapPowerOfficeHeaders(headers);

  const rows: PowerOfficeMatchResult[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const values: unknown[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      values[col - 1] = cell.value instanceof Date ? cell.value : cell.text || cell.value;
    });
    const parsed = parsePowerOfficeRow(values, headerMap, rowNumber);
    if (parsed) {
      rows.push({ row: parsed, status: "unmatched", matchedUserId: null, reason: "Ikke matchet" });
    }
  });
  return rows;
}

export async function previewPowerOfficeImport(formData: FormData) {
  const auth = await getAuthContext();
  if (!auth?.permissions.canImportHrDirectory) {
    return fail("Kun HR og administrator kan importere personaldata");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return fail("Ingen fil valgt");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parseWorkbook(buffer);
  const candidates = await loadCandidates(auth.tenantId);
  const preview = parsed.map((item) => matchPowerOfficeRow(item.row, candidates));

  return {
    success: true as const,
    data: {
      matched: preview.filter((item) => item.status === "matched").length,
      ambiguous: preview.filter((item) => item.status === "ambiguous").length,
      unmatched: preview.filter((item) => item.status === "unmatched").length,
      rows: preview.map((item) => ({
        rowNumber: item.row.rowNumber,
        name: `${item.row.firstName} ${item.row.lastName}`.trim(),
        email: item.row.email,
        employeeNumber: item.row.employeeNumber,
        department: item.row.department,
        status: item.status,
        matchedUserId: item.matchedUserId,
        reason: item.reason,
        row: item.row,
      })),
    },
  };
}

export async function confirmPowerOfficeImport(input: {
  rows: Array<{
    row: import("@/lib/hr/poweroffice").PowerOfficeRow;
    matchedUserId: string | null;
    skip?: boolean;
  }>;
}) {
  const auth = await getAuthContext();
  if (!auth?.permissions.canImportHrDirectory) {
    return fail("Kun HR og administrator kan importere personaldata");
  }

  const candidates = await loadCandidates(auth.tenantId);
  const candidateByUserId = new Map(candidates.map((c) => [c.userId, c]));
  let updated = 0;
  let skipped = 0;

  for (const item of input.rows) {
    if (item.skip || !item.matchedUserId) {
      skipped += 1;
      continue;
    }
    const candidate = candidateByUserId.get(item.matchedUserId);
    if (!candidate) {
      skipped += 1;
      continue;
    }

    const row = {
      ...item.row,
      dateOfBirth: item.row.dateOfBirth ? new Date(item.row.dateOfBirth) : null,
      startedAt: item.row.startedAt ? new Date(item.row.startedAt) : null,
    };
    let departmentId: string | null = null;
    if (row.department) {
      const existing = await prisma.department.findFirst({
        where: { tenantId: auth.tenantId, name: row.department },
      });
      const department =
        existing ??
        (await prisma.department.create({
          data: { tenantId: auth.tenantId, name: row.department },
        }));
      departmentId = department.id;
    }

    await prisma.user.update({
      where: { id: candidate.userId },
      data: {
        ...(row.address ? { address: row.address } : {}),
        ...(row.postalCode ? { postalCode: row.postalCode } : {}),
        ...(row.city ? { city: row.city } : {}),
        ...(row.phone ? { phone: row.phone } : {}),
      },
    });

    await prisma.userTenant.update({
      where: { id: candidate.userTenantId },
      data: {
        ...(row.position ? { position: row.position } : {}),
        ...(row.employeeNumber ? { employeeNumber: row.employeeNumber } : {}),
        ...(departmentId ? { departmentId, department: row.department } : {}),
      },
    });

    await prisma.employeeHrProfile.upsert({
      where: { userTenantId: candidate.userTenantId },
      create: {
        userTenantId: candidate.userTenantId,
        startedAt: row.startedAt,
        dateOfBirth: row.dateOfBirth,
      },
      update: {
        ...(row.startedAt ? { startedAt: row.startedAt } : {}),
        ...(row.dateOfBirth ? { dateOfBirth: row.dateOfBirth } : {}),
      },
    });

    if (row.nextOfKin.length > 0) {
      await prisma.employeeNextOfKin.deleteMany({ where: { userTenantId: candidate.userTenantId } });
      await prisma.employeeNextOfKin.createMany({
        data: row.nextOfKin.slice(0, 2).map((kin, index) => ({
          userTenantId: candidate.userTenantId,
          name: kin.name,
          relation: kin.relation,
          phone: kin.phone,
          sortOrder: index,
        })),
      });
    }

    updated += 1;
  }

  revalidatePath("/dashboard/personalarkiv");
  revalidatePath("/dashboard/brukere");
  revalidatePath("/dashboard/avdelinger");
  return { success: true as const, updated, skipped };
}
