import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { fetchMeasureDetail } from "@/server/queries/measure-detail.queries";
import { MeasureDetailContent } from "@/features/measures/components/measure-detail-content";

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

  const initialData = await fetchMeasureDetail(id);

  if (!initialData) {
    notFound();
  }

  const backUrl = initialData.measure.riskId
    ? `/dashboard/risks/${initialData.measure.riskId}#tiltak`
    : "/dashboard/actions";

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" asChild className="mb-4">
          <Link href={backUrl}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {initialData.measure.riskId ? "Tilbake til risikovurdering" : "Tilbake til tiltak"}
          </Link>
        </Button>
        <MeasureDetailContent initialData={initialData} measureId={id} />
      </div>
    </div>
  );
}
