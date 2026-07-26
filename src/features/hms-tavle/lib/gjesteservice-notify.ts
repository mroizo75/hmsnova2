/**
 * Varsling for gjesteservice på Digital HMS Tavle.
 *
 * Sanntidsvarsling til resepsjon/ledelse ved ny gjestmelding, SMS ved kritiske
 * saker, og e-post til gjesten med privat sporingslenke.
 *
 * Hjemmel: IK-HMS § 5 nr. 7 (avvik skal avdekkes og rettes opp), IK-mat § 5 nr. 4
 * (rutine ved avvik i matvirksomhet), GDPR art. 6 (e-post kun ved samtykke).
 *
 * Server-only – importerer database, e-post og SMS.
 */

import { sendEmail } from "@/lib/email";
import { formatPhoneNumber, sendSms } from "@/lib/sms";
import { notifyUsersByRoles } from "@/server/actions/notification.actions";
import type { GjesteserviceConfig, GuestPriority, GuestType } from "./gjesteservice-config";
import { getGuestDictionary, GUEST_TYPE_EMOJI, type GuestLocale } from "./guest-i18n";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://hmsnova.no";

/** Roller som håndterer gjestmeldinger i dashboard */
const GUEST_HANDLER_ROLES = ["ADMIN", "HMS", "LEDER"] as const;

const PRIORITY_LABELS: Record<GuestPriority, string> = {
  KRITISK: "Kritisk",
  HOY: "Høy",
  NORMAL: "Normal",
};

export function buildGuestStatusUrl(trackingToken: string): string {
  return `${APP_URL}/tavle/sak/${trackingToken}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailShell(title: string, bodyHtml: string, footer: string): string {
  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;">
      <h2 style="font-size:20px;margin:0 0 12px;">${escapeHtml(title)}</h2>
      ${bodyHtml}
      <p style="font-size:12px;color:#64748b;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px;">
        ${escapeHtml(footer)}
      </p>
    </div>
  `;
}

function button(href: string, label: string): string {
  return `
    <p style="margin:20px 0;">
      <a href="${href}" style="display:inline-block;padding:12px 20px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
        ${escapeHtml(label)}
      </a>
    </p>
  `;
}

interface NewSubmissionInput {
  tenantId: string;
  tavleId: string;
  tavleName: string;
  type: GuestType;
  priority: GuestPriority;
  message: string;
  roomOrTable: string | null;
  slaDueAt: Date;
  config: GjesteserviceConfig;
}

/**
 * Varsler resepsjon/ledelse om ny gjestmelding.
 * Meldingsinnholdet holdes utenfor SMS – kun type, prioritet og hvor saken ligger.
 */
export async function notifyNewGuestSubmission(input: NewSubmissionInput): Promise<void> {
  const t = getGuestDictionary("nb");
  const typeLabel = t.types[input.type].label;
  const stedsinfo = input.roomOrTable ? ` (${input.roomOrTable})` : "";
  const title = `${GUEST_TYPE_EMOJI[input.type]} Ny gjestmelding: ${typeLabel}`;
  const dashboardLink = `/dashboard/hms-tavle/${input.tavleId}?tab=gjestmeldinger`;
  const frist = input.slaDueAt.toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" });

  const results = await Promise.allSettled([
    notifyUsersByRoles(input.tenantId, [...GUEST_HANDLER_ROLES], {
      type: "GUEST_SUBMISSION",
      title,
      message: `${input.tavleName}${stedsinfo} – prioritet ${PRIORITY_LABELS[input.priority]}. Svarfrist ${frist}.`,
      link: dashboardLink,
    }),
    ...input.config.notifyEmails.map((to) =>
      sendEmail({
        to,
        subject: `HMS Nova: ${title}`,
        html: emailShell(
          title,
          `
            <p style="font-size:14px;line-height:1.6;">
              <strong>${escapeHtml(input.tavleName)}</strong>${escapeHtml(stedsinfo)}<br />
              Prioritet: <strong>${PRIORITY_LABELS[input.priority]}</strong><br />
              Svarfrist: <strong>${escapeHtml(frist)}</strong>
            </p>
            <p style="font-size:14px;line-height:1.6;background:#f1f5f9;padding:12px;border-radius:8px;">
              ${escapeHtml(input.message.slice(0, 500))}
            </p>
            ${button(`${APP_URL}${dashboardLink}`, "Behandle saken")}
          `,
          "Gjestmeldinger er konfidensielle og skal kun håndteres av ansvarlig personell."
        ),
      })
    ),
    ...(input.priority === "KRITISK"
      ? input.config.notifySmsNumbers.map((number) => {
          const normalized = formatPhoneNumber(number);
          if (!normalized) return Promise.resolve({ success: false });
          return sendSms({
            to: normalized,
            message: `HMS Nova: KRITISK gjestmelding (${typeLabel}) på ${input.tavleName}${stedsinfo}. Behandle i dashboard nå.`,
          });
        })
      : []),
  ]);

  results
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .forEach((result) => console.error("[gjesteservice] Varsling feilet:", result.reason));
}

