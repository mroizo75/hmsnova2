import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { FlaskConical, Plus } from "lucide-react";
import Link from "next/link";
import { fetchExposureRegister } from "@/server/queries/exposure-register.queries";
import { ExposureRegisterContent } from "@/features/chemicals/components/exposure-register-content";

export default async function ExposureRegisterPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: { include: { tenant: true } } },
  });

  if (!user || user.tenants.length === 0) {
    return <div>Du er ikke tilknyttet en tenant.</div>;
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return <div>Du er ikke tilknyttet en tenant.</div>;
  }

  const initialData = await fetchExposureRegister();

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-9 w-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
              <FlaskConical className="h-5 w-5 text-orange-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Eksponeringsregister</h1>
          </div>
          <p className="text-sm text-muted-foreground pl-0.5">
            Oversikt over ansatte eksponert for helseskadelige stoffer og faktorer · Oppbevares 40–60 år
          </p>
        </div>
        <Link href="/dashboard/exposure-register/new">
          <Button className="w-full sm:w-auto shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            Registrer eksponering
          </Button>
        </Link>
      </div>

      <ExposureRegisterContent initialData={initialData} />
    </div>
  );
}
