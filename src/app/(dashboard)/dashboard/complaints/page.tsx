import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { ComplaintsContent } from "@/features/complaints/components/complaints-content";
import { fetchComplaints } from "@/server/queries/complaint.queries";

export default async function ComplaintsPage() {
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

  const initialData = await fetchComplaints();

  if (!initialData) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">Kunde- og brukerklager</h1>
            <p className="text-muted-foreground">
              ISO 10002: Samle inn, vurder og lukk kundetilbakemeldinger på en strukturert måte
            </p>
          </div>
          <PageHelpDialog content={helpContent.complaints} />
        </div>
        <Button asChild>
          <Link href="/dashboard/incidents/new?type=CUSTOMER">Registrer klage</Link>
        </Button>
      </div>

      <ComplaintsContent initialData={initialData} />
    </div>
  );
}