interface GuestEmailInput {
  to: string;
  locale: GuestLocale;
  tenantName: string;
  trackingToken: string;
}

/** Kvittering til gjesten med privat sporingslenke. Krever samtykke. */
export async function sendGuestReceiptEmail(input: GuestEmailInput): Promise<void> {
  const t = getGuestDictionary(input.locale);
  const statusUrl = buildGuestStatusUrl(input.trackingToken);

  await sendEmail({
    to: input.to,
    subject: `${input.tenantName}: ${t.receiptTitle}`,
    html: emailShell(
      t.receiptTitle,
      `
        <p style="font-size:14px;line-height:1.6;">${escapeHtml(t.receiptIntro)}</p>
        <p style="font-size:14px;line-height:1.6;">${escapeHtml(t.trackingHint)}</p>
        ${button(statusUrl, t.openStatus)}
      `,
      t.privacyFooter
    ),
  });
}

interface GuestResolvedInput extends GuestEmailInput {
  response: string;
}

/** Melding til gjesten når saken er behandlet – viser hva som ble gjort. */
export async function sendGuestResolvedEmail(input: GuestResolvedInput): Promise<void> {
  const t = getGuestDictionary(input.locale);
  const statusUrl = buildGuestStatusUrl(input.trackingToken);

  await sendEmail({
    to: input.to,
    subject: `${input.tenantName}: ${t.answerTitle}`,
    html: emailShell(
      t.answerTitle,
      `
        <p style="font-size:14px;line-height:1.6;background:#f1f5f9;padding:12px;border-radius:8px;">
          ${escapeHtml(input.response)}
        </p>
        ${button(statusUrl, t.openStatus)}
      `,
      t.privacyFooter
    ),
  });
}

interface EscalationInput {
  tenantId: string;
  tavleId: string;
  tavleName: string;
  type: GuestType;
  priority: GuestPriority;
  slaDueAt: Date;
}

/** Eskalerer sak som har passert serviceløftet til ledelsen. */
export async function notifyGuestSlaBreach(input: EscalationInput): Promise<void> {
  const t = getGuestDictionary("nb");
  const frist = input.slaDueAt.toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" });

  await notifyUsersByRoles(input.tenantId, ["ADMIN", "LEDER"], {
    type: "GUEST_SUBMISSION",
    title: `Gjestmelding forbi svarfrist: ${t.types[input.type].label}`,
    message: `${input.tavleName} – prioritet ${PRIORITY_LABELS[input.priority]}. Frist var ${frist} og saken er fortsatt ubehandlet.`,
    link: `/dashboard/hms-tavle/${input.tavleId}?tab=gjestmeldinger`,
  });
}
