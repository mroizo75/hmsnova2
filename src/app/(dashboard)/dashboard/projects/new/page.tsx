import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FolderOpen } from "lucide-react";
import Link from "next/link";
import { ProjectForm } from "@/features/projects/components/project-form";

export default async function NewProjectPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });
  if (!user || user.tenants.length === 0) return <div>Ingen tilgang</div>;

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) return <div>Ingen tilgang</div>;

  const tenantId = selectedMembership.tenantId;

  const [users, tenant, customers, parentProjects] = await Promise.all([
    prisma.userTenant.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { accountingProvider: true },
    }),
    prisma.accountingCustomer.findMany({
      where: { tenantId, isInactive: false },
      orderBy: { name: "asc" },
      take: 200,
    }),
    prisma.project.findMany({
      where: { tenantId, parentId: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const accountingEnabled = tenant?.accountingProvider === "TRIPLETEX";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-blue-600" />
            Nytt prosjekt / jobb
          </h1>
          <p className="text-muted-foreground">
            Knytt HMS-aktiviteter til dette prosjektet for samlet rapportering
          </p>
        </div>
      </div>

      <ProjectForm
        mode="create"
        users={users.map((ut) => ut.user)}
        accountingEnabled={accountingEnabled}
        customers={customers.map((c) => ({
          externalId: c.externalId,
          name: c.name,
          organizationNumber: c.organizationNumber,
        }))}
        parentProjects={parentProjects}
      />
    </div>
  );
}
