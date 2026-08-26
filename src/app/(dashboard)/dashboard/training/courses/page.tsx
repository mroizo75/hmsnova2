import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { fetchTrainingCourses } from "@/server/queries/training.queries";
import { CoursesContent } from "@/features/training/components/courses-content";

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
  const initialData = await fetchTrainingCourses();

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

      <CoursesContent initialData={initialData} tenantId={tenantId} />
    </div>
  );
}
