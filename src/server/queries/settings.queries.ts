"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { HOSPITALITY_COURSE_KEYS } from "@/lib/hospitality-courses";
import { ensureHospitalityCourses } from "@/server/hospitality-courses";

export async function fetchSettingsData(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      tenants: {
        include: {
          tenant: {
            include: { subscription: true },
          },
        },
      },
    },
  });

  if (!user || user.tenants.length === 0) return null;

  const userTenant = user.tenants[0];
  const tenant = userTenant.tenant;
  const tenantId = tenant.id;
  const isAdmin = userTenant.role === "ADMIN";

  const [intelligenceConsent, tavleSubscription, tavleCount] = await Promise.all([
    prisma.intelligenceConsent.findUnique({ where: { tenantId } }),
    prisma.hmsTavleSubscription.findFirst({
      where: { tenantId, status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.hmsTavle.count({ where: { tenantId } }),
  ]);

  return JSON.parse(JSON.stringify({
    user,
    tenant,
    userTenant,
    isAdmin,
    intelligenceConsent,
    tavleSubscription,
    tavleCount,
    tenantId,
  }));
}

export async function fetchBeredskapReiselivData() {
  const auth = await getAuthContext();

  const [hendelser, evakueringsplaner] = await Promise.all([
    prisma.gjesteHendelse.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { occurredAt: "desc" },
      take: 50,
    }),
    prisma.hotellEvakueringsplan.findMany({
      where: { tenantId: auth.tenantId, isActive: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return JSON.parse(JSON.stringify({ hendelser, evakueringsplaner }));
}

export async function fetchBhtNattarbeidData() {
  const auth = await getAuthContext();

  const [avtaler, vurderinger] = await Promise.all([
    prisma.bhtAvtale.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { startDato: "desc" },
    }),
    prisma.nattarbeidVurdering.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const activeBht = avtaler.find((a) => a.isActive);
  const bhtExpired = activeBht?.sluttDato
    ? new Date(activeBht.sluttDato) < new Date()
    : false;

  return JSON.parse(JSON.stringify({ avtaler, vurderinger, bhtExpired }));
}

export async function fetchIkMatData() {
  const auth = await getAuthContext();

  const [haccpPlans, latestLogs, allergenItems, inspeksjoner, varemottakCount, renholdCount] = await Promise.all([
    prisma.haccpPlan.findMany({
      where: { tenantId: auth.tenantId, isActive: true },
      include: { ccp: { orderBy: { order: "asc" } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.temperaturLog.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { measuredAt: "desc" },
      take: 20,
    }),
    prisma.allergenOversikt.findMany({
      where: { tenantId: auth.tenantId, isActive: true },
      orderBy: [{ category: "asc" }, { dishName: "asc" }],
    }),
    prisma.mattilsynetInspeksjon.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { inspectedAt: "desc" },
      take: 5,
    }),
    prisma.matVaremottak.count({ where: { tenantId: auth.tenantId } }),
    prisma.matRenhold.count({ where: { tenantId: auth.tenantId } }),
  ]);

  const deviationCount = latestLogs.filter((l) => l.isDeviation).length;

  return JSON.parse(JSON.stringify({
    haccpPlans,
    latestLogs,
    allergenItems,
    inspeksjoner,
    deviationCount,
    varemottakCount,
    renholdCount,
  }));
}

export async function fetchHaccpData() {
  const auth = await getAuthContext();

  const planer = await prisma.haccpPlan.findMany({
    where: { tenantId: auth.tenantId },
    include: { ccp: { orderBy: { order: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  return JSON.parse(JSON.stringify(planer));
}

export async function fetchTemperaturData() {
  const auth = await getAuthContext();

  const logs = await prisma.temperaturLog.findMany({
    where: { tenantId: auth.tenantId },
    orderBy: { measuredAt: "desc" },
    take: 200,
  });

  const units = [...new Set(logs.map((l) => l.unitName))];

  return JSON.parse(JSON.stringify({ logs, units }));
}

export async function fetchAllergenData() {
  const auth = await getAuthContext();

  const items = await prisma.allergenOversikt.findMany({
    where: { tenantId: auth.tenantId },
    orderBy: [{ category: "asc" }, { dishName: "asc" }],
  });

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[];

  return JSON.parse(JSON.stringify({ items, categories }));
}

export async function fetchVaremottakData() {
  const auth = await getAuthContext();
  const items = await prisma.matVaremottak.findMany({
    where: { tenantId: auth.tenantId },
    orderBy: { receivedAt: "desc" },
    take: 200,
  });
  return JSON.parse(JSON.stringify({ items }));
}

export async function fetchRenholdData() {
  const auth = await getAuthContext();
  const items = await prisma.matRenhold.findMany({
    where: { tenantId: auth.tenantId },
    orderBy: { cleanedAt: "desc" },
    take: 200,
  });
  return JSON.parse(JSON.stringify({ items }));
}

export async function fetchSkjenkingData() {
  const auth = await getAuthContext();
  await ensureHospitalityCourses(auth.tenantId);

  const alcoholKey = HOSPITALITY_COURSE_KEYS.alcohol;

  const [bevilling, hendelser, course, trainings, users] = await Promise.all([
    prisma.skjenkeBevilling.findFirst({
      where: { tenantId: auth.tenantId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.skjenkeHendelse.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { occurredAt: "desc" },
      take: 200,
    }),
    prisma.courseTemplate.findFirst({
      where: {
        courseKey: alcoholKey,
        isActive: true,
        OR: [{ tenantId: auth.tenantId }, { isGlobal: true }],
      },
    }),
    prisma.training.findMany({
      where: { tenantId: auth.tenantId, courseKey: alcoholKey },
    }),
    prisma.user.findMany({
      where: { tenants: { some: { tenantId: auth.tenantId } } },
      select: { id: true, name: true, email: true },
    }),
  ]);

  const now = new Date();
  const alcoholTraining = {
    courseKey: alcoholKey,
    title: course?.title ?? "Ansvarlig alkoholservering",
    users: users.map((user) => {
      const record = trainings.find((row) => row.userId === user.id && row.completedAt);
      const valid = Boolean(record && (!record.validUntil || new Date(record.validUntil) >= now));
      return {
        id: user.id,
        name: user.name ?? user.email ?? "Ukjent",
        completed: valid,
        validUntil: record?.validUntil ?? null,
      };
    }),
  };

  return JSON.parse(JSON.stringify({ bevilling, hendelser, alcoholTraining }));
}

export async function fetchTransportData() {
  const auth = await getAuthContext();

  const [journaler, sjaforDokumenter, loyveRegister] = await Promise.all([
    prisma.transportJournal.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.sjaforDokument.findMany({
      where: { tenantId: auth.tenantId, isActive: true },
      orderBy: { driverName: "asc" },
    }),
    prisma.loyveRegister.findMany({
      where: { tenantId: auth.tenantId, isActive: true },
      orderBy: { loyveType: "asc" },
    }),
  ]);

  const now = new Date();
  const expiringDocs = [
    ...sjaforDokumenter.filter((d) => d.kbUtlopDato && new Date(d.kbUtlopDato) < new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)),
    ...sjaforDokumenter.filter((d) => d.forerkortUtlop && new Date(d.forerkortUtlop) < new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)),
    ...loyveRegister.filter((l) => l.utlopDato && new Date(l.utlopDato) < new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)),
  ];

  return JSON.parse(JSON.stringify({ journaler, sjaforDokumenter, loyveRegister, expiringCount: expiringDocs.length }));
}
