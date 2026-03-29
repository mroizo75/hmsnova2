import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProjectForm } from "@/features/projects/components/project-form";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
  const { id } = await params;

  const [project, users] = await Promise.all([
    prisma.project.findUnique({ where: { id, tenantId } }),
    prisma.userTenant.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/projects/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Rediger prosjekt</h1>
          <p className="text-muted-foreground">{project.name}</p>
        </div>
      </div>

      <ProjectForm
        mode="edit"
        users={users.map((ut) => ut.user)}
        defaultValues={{
          id: project.id,
          name: project.name,
          code: project.code ?? undefined,
          orderNumber: project.orderNumber ?? undefined,
          clientName: project.clientName ?? undefined,
          location: project.location ?? undefined,
          description: project.description ?? undefined,
          status: project.status,
          startDate: project.startDate?.toISOString().split("T")[0],
          endDate: project.endDate?.toISOString().split("T")[0],
          projectManagerId: project.projectManagerId ?? undefined,
        }}
      />
    </div>
  );
}
