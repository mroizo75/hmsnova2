import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { prisma } from "@/lib/db";
import { NyTavleForm } from "@/features/hms-tavle/components/ny-tavle-form";

export default async function NyTavlePage() {
  const auth = await getAuthContext();
  if (!auth.permissions.canManageHmsTavle) redirect("/dashboard/hms-tavle");

  const [subscription, projects] = await Promise.all([
    prisma.hmsTavleSubscription.findUnique({ where: { tenantId: auth.tenantId } }),
    prisma.project.findMany({
      where: {
        tenantId: auth.tenantId,
        status: { in: ["PLANNING", "ACTIVE"] },
        hmsTavle: null, // Kun prosjekter uten tavle
      },
      select: { id: true, name: true, location: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!subscription || subscription.status === "EXPIRED" || subscription.status === "CANCELLED") {
    redirect("/dashboard/hms-tavle");
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ny digital HMS-tavle</h1>
        <p className="text-muted-foreground mt-1">
          Opprett en ny tavle for et prosjekt eller byggeplass.
        </p>
      </div>
      <NyTavleForm projects={projects} plan={subscription.plan} />
    </div>
  );
}
