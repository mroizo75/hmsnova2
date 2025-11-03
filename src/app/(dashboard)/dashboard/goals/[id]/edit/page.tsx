import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { GoalForm } from "@/features/goals/components/goal-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function EditGoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      tenants: {
        include: {
          tenant: true,
        },
      },
    },
  });

  if (!user || user.tenants.length === 0) {
    return <div>Du er ikke tilknyttet en tenant.</div>;
  }

  const tenantId = user.tenants[0].tenantId;

  const goal = await prisma.goal.findUnique({
    where: { id, tenantId },
  });

  if (!goal) {
    notFound();
  }

  // Hent alle brukere i tenant for ansvarlig-dropdown
  const tenantUsers = await prisma.userTenant.findMany({
    where: { tenantId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const users = tenantUsers.map((ut) => ut.user);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href={`/dashboard/goals/${goal.id}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til mål
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Rediger mål</h1>
        <p className="text-muted-foreground">{goal.title}</p>
      </div>

      <GoalForm tenantId={tenantId} users={users} goal={goal} mode="edit" />
    </div>
  );
}

