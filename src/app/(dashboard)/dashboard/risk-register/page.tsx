import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskRegisterTable } from "@/features/risks/components/risk-register-table";

export default async function RiskRegisterPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    redirect("/login");
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    redirect("/login");
  }

  const tenantId = selectedMembership.tenantId;

  const risks = await prisma.risk.findMany({
    where: { tenantId },
    include: {
      owner: { select: { name: true, email: true } },
      controls: { select: { status: true, effectiveness: true } },
      documentLinks: { select: { id: true } },
      auditLinks: { select: { id: true } },
      measures: { select: { status: true } },
    },
    orderBy: [
      { score: "desc" },
      { updatedAt: "desc" },
    ],
  });

  const rows = risks.map((risk) => ({
    id: risk.id,
    title: risk.title,
    category: risk.category,
    status: risk.status,
    score: risk.score,
    residualScore: risk.residualScore,
    owner: risk.owner,
    responseStrategy: risk.responseStrategy,
    trend: risk.trend,
    nextReviewDate: risk.nextReviewDate,
    controls: risk.controls,
    documentCount: risk.documentLinks.length,
    auditCount: risk.auditLinks.length,
    measuresOpen: risk.measures.filter((measure) => measure.status !== "DONE").length,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enterprise risk register</CardTitle>
          <CardDescription>Helhetlig oversikt over virksomhetens topp-risikoer med koblede kontroller og tiltak</CardDescription>
        </CardHeader>
        <CardContent>
          <RiskRegisterTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}

