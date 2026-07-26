"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { getPlanLimits } from "@/features/hms-tavle/lib/tavle-plan-limits";
import {
  HmsTavleSectionType,
  ExternalLinkType,
  HmsTavlePlan,
} from "@prisma/client";

// ─── Hjelpefunksjoner ────────────────────────────────────────────

async function getTavleContext() {
  const auth = await getAuthContext();
  if (!auth) throw new Error("Ikke autentisert");
  if (!auth.permissions.canViewHmsTavle) throw new Error("Ingen tilgang til HMS Tavle");
  return auth;
}

async function assertManage(auth: Awaited<ReturnType<typeof getTavleContext>>) {
  if (!auth.permissions.canManageHmsTavle) throw new Error("Ingen administrasjonstilgang til HMS Tavle");
}

async function getTavleSubscription(tenantId: string) {
  return prisma.hmsTavleSubscription.findUnique({ where: { tenantId } });
}

// ─── Tavle-CRUD ─────────────────────────────────────────────────

export async function getHmsTavler() {
  try {
    const auth = await getTavleContext();
    const { tenantId } = auth;

    const tavler = await prisma.hmsTavle.findMany({
      where: { tenantId },
      include: {
        sections: { orderBy: { order: "asc" } },
        externalLinks: { orderBy: { order: "asc" } },
        subcontractorPortal: true,
        project: { select: { id: true, name: true } },
        _count: { select: { checkins: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const subscription = await getTavleSubscription(tenantId);

    return { success: true, data: tavler, subscription };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente HMS Tavler" };
  }
}

export async function getHmsTavle(id: string) {
  try {
    const auth = await getTavleContext();

    const tavle = await prisma.hmsTavle.findFirst({
      where: { id, tenantId: auth.tenantId },
      include: {
        sections: { orderBy: { order: "asc" } },
        externalLinks: { orderBy: { order: "asc" } },
        subcontractorPortal: {
          include: {
            submissions: {
              orderBy: { createdAt: "desc" },
              take: 20,
            },
          },
        },
        project: {
          include: {
            constructionShaPlan: { select: { status: true, updatedAt: true } },
            constructionPreNotification: { select: { status: true, sentAt: true } },
            constructionRosterEntries: { select: { id: true }, take: 1 },
          },
        },
        _count: { select: { checkins: true } },
      },
    });

    if (!tavle) throw new Error("Tavle ikke funnet");

    return { success: true, data: tavle };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente HMS Tavle" };
  }
}

export async function createHmsTavle(input: {
  name: string;
  description?: string;
  projectId?: string;
  brandColor?: string;
  manualContacts?: object[];
  manualDocuments?: object[];
}) {
  try {
    const auth = await getTavleContext();
    await assertManage(auth);

    const sub = await getTavleSubscription(auth.tenantId);
    if (!sub || sub.status === "EXPIRED" || sub.status === "CANCELLED") {
      throw new Error("Ingen aktiv HMS Tavle-abonnement");
    }

    const limits = getPlanLimits(sub.plan);
    const existing = await prisma.hmsTavle.count({ where: { tenantId: auth.tenantId } });
    if (existing >= limits.maxTavler) {
      throw new Error(`Planen din tillater maks ${limits.maxTavler} tavle(r). Oppgrader for å opprette flere.`);
    }

    const tavle = await prisma.hmsTavle.create({
      data: {
        tenantId: auth.tenantId,
        name: input.name,
        description: input.description,
        projectId: input.projectId,
        brandColor: input.brandColor,
        manualContacts: input.manualContacts ? JSON.parse(JSON.stringify(input.manualContacts)) : undefined,
        manualDocuments: input.manualDocuments ? JSON.parse(JSON.stringify(input.manualDocuments)) : undefined,
        // Standard-seksjoner basert på plan
        sections: {
          create: getDefaultSections(sub.plan),
        },
      },
      include: { sections: true },
    });

    revalidatePath("/dashboard/hms-tavle");
    return { success: true, data: tavle };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke opprette HMS Tavle" };
  }
}

export async function updateHmsTavle(
  id: string,
  input: {
    name?: string;
    description?: string;
    isPublic?: boolean;
    kioskMode?: boolean;
    logoUrl?: string;
    brandColor?: string;
    manualContacts?: object[];
    manualDocuments?: object[];
  }
) {
  try {
    const auth = await getTavleContext();
    await assertManage(auth);

    const existing = await prisma.hmsTavle.findFirst({
      where: { id, tenantId: auth.tenantId },
    });
    if (!existing) throw new Error("Tavle ikke funnet");

    const tavle = await prisma.hmsTavle.update({
      where: { id },
      data: {
        ...input,
        manualContacts: input.manualContacts
          ? JSON.parse(JSON.stringify(input.manualContacts))
          : undefined,
        manualDocuments: input.manualDocuments
          ? JSON.parse(JSON.stringify(input.manualDocuments))
          : undefined,
      },
    });

    revalidatePath(`/dashboard/hms-tavle/${id}`);
    return { success: true, data: tavle };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke oppdatere HMS Tavle" };
  }
}

export async function deleteHmsTavle(id: string) {
  try {
    const auth = await getTavleContext();
    await assertManage(auth);

    const existing = await prisma.hmsTavle.findFirst({
      where: { id, tenantId: auth.tenantId },
    });
    if (!existing) throw new Error("Tavle ikke funnet");

    await prisma.hmsTavle.delete({ where: { id } });

    revalidatePath("/dashboard/hms-tavle");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke slette HMS Tavle" };
  }
}

// ─── Seksjoner ───────────────────────────────────────────────────

export async function updateTavleSections(
  tavleId: string,
  sections: Array<{
    id?: string;
    type: HmsTavleSectionType;
    title?: string;
    order: number;
    isVisible: boolean;
    config: object;
  }>
) {
  try {
    const auth = await getTavleContext();
    await assertManage(auth);

    const tavle = await prisma.hmsTavle.findFirst({
      where: { id: tavleId, tenantId: auth.tenantId },
    });
    if (!tavle) throw new Error("Tavle ikke funnet");

    const sub = await getTavleSubscription(auth.tenantId);
    if (!sub) throw new Error("Ingen abonnement");
    const limits = getPlanLimits(sub.plan);

    for (const s of sections) {
      if (!limits.allowedSectionTypes.includes(s.type)) {
        throw new Error(`Seksjonstype "${s.type}" krever høyere plan`);
      }
    }

    // Slett eksisterende og opprett nye
    await prisma.$transaction([
      prisma.hmsTavleSection.deleteMany({ where: { tavleId } }),
      prisma.hmsTavleSection.createMany({
        data: sections.map((s) => ({
          tavleId,
          type: s.type,
          title: s.title,
          order: s.order,
          isVisible: s.isVisible,
          config: JSON.parse(JSON.stringify(s.config)),
        })),
      }),
    ]);

    revalidatePath(`/dashboard/hms-tavle/${tavleId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke oppdatere seksjoner" };
  }
}

// ─── Eksterne lenker ─────────────────────────────────────────────

export async function addExternalLink(
  tavleId: string,
  input: { title: string; url: string; type: ExternalLinkType; icon?: string }
) {
  try {
    const auth = await getTavleContext();
    await assertManage(auth);

    const tavle = await prisma.hmsTavle.findFirst({
      where: { id: tavleId, tenantId: auth.tenantId },
      include: { _count: { select: { externalLinks: true } } },
    });
    if (!tavle) throw new Error("Tavle ikke funnet");

    const sub = await getTavleSubscription(auth.tenantId);
    if (!sub) throw new Error("Ingen abonnement");
    const limits = getPlanLimits(sub.plan);

    if (tavle._count.externalLinks >= limits.maxExternalLinks) {
      throw new Error(`Maks ${limits.maxExternalLinks} eksterne lenker på din plan`);
    }

    const link = await prisma.hmsTavleExternalLink.create({
      data: { tavleId, ...input },
    });

    revalidatePath(`/dashboard/hms-tavle/${tavleId}`);
    return { success: true, data: link };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke legge til lenke" };
  }
}

export async function deleteExternalLink(linkId: string) {
  try {
    const auth = await getTavleContext();
    await assertManage(auth);

    const link = await prisma.hmsTavleExternalLink.findFirst({
      where: { id: linkId },
      include: { tavle: { select: { tenantId: true, id: true } } },
    });
    if (!link || link.tavle.tenantId !== auth.tenantId) throw new Error("Lenke ikke funnet");

    await prisma.hmsTavleExternalLink.delete({ where: { id: linkId } });
    revalidatePath(`/dashboard/hms-tavle/${link.tavle.id}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke slette lenke" };
  }
}

// ─── UE-portal ───────────────────────────────────────────────────

export async function enableSubcontractorPortal(
  tavleId: string,
  config: {
    allowAvvik: boolean;
    allowRuh: boolean;
    allowSja: boolean;
    allowPdfUpload: boolean;
    requireEmail: boolean;
    autoApprove: boolean;
  }
) {
  try {
    const auth = await getTavleContext();
    await assertManage(auth);

    const sub = await getTavleSubscription(auth.tenantId);
    if (!sub) throw new Error("Ingen abonnement");

    const limits = getPlanLimits(sub.plan);
    if (!limits.hasUePortal) throw new Error("UE-portalen krever Standard- eller høyere plan");

    const tavle = await prisma.hmsTavle.findFirst({
      where: { id: tavleId, tenantId: auth.tenantId },
    });
    if (!tavle) throw new Error("Tavle ikke funnet");

    const portal = await prisma.subcontractorPortal.upsert({
      where: { tavleId },
      update: config,
      create: { tavleId, ...config },
    });

    revalidatePath(`/dashboard/hms-tavle/${tavleId}`);
    return { success: true, data: portal };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke aktivere UE-portal" };
  }
}

export async function getSubmissions(tavleId: string) {
  try {
    const auth = await getTavleContext();

    const tavle = await prisma.hmsTavle.findFirst({
      where: { id: tavleId, tenantId: auth.tenantId },
    });
    if (!tavle) throw new Error("Tavle ikke funnet");

    const submissions = await prisma.subcontractorSubmission.findMany({
      where: {
        portal: { tavleId },
        tenantId: auth.tenantId,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: submissions };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente innsendinger" };
  }
}

export async function reviewSubmission(
  submissionId: string,
  action: "approve" | "reject",
  notes?: string,
  linkTo?: { incidentId?: string; ruhId?: string; sjaId?: string }
) {
  try {
    const auth = await getTavleContext();
    if (!auth.permissions.canReviewSubmissions) throw new Error("Ingen tilgang til å behandle innsendinger");

    const submission = await prisma.subcontractorSubmission.findFirst({
      where: { id: submissionId, tenantId: auth.tenantId },
    });
    if (!submission) throw new Error("Innsending ikke funnet");

    const updated = await prisma.subcontractorSubmission.update({
      where: { id: submissionId },
      data: {
        status: action === "approve" ? "LINKED" : "REJECTED",
        reviewedById: auth.userId,
        reviewedAt: new Date(),
        reviewNotes: notes,
        linkedIncidentId: linkTo?.incidentId,
        linkedRuhId: linkTo?.ruhId,
        linkedSjaId: linkTo?.sjaId,
      },
    });

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke behandle innsending" };
  }
}

// ─── Abonnement ──────────────────────────────────────────────────

export async function activateTavleAddon() {
  try {
    const auth = await getTavleContext();
    await assertManage(auth);

    const existing = await getTavleSubscription(auth.tenantId);
    if (existing) throw new Error("HMS Tavle-abonnement finnes allerede");

    const subscription = await prisma.hmsTavleSubscription.create({
      data: {
        tenantId: auth.tenantId,
        plan: "ADDON",
        status: "ACTIVE",
        isAddon: true,
        pricePerMonth: 290,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 år default
        autoRenew: true,
      },
    });

    revalidatePath("/dashboard/hms-tavle");
    return { success: true, data: subscription };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke aktivere HMS Tavle add-on" };
  }
}

export async function getTavleSubscriptionStatus() {
  try {
    const auth = await getTavleContext();
    const sub = await getTavleSubscription(auth.tenantId);
    return { success: true, data: sub };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── Innsjekk ───────────────────────────────────────────────────

export async function getTodayCheckins(tavleId: string) {
  try {
    const auth = await getTavleContext();
    const tavle = await prisma.hmsTavle.findFirst({
      where: { id: tavleId, tenantId: auth.tenantId },
    });
    if (!tavle) throw new Error("Tavle ikke funnet");

    const today = new Date().toISOString().slice(0, 10);
    const checkins = await prisma.tavleCheckin.findMany({
      where: { tavleId, date: today },
      orderBy: { checkedInAt: "asc" },
    });

    return { success: true, data: checkins };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente innsjekk" };
  }
}

// ─── Hjelpefunksjon: standard-seksjoner ──────────────────────────

function getDefaultSections(plan: HmsTavlePlan) {
  const base = [
    { type: "KONTAKTINFO" as HmsTavleSectionType, order: 1, isVisible: true, config: {} },
    { type: "BEREDSKAPSPLAN" as HmsTavleSectionType, order: 2, isVisible: true, config: {} },
    { type: "SHA_PLAN" as HmsTavleSectionType, order: 3, isVisible: true, config: {} },
    { type: "DOKUMENT_HUB" as HmsTavleSectionType, order: 4, isVisible: true, config: {} },
  ];

  if (plan === "STANDARD" || plan === "AVANSERT" || plan === "ADDON") {
    base.push(
      { type: "MANNSKAPSLISTE" as HmsTavleSectionType, order: 5, isVisible: true, config: {} },
      { type: "AVVIK_STATISTIKK" as HmsTavleSectionType, order: 6, isVisible: true, config: {} },
      { type: "NYHETER_MELDINGER" as HmsTavleSectionType, order: 7, isVisible: true, config: {} }
    );
  }

  if (plan === "AVANSERT" || plan === "ADDON") {
    base.push(
      { type: "LOVKRAV_SJEKKLISTE" as HmsTavleSectionType, order: 8, isVisible: true, config: {} },
      { type: "KPI_DASHBOARD" as HmsTavleSectionType, order: 9, isVisible: true, config: {} }
    );
  }

  return base;
}
