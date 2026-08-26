import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ExcelJS from "exceljs";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

export const maxDuration = 60;

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

interface ImportRow {
  name: string;
  orgNumber?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  industry?: string;
  employeeCount?: number;
}

interface ImportResult {
  row: number;
  name: string;
  status: "created" | "linked" | "skipped" | "error";
  email?: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
  }

  const isSuperAdmin = session.user.isSuperAdmin === true;
  const groupId = session.user.corporateGroupId as string | null;

  // Sjekk tilgang: superadmin eller konsern-admin
  if (!isSuperAdmin && !groupId) {
    return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
  }

  if (groupId && !isSuperAdmin) {
    const membership = await prisma.corporateGroupUser.findUnique({
      where: { groupId_userId: { groupId, userId: session.user.id } },
    });
    if (!membership || membership.role !== "GROUP_ADMIN") {
      return NextResponse.json({ error: "Kun konsern-admin kan importere" }, { status: 403 });
    }
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const targetGroupId = (formData.get("groupId") as string) || groupId;

  if (!file) {
    return NextResponse.json({ error: "Ingen fil mottatt" }, { status: 400 });
  }

  if (!targetGroupId) {
    return NextResponse.json({ error: "Mangler konsern-ID" }, { status: 400 });
  }

  // Verifiser at konsernet eksisterer
  const group = await prisma.corporateGroup.findUnique({ where: { id: targetGroupId } });
  if (!group) {
    return NextResponse.json({ error: "Konsernet finnes ikke" }, { status: 404 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json({ error: "Fant ingen ark i filen" }, { status: 400 });
    }

    // Les header-rad for å finne kolonner
    const headerRow = worksheet.getRow(1);
    const colMap = new Map<string, number>();
    headerRow.eachCell((cell, colNumber) => {
      const val = String(cell.value ?? "").toLowerCase().trim();
      colMap.set(val, colNumber);
    });

    // Normaliser header-navn
    const colAliases: Record<string, string[]> = {
      name: ["bedriftsnavn", "navn", "name", "firma", "selskapsnavn", "company"],
      orgNumber: ["org.nr", "orgnr", "org.nummer", "organisasjonsnummer", "org number"],
      contactPerson: ["kontaktperson", "kontakt", "contact", "contact person"],
      contactEmail: ["e-post", "epost", "email", "kontakt e-post", "contact email"],
      contactPhone: ["telefon", "tlf", "phone", "mobil", "kontakt telefon"],
      address: ["adresse", "address", "gateadresse"],
      city: ["by", "sted", "poststed", "city"],
      postalCode: ["postnr", "postnummer", "postal code", "zip"],
      industry: ["bransje", "industry", "sektor"],
      employeeCount: ["ansatte", "antall ansatte", "employees", "employee count"],
    };

    function findCol(field: string): number | undefined {
      const aliases = colAliases[field] ?? [field];
      for (const alias of aliases) {
        const col = colMap.get(alias);
        if (col) return col;
      }
      return undefined;
    }

    const cols = {
      name: findCol("name"),
      orgNumber: findCol("orgNumber"),
      contactPerson: findCol("contactPerson"),
      contactEmail: findCol("contactEmail"),
      contactPhone: findCol("contactPhone"),
      address: findCol("address"),
      city: findCol("city"),
      postalCode: findCol("postalCode"),
      industry: findCol("industry"),
      employeeCount: findCol("employeeCount"),
    };

    if (!cols.name) {
      return NextResponse.json({
        error: "Fant ikke kolonnen 'Bedriftsnavn' i filen. Sørg for at den første raden har kolonne-overskrifter.",
      }, { status: 400 });
    }

    const rows: ImportRow[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const name = String(row.getCell(cols.name!).value ?? "").trim();
      if (!name) return;

      rows.push({
        name,
        orgNumber: cols.orgNumber ? String(row.getCell(cols.orgNumber).value ?? "").trim() || undefined : undefined,
        contactPerson: cols.contactPerson ? String(row.getCell(cols.contactPerson).value ?? "").trim() || undefined : undefined,
        contactEmail: cols.contactEmail ? String(row.getCell(cols.contactEmail).value ?? "").trim() || undefined : undefined,
        contactPhone: cols.contactPhone ? String(row.getCell(cols.contactPhone).value ?? "").trim() || undefined : undefined,
        address: cols.address ? String(row.getCell(cols.address).value ?? "").trim() || undefined : undefined,
        city: cols.city ? String(row.getCell(cols.city).value ?? "").trim() || undefined : undefined,
        postalCode: cols.postalCode ? String(row.getCell(cols.postalCode).value ?? "").trim() || undefined : undefined,
        industry: cols.industry ? String(row.getCell(cols.industry).value ?? "").trim() || undefined : undefined,
        employeeCount: cols.employeeCount ? Number(row.getCell(cols.employeeCount).value) || undefined : undefined,
      });
    });

    if (rows.length === 0) {
      return NextResponse.json({ error: "Ingen rader funnet i filen" }, { status: 400 });
    }

    const results: ImportResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Sjekk om bedriften allerede finnes (basert på org.nr eller navn)
        let existingTenant = null;
        if (row.orgNumber) {
          existingTenant = await prisma.tenant.findFirst({
            where: { orgNumber: row.orgNumber },
          });
        }
        if (!existingTenant) {
          existingTenant = await prisma.tenant.findFirst({
            where: { name: row.name },
          });
        }

        if (existingTenant) {
          // Sjekk om allerede tilknyttet konsernet
          const existingLink = await prisma.corporateGroupTenant.findUnique({
            where: { groupId_tenantId: { groupId: targetGroupId, tenantId: existingTenant.id } },
          });

          if (existingLink && existingLink.status === "ACTIVE") {
            results.push({ row: i + 2, name: row.name, status: "skipped", message: "Allerede tilknyttet konsernet" });
          } else if (existingLink) {
            await prisma.corporateGroupTenant.update({
              where: { id: existingLink.id },
              data: { status: "ACTIVE", joinedAt: new Date() },
            });
            results.push({ row: i + 2, name: row.name, status: "linked", message: "Re-aktivert i konsernet" });
          } else {
            await prisma.corporateGroupTenant.create({
              data: { groupId: targetGroupId, tenantId: existingTenant.id },
            });
            results.push({ row: i + 2, name: row.name, status: "linked", message: "Eksisterende bedrift tilknyttet konsernet" });
          }
        } else {
          // Opprett ny tenant
          const slug = row.name
            .toLowerCase()
            .replace(/[^a-z0-9æøå]+/g, "-")
            .replace(/(^-|-$)/g, "")
            + `-${Date.now().toString(36)}`;

          const tenant = await prisma.tenant.create({
            data: {
              name: row.name,
              slug,
              orgNumber: row.orgNumber,
              contactPerson: row.contactPerson,
              contactEmail: row.contactEmail,
              contactPhone: row.contactPhone,
              address: row.address,
              city: row.city,
              postalCode: row.postalCode,
              industry: row.industry,
              employeeCount: row.employeeCount,
              status: "ACTIVE",
              onboardingStatus: "NOT_STARTED",
            },
          });

          await prisma.subscription.create({
            data: {
              tenantId: tenant.id,
              plan: "ENTERPRISE",
              price: 0,
              billingInterval: "YEARLY",
              status: "ACTIVE",
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            },
          });

          await prisma.corporateGroupTenant.create({
            data: { groupId: targetGroupId, tenantId: tenant.id },
          });

          // Opprett admin-bruker og send velkomst-e-post hvis e-post oppgitt
          let emailSent = false;
          if (row.contactEmail) {
            const password = generatePassword();
            const hashedPassword = await bcrypt.hash(password, 10);

            let user = await prisma.user.findUnique({
              where: { email: row.contactEmail },
            });

            if (!user) {
              user = await prisma.user.create({
                data: {
                  email: row.contactEmail,
                  name: row.contactPerson ?? row.name,
                  password: hashedPassword,
                },
              });
            }

            // Knytt bruker til tenant som ADMIN
            const existingUserTenant = await prisma.userTenant.findUnique({
              where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
            });

            if (!existingUserTenant) {
              await prisma.userTenant.create({
                data: { userId: user.id, tenantId: tenant.id, role: "ADMIN" },
              });
            }

            // Send velkomst-e-post med innloggingsdetaljer
            if (process.env.RESEND_API_KEY) {
              try {
                await resend.emails.send({
                  from: FROM_EMAIL,
                  to: row.contactEmail,
                  subject: `Velkommen til HMS Nova – ${row.name}`,
                  html: buildWelcomeEmail({
                    userName: row.contactPerson ?? row.name,
                    companyName: row.name,
                    groupName: group.name,
                    email: row.contactEmail,
                    password,
                    loginUrl: `${BASE_URL}/login`,
                  }),
                });
                emailSent = true;
              } catch {
                // E-postfeil skal ikke stoppe importen
              }
            }
          }

          results.push({
            row: i + 2,
            name: row.name,
            status: "created",
            email: row.contactEmail,
            message: emailSent
              ? `Velkomst-e-post sendt til ${row.contactEmail}`
              : row.contactEmail
                ? "Opprettet, men e-post ikke sendt"
                : "Opprettet uten e-post (ingen kontakt-e-post)",
          });
        }
      } catch (err) {
        results.push({
          row: i + 2,
          name: row.name,
          status: "error",
          message: err instanceof Error ? err.message : "Ukjent feil",
        });
      }
    }

    // Audit-log
    await prisma.corporateGroupAuditLog.create({
      data: {
        groupId: targetGroupId,
        userId: session.user.id,
        action: "IMPORT_TENANTS",
        targetType: "import",
        details: JSON.parse(JSON.stringify({
          fileName: file.name,
          totalRows: rows.length,
          created: results.filter((r) => r.status === "created").length,
          linked: results.filter((r) => r.status === "linked").length,
          skipped: results.filter((r) => r.status === "skipped").length,
          errors: results.filter((r) => r.status === "error").length,
        })),
      },
    });

    return NextResponse.json({
      success: true,
      summary: {
        total: rows.length,
        created: results.filter((r) => r.status === "created").length,
        linked: results.filter((r) => r.status === "linked").length,
        skipped: results.filter((r) => r.status === "skipped").length,
        errors: results.filter((r) => r.status === "error").length,
      },
      results,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kunne ikke lese Excel-filen" },
      { status: 400 }
    );
  }
}

