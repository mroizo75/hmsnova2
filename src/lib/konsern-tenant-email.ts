import bcrypt from "bcryptjs";
import { Resend } from "resend";
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

/**
 * Oppretter admin-bruker for en tenant og sender velkomst-e-post.
 * Brukes ved manuell opprettelse fra konsern-dashboard og superadmin.
 */
export async function createTenantAdminAndSendEmail(opts: {
  tenantId: string;
  tenantName: string;
  contactEmail: string;
  contactPerson?: string;
  groupName: string;
}): Promise<{ emailSent: boolean }> {
  const password = generatePassword();
  const hashedPassword = await bcrypt.hash(password, 10);

  let user = await prisma.user.findUnique({
    where: { email: opts.contactEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: opts.contactEmail,
        name: opts.contactPerson ?? opts.tenantName,
        password: hashedPassword,
      },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
  }

  const existingUserTenant = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId: opts.tenantId } },
  });

  if (!existingUserTenant) {
    await prisma.userTenant.create({
      data: { userId: user.id, tenantId: opts.tenantId, role: "ADMIN" },
    });
  }

  let emailSent = false;
  if (process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: opts.contactEmail,
        subject: `Velkommen til HMS Nova – ${opts.tenantName}`,
        html: buildWelcomeEmail({
          userName: opts.contactPerson ?? opts.tenantName,
          companyName: opts.tenantName,
          groupName: opts.groupName,
          email: opts.contactEmail,
          password,
          loginUrl: `${BASE_URL}/login`,
        }),
      });
      emailSent = true;
    } catch {
      // E-postfeil skal ikke stoppe prosessen
    }
  }

  return { emailSent };
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
