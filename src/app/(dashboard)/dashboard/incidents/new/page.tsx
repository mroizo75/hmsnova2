import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { IncidentForm } from "@/features/incidents/components/incident-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewIncidentPage() {
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
          <Link href="/dashboard/incidents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til avvik
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Rapporter avvik</h1>
        <p className="text-muted-foreground">
          ISO 9001: Rapporter hendelser, avvik og nestenulykker
        </p>
      </div>

      <IncidentForm tenantId={tenantId} userId={user.id} />
    </div>
  );
}

