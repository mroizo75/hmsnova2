import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { EnvironmentReportButton } from "@/features/environment/components/environment-report-button";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { fetchEnvironmentList } from "@/server/queries/environment.queries";
import { EnvironmentContent } from "@/features/environment/components/environment-content";

export default async function EnvironmentPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      tenants: {
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
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

  const initialData = await fetchEnvironmentList();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm text-muted-foreground">ISO 14001</p>
            <h1 className="text-3xl font-bold">Miljøstyring</h1>
            <p className="text-muted-foreground">
              Oversikt over miljøaspekter, målinger og oppfølging
            </p>
          </div>
          <PageHelpDialog content={helpContent.environment} />
        </div>
        <div className="flex gap-2">
          <EnvironmentReportButton />
          <Button asChild>
            <Link href="/dashboard/environment/new">Nytt miljøaspekt</Link>
          </Button>
        </div>
      </div>

      <EnvironmentContent initialData={initialData} />
    </div>
  );
}
