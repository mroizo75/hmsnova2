import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { fetchRuhDetail } from "@/server/queries/ruh-detail.queries";
import { RuhDetailContent } from "@/features/ruh/components/ruh-detail-content";

export default async function RuhDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  const initialData = await fetchRuhDetail(id);

  if (!initialData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold">RUH-rapport ikke funnet</h2>
        <Link href="/dashboard/ruh" className="text-primary hover:underline mt-4 block">
          Tilbake til oversikt
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RuhDetailContent initialData={initialData} ruhId={id} />
    </div>
  );
}
