import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InnsjekksClient } from "@/features/hms-tavle/components/innsjekk-client";
import { personerPaaPlassen } from "@/features/hms-tavle/lib/presence";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Innsjekk – HMS Tavle",
  robots: { index: false },
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InnsjekksPage({ params }: Props) {
  const { token } = await params;
  const [tavle, session] = await Promise.all([
    prisma.hmsTavle.findUnique({
      where: { publicToken: token },
      include: {
        tenant: { select: { name: true } },
        project: { select: { id: true, name: true } },
      },
    }),
    getServerSession(authOptions),
  ]);

  if (!tavle || !tavle.isPublic) notFound();

  const sub = await prisma.hmsTavleSubscription.findUnique({
    where: { tenantId: tavle.tenantId },
  });

  if (!sub || sub.plan === "ENKEL" || sub.status === "EXPIRED") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold mb-2">Innsjekk ikke tilgjengelig</h1>
          <p className="text-muted-foreground text-sm">
            QR-innsjekk krever Standard-plan eller høyere.
          </p>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const dagensRader = await prisma.tavleCheckin.findMany({
    where: { tavleId: tavle.id, date: today },
    select: { name: true, userId: true, checkedOutAt: true },
  });
  const todayCount = personerPaaPlassen(dagensRader).length;

  // Pålogget bruker får navn, telefon og HMS-kort fra systemet.
  let hmsNovaUser: {
    name: string;
    employer: string;
    phone: string;
    employerOrgNr: string;
    hmsCardNr: string;
    birthDate: string;
  } | null = null;
  if (session?.user?.id && session.user.tenantId === tavle.tenantId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, phone: true },
    });
    if (dbUser?.name) {
      const roster = tavle.project?.id
        ? await prisma.constructionRosterEntry.findFirst({
            where: {
              tenantId: tavle.tenantId,
              projectId: tavle.project.id,
              isActive: true,
              fullName: dbUser.name,
            },
            select: {
              employerName: true,
              employerOrgNumber: true,
              hmsCardNumber: true,
              birthDate: true,
            },
          })
        : null;
      hmsNovaUser = {
        name: dbUser.name,
        employer: roster?.employerName || session.user.tenantName || tavle.tenant.name,
        phone: dbUser.phone ?? "",
        employerOrgNr: roster?.employerOrgNumber ?? "",
        hmsCardNr: roster?.hmsCardNumber ?? "",
        birthDate: roster?.birthDate ? roster.birthDate.toISOString().slice(0, 10) : "",
      };
    }
  }

  const geofence =
    tavle.geofenceRadiusMeters != null && tavle.siteLatitude != null && tavle.siteLongitude != null
      ? {
          latitude: tavle.siteLatitude,
          longitude: tavle.siteLongitude,
          radiusMeters: tavle.geofenceRadiusMeters,
        }
      : null;

  return (
    <InnsjekksClient
      publicToken={token}
      tenantName={tavle.tenant.name}
      logoUrl={tavle.logoUrl}
      projectName={tavle.project?.name}
      brandColor={tavle.brandColor}
      todayCount={todayCount}
      hmsNovaUser={hmsNovaUser}
      geofence={geofence}
    />
  );
}
