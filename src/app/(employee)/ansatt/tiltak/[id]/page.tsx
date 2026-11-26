import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getMeasureStatusColor, getMeasureStatusLabel } from "@/features/measures/schemas/measure.schema";
import { OwnMeasureProgress } from "@/features/measures/components/own-measure-progress";

export default async function EmployeeMeasurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || !session.user.id) redirect("/login");

  const measure = await prisma.measure.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
      responsibleId: session.user.id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      dueAt: true,
      effectivenessNote: true,
    },
  });
  if (!measure) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/ansatt/tiltak" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Mine tiltak
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{measure.title}</h1>
        <Badge className={getMeasureStatusColor(measure.status)}>
          {getMeasureStatusLabel(measure.status)}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Frist {new Date(measure.dueAt).toLocaleDateString("nb-NO")}
      </p>
      {measure.description && (
        <p className="whitespace-pre-wrap text-sm">{measure.description}</p>
      )}
      {measure.status === "DONE" && measure.effectivenessNote && (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{measure.effectivenessNote}</p>
      )}
      <OwnMeasureProgress measureId={measure.id} status={measure.status} />
    </div>
  );
}
