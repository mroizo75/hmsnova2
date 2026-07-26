import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InnsjekksClient } from "@/features/hms-tavle/components/innsjekk-client";
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
        project: { select: { name: true } },
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
  const todayCount = await prisma.tavleCheckin.count({
    where: { tavleId: tavle.id, date: today },
  });

  // Hent telefonnummer for pålogget HMS Nova-bruker
  let hmsNovaUser: { name: string; employer: string; phone: string } | null = null;
  if (session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, phone: true },
    });
    if (dbUser?.name) {
      hmsNovaUser = {
        name: dbUser.name,
        employer: session.user.tenantName ?? tavle.tenant.name,
        phone: dbUser.phone ?? "",
      };
    }
  }

  return (
    <InnsjekksClient
      publicToken={token}
      tenantName={tavle.tenant.name}
      logoUrl={tavle.logoUrl}
      projectName={tavle.project?.name}
      brandColor={tavle.brandColor}
      todayCount={todayCount}
      hmsNovaUser={hmsNovaUser}
    />
  );
}
