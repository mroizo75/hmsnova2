import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAuthContext } from "@/lib/server-authorization";
import { prisma } from "@/lib/db";
import { CompetenceProfileForm } from "@/features/training/components/competence-profile-form";

export default async function NyProfilPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const auth = await getAuthContext();
  if (!auth.permissions.canCreateTraining) redirect("/dashboard/training/profiler");

  const courseTemplates = await prisma.courseTemplate.findMany({
    where: {
      OR: [
        { tenantId: auth.tenantId },
        { isGlobal: true },
      ],
    },
    select: { courseKey: true, title: true },
    orderBy: { title: "asc" },
  });

  return (
    <CompetenceProfileForm
      courseTemplates={courseTemplates.map((ct) => ({
        courseKey: ct.courseKey,
        title: ct.title,
      }))}
    />
  );
}
