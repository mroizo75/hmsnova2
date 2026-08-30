import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchTemplates } from "@/server/queries/boarding.queries";
import { prisma } from "@/lib/db";
import { BoardingForm } from "@/features/boarding/components/boarding-form";

export default async function NyBoardingPage() {
  const auth = await getAuthContext();

  if (!auth.permissions.canCreateBoarding) {
    redirect("/dashboard/onboarding");
  }

  const templates = await fetchTemplates();

  const employees = await prisma.userTenant.findMany({
    where: { tenantId: auth.tenantId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <Button variant="ghost" size="sm" className="mb-3 -ml-2" asChild>
          <Link href="/dashboard/onboarding">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Tilbake
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Ny prosess</h1>
        <p className="mt-1 text-muted-foreground">
          Velg type, ansatt og mal. Oppgavene opprettes automatisk fra malen.
        </p>
      </div>

      <BoardingForm
        employees={JSON.parse(JSON.stringify(employees))}
        templates={templates}
      />
    </div>
  );
}
