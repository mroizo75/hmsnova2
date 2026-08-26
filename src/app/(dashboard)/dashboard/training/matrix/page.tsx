import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { fetchTrainingMatrix } from "@/server/queries/training.queries";
import { MatrixContent } from "@/features/training/components/matrix-content";

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

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return <div>Ingen tilgang til tenant</div>;
  }

  const tenantId = selectedMembership.tenantId;
  const initialData = await fetchTrainingMatrix();

  return (
    <div className="space-y-6 print:space-y-2">
      <div className="print:hidden">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/training">
            <ArrowLeft className="mr-2 h-4 w-4" /> Tilbake til kompetanse
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Kompetansematrise</h1>
        <p className="text-muted-foreground">
          Oversikt over hvilken kompetanse hver ansatt har
        </p>
      </div>

      <MatrixContent initialData={initialData} tenantId={tenantId} />
    </div>
  );
}
