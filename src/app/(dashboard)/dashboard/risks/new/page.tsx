import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RiskForm } from "@/features/risks/components/risk-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewRiskPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/risks">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til risikoer
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Ny risikovurdering</h1>
        <p className="text-muted-foreground">
          Vurder sannsynlighet og konsekvens i 5x5-matrisen
        </p>
      </div>

      <RiskForm tenantId={tenantId} userId={user.id} mode="create" />
    </div>
  );
}

