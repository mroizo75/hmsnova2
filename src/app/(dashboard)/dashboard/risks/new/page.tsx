import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { RiskAssessmentForm } from "@/features/risks/components/risk-assessment-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewRiskAssessmentPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const { prisma } = await import("@/lib/db");
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    return <div>Ingen tilgang til tenant</div>;
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return <div>Ingen tilgang til tenant</div>;
  }

  const tenantId = selectedMembership.tenantId;
  const currentYear = new Date().getFullYear();
  const projects = await prisma.project.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/risks">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til risikovurdering
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Ny risikovurdering</h1>
        <p className="text-muted-foreground">
          Opprett en risikovurdering for et år (f.eks. 2026). Deretter legger du inn risikopunkter nedover i listen – ISO 45001.
        </p>
      </div>

      <RiskAssessmentForm tenantId={tenantId} defaultYear={currentYear} projects={projects} />
    </div>
  );
}
