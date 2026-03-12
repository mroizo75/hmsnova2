import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { RiskAssessmentItemForm } from "@/features/risks/components/risk-assessment-item-form";
import { RiskAssessmentItemList } from "@/features/risks/components/risk-assessment-item-list";
import { RiskAssessmentComplianceCard } from "@/features/risks/components/risk-assessment-compliance-card";

export default async function RiskAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const [assessment, userTenants] = await Promise.all([
    prisma.riskAssessment.findFirst({
      where: { id, tenantId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        risks: {
          orderBy: [{ score: "desc" }, { assessmentDate: "desc" }, { createdAt: "asc" }],
          include: {
            owner: { select: { id: true, name: true, email: true } },
          },
        },
      },
    }),
    prisma.userTenant.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  if (!assessment) {
    notFound();
  }

  const userList = userTenants
    .filter((ut) => ut.user.email)
    .map((ut) => ({
      id: ut.user.id,
      name: ut.user.name,
      email: ut.user.email ?? "",
    }));

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/risks">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til risikovurdering
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">{assessment.title}</h1>
        <p className="text-muted-foreground">
          Systematisk risikovurdering i henhold til IK-HMS § 5 og AML § 3-1.
        </p>
        {assessment.project ? (
          <p className="text-sm text-blue-700 mt-2">
            Knyttet til prosjekt: <strong>{assessment.project.name}</strong>
          </p>
        ) : null}
      </div>

      <RiskAssessmentComplianceCard
        assessment={{
          id: assessment.id,
          participants: assessment.participants,
          approvedById: assessment.approvedById,
          approvedAt: assessment.approvedAt,
          reviewedById: assessment.reviewedById,
          reviewedAt: assessment.reviewedAt,
        }}
        users={userList}
      />

      <RiskAssessmentItemForm
        riskAssessmentId={assessment.id}
        tenantId={tenantId}
        ownerId={user.id}
      />

      <Card>
        <CardHeader>
          <CardTitle>Risikopunkter i denne vurderingen</CardTitle>
        </CardHeader>
        <CardContent>
          <RiskAssessmentItemList risks={assessment.risks} />
        </CardContent>
      </Card>
    </div>
  );
}
