import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MeasureEditForm } from "@/features/measures/components/measure-edit-form";
import { getMeasureStatusLabel, getMeasureStatusColor } from "@/features/measures/schemas/measure.schema";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function MeasureDetailPage({
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
    redirect("/login");
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    redirect("/login");
  }

  const tenantId = selectedMembership.tenantId;

  const measure = await prisma.measure.findUnique({
    where: { id, tenantId },
    include: {
      risk: { select: { id: true, title: true } },
      incident: { select: { id: true, title: true } },
      audit: { select: { id: true, title: true } },
      goal: { select: { id: true, title: true } },
      responsible: { select: { id: true, name: true, email: true } },
    },
  });

  if (!measure) {
    notFound();
  }

  const tenantUsers = await prisma.user.findMany({
    where: {
      tenants: { some: { tenantId } },
    },
    select: { id: true, name: true, email: true },
  });

  const backUrl = measure.riskId
    ? `/dashboard/risks/${measure.riskId}#tiltak`
    : "/dashboard/actions";

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" asChild className="mb-4">
          <Link href={backUrl}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {measure.riskId ? "Tilbake til risikovurdering" : "Tilbake til tiltak"}
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">{measure.title}</h1>
          <Badge className={getMeasureStatusColor(measure.status)}>
            {getMeasureStatusLabel(measure.status)}
          </Badge>
        </div>
        {measure.risk && (
          <p className="text-muted-foreground mt-1">
            Knyttet til risiko: {measure.risk.title}
          </p>
        )}
      </div>

      <MeasureEditForm measure={measure} users={tenantUsers} />
    </div>
  );
}
