import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/internal/jarvis/salg?dager=7
 *
 * Skrivebeskyttet salgsoversikt for Jarvis (Salg-agenten).
 * Kun aggregerte tall, ingen persondata. Eneste navn som returneres er
 * bedriftsnavn på forfalte fakturaer (trengs for oppfølging).
 *
 * Auth: Authorization: Bearer <JARVIS_API_SECRET>
 * (egen nøkkel, ikke INTERNAL_API_SECRET som deles med Bransjekurs.no)
 */

function authorized(request: NextRequest): NextResponse | null {
  const secret = process.env.JARVIS_API_SECRET;
  if (!secret) {
    return NextResponse.json({ code: "MISCONFIGURED", message: "Jarvis-integrasjon er ikke konfigurert" }, { status: 500 });
  }
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ code: "UNAUTHORIZED", message: "Ugyldig token" }, { status: 401 });
  }
  return null;
}

const sum = (xs: { amount: number }[]) => xs.reduce((s, x) => s + x.amount, 0);

export async function GET(request: NextRequest) {
  const denied = authorized(request);
  if (denied) return denied;

  const dagerParam = Number(new URL(request.url).searchParams.get("dager") ?? "7");
  const dager = Number.isFinite(dagerParam) ? Math.min(Math.max(Math.floor(dagerParam), 1), 365) : 7;

  const now = new Date();
  const DAG = 24 * 60 * 60 * 1000;
  const fra = new Date(now.getTime() - dager * DAG);
  const forrige = new Date(fra.getTime() - dager * DAG);
  const om7dager = new Date(now.getTime() + 7 * DAG);

  const [
    tenantsPerStatus,
    nyeTenants,
    nyeTenantsForrige,
    aktiveAbonnement,
    avsluttedeAbonnement,
    pastDue,
    betaltDenne,
    betaltForrige,
    fakturertDenne,
    forfalte,
    prøverSomUtløper,
  ] = await Promise.all([
    prisma.tenant.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.tenant.count({ where: { createdAt: { gte: fra } } }),
    prisma.tenant.count({ where: { createdAt: { gte: forrige, lt: fra } } }),
    prisma.subscription.findMany({
      where: { status: "ACTIVE", price: { gt: 0 } },
      select: { price: true, billingInterval: true, plan: true },
    }),
    prisma.subscription.count({ where: { status: "CANCELLED", updatedAt: { gte: fra } } }),
    prisma.subscription.count({ where: { status: "PAST_DUE" } }),
    prisma.invoice.findMany({
      where: { status: "PAID", paidDate: { gte: fra, lte: now } },
      select: { amount: true },
    }),
    prisma.invoice.findMany({
      where: { status: "PAID", paidDate: { gte: forrige, lt: fra } },
      select: { amount: true },
    }),
    prisma.invoice.findMany({
      where: { status: { not: "CANCELLED" }, createdAt: { gte: fra } },
      select: { amount: true },
    }),
    prisma.invoice.findMany({
      where: {
        OR: [{ status: "OVERDUE" }, { status: "SENT", dueDate: { lt: now } }],
      },
      select: { amount: true, dueDate: true, invoiceNumber: true, tenant: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 25,
    }),
    prisma.tenant.findMany({
      where: { status: "TRIAL", trialEndsAt: { gte: now, lte: om7dager } },
      select: { name: true, trialEndsAt: true, registrationType: true },
      orderBy: { trialEndsAt: "asc" },
      take: 25,
    }),
  ]);

  // MRR: årsabonnement deles på 12. Beløp antas å være eks. mva.
  const mrr = aktiveAbonnement.reduce(
    (s, a) => s + (a.billingInterval === "YEARLY" ? a.price / 12 : a.price),
    0,
  );

  const statusTall = Object.fromEntries(tenantsPerStatus.map((t) => [t.status, t._count._all]));

  return NextResponse.json({
    generert: now.toISOString(),
    periodeDager: dager,
    valuta: "NOK",
    kunder: {
      perStatus: statusTall,
      nyeIPerioden: nyeTenants,
      nyeForrigePeriode: nyeTenantsForrige,
    },
    abonnement: {
      aktive: aktiveAbonnement.length,
      mrr: Math.round(mrr),
      arr: Math.round(mrr * 12),
      avsluttetIPerioden: avsluttedeAbonnement,
      pastDue,
    },
    fakturaer: {
      betaltIPerioden: { antall: betaltDenne.length, sum: Math.round(sum(betaltDenne)) },
      betaltForrigePeriode: { antall: betaltForrige.length, sum: Math.round(sum(betaltForrige)) },
      fakturertIPerioden: { antall: fakturertDenne.length, sum: Math.round(sum(fakturertDenne)) },
      forfalt: {
        antall: forfalte.length,
        sum: Math.round(sum(forfalte)),
        liste: forfalte.map((f) => ({
          bedrift: f.tenant.name,
          faktura: f.invoiceNumber,
          belop: Math.round(f.amount),
          forfall: f.dueDate.toISOString().slice(0, 10),
          dagerForfalt: Math.floor((now.getTime() - f.dueDate.getTime()) / DAG),
        })),
      },
    },
    proverSomUtloper7Dager: prøverSomUtløper.map((t) => ({
      bedrift: t.name,
      utloper: t.trialEndsAt?.toISOString().slice(0, 10),
      type: t.registrationType,
    })),
  });
}