function buildWelcomeEmail(data: {
  userName: string;
  companyName: string;
  groupName: string;
  email: string;
  password: string;
  loginUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
  <tr><td style="background:linear-gradient(135deg,#0d9488,#0f766e);padding:32px 40px;text-align:center;">
    <img src="${BASE_URL}/logo-nova.png" alt="HMS Nova" style="width:120px;height:auto;margin-bottom:12px;">
    <h1 style="color:#fff;font-size:22px;margin:0;">Velkommen til HMS Nova</h1>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <p style="font-size:16px;color:#333;">Hei ${data.userName},</p>
    <p style="color:#555;line-height:1.6;">
      <strong>${data.companyName}</strong> er nå en del av konsernet <strong>${data.groupName}</strong> i HMS Nova.
      Vi har opprettet en konto for deg slik at du kan logge inn og komme i gang med HMS-arbeidet.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:8px;margin:24px 0;">
    <tr><td style="padding:20px 24px;">
      <p style="margin:0 0 8px;font-size:13px;color:#666;text-transform:uppercase;letter-spacing:0.5px;">Dine innloggingsdetaljer</p>
      <table cellpadding="0" cellspacing="0">
        <tr><td style="padding:4px 0;color:#888;font-size:14px;width:80px;">E-post:</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#333;">${data.email}</td></tr>
        <tr><td style="padding:4px 0;color:#888;font-size:14px;">Passord:</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#333;font-family:monospace;letter-spacing:1px;">${data.password}</td></tr>
      </table>
    </td></tr>
    </table>
    <div style="text-align:center;margin:28px 0;">
      <a href="${data.loginUrl}" style="background:#0d9488;color:#fff;padding:14px 36px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;font-size:15px;">Logg inn nå</a>
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
</html>`;
}
