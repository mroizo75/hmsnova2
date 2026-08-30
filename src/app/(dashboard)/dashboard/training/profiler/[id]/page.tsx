import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAuthContext } from "@/lib/server-authorization";
import { prisma } from "@/lib/db";
import { fetchProfileById } from "@/server/queries/competence.queries";
import { CompetenceProfileDetail } from "@/features/training/components/competence-profile-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProfilDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const { id } = await params;
  const auth = await getAuthContext();
  const profile = await fetchProfileById(id);
  if (!profile) notFound();

  const tenantUsers = await prisma.userTenant.findMany({
    where: { tenantId: auth.tenantId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return (
    <CompetenceProfileDetail
      profile={profile}
      availableUsers={tenantUsers.map((ut) => ut.user)}
      canEdit={auth.permissions.canCreateTraining || auth.permissions.canAssignTraining}
    />
  );
}
