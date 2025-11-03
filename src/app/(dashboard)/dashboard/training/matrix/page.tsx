import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { CompetenceMatrix } from "@/features/training/components/competence-matrix";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";

export default async function CompetenceMatrixPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    return <div>Ingen tilgang til tenant</div>;
  }

  const tenantId = user.tenants[0].tenantId;

  // Hent alle brukere for tenant
  const users = await prisma.user.findMany({
    where: {
      tenants: {
        some: { tenantId },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  // Hent all opplæring for tenanten
  const trainings = await prisma.training.findMany({
    where: { tenantId },
    orderBy: { courseKey: "asc" },
  });

  // Bygg matrise: Grupperopplæring per bruker
  const matrix = users.map((u) => ({
    user: u,
    trainings: trainings.filter((t) => t.userId === u.id),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/dashboard/training">
              <ArrowLeft className="mr-2 h-4 w-4" /> Tilbake til opplæring
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Kompetansematrise</h1>
          <p className="text-muted-foreground">
            Oversikt over hvilken kompetanse hver ansatt har
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Eksporter til PDF
        </Button>
      </div>

      <CompetenceMatrix matrix={matrix} />
    </div>
  );
}

