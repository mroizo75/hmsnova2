import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getResourceHistory } from "@/server/actions/activity-history.actions";
import { fetchSjaDetail } from "@/server/queries/sja.queries";
import { SjaDetailContent } from "@/features/sja/components/sja-detail-content";

export default async function SjaDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
    return <div>Ingen tilgang til tenant</div>;
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return <div>Ingen tilgang til tenant</div>;
  }

  const analysis = await fetchSjaDetail(id);
  const history = await getResourceHistory(id);

  if (!analysis) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold">SJA ikke funnet</h2>
        <Link href="/dashboard/sja" className="text-primary hover:underline mt-4 block">
          Tilbake til oversikt
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/sja" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{analysis.title}</h1>
            </div>
            {analysis.sjaNummer && (
              <p className="text-sm text-muted-foreground font-mono">{analysis.sjaNummer}</p>
            )}
          </div>
        </div>
      </div>

      <SjaDetailContent initialData={analysis} history={history} />
    </div>
  );
}
