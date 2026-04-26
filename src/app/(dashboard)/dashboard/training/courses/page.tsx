import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { CourseTemplatesManager } from "@/features/training/components/course-templates-manager";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

export default async function CourseTemplatesPage() {
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

  const tenantId = selectedMembership.tenantId;

  // Hent globale kurs og tenant-spesifikke kurs
  const [globalCourses, tenantCourses] = await Promise.all([
    prisma.courseTemplate.findMany({
      where: { isGlobal: true, isActive: true },
      orderBy: { title: "asc" },
    }),
    prisma.courseTemplate.findMany({
      where: { tenantId, isActive: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/training">
            <ArrowLeft className="mr-2 h-4 w-4" /> Tilbake til kompetanse
          </Link>
        </Button>
        
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Kursmaler</h1>
            <p className="text-muted-foreground">
              Administrer hvilke kurs som er tilgjengelige for bedriften
            </p>
          </div>
        </div>
      </div>

      <CourseTemplatesManager
        tenantId={tenantId}
        globalCourses={globalCourses}
        tenantCourses={tenantCourses}
      />
    </div>
  );
}
