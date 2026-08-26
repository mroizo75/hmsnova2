import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchRiskRegisterData } from "@/server/queries/risk-register.queries";
import { RiskRegisterContent } from "@/features/risks/components/risk-register-content";

export default async function RiskRegisterPage() {
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

  const initialData = await fetchRiskRegisterData();

  return <RiskRegisterContent initialData={initialData} />;
}
