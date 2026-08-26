import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAllServiceRequests } from "@/server/actions/admin-service-request.actions";
import { ServiceRequestsTable } from "@/features/admin/components/service-requests-table";

export default async function ServiceRequestsPage() {
  const session = await getServerSession(authOptions);
  const currentUser = session?.user?.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { isSuperAdmin: true },
      })
    : null;

  if (!currentUser?.isSuperAdmin) redirect("/dashboard");

  const requests = await getAllServiceRequests();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Serviceforespørsler</h1>
        <p className="text-muted-foreground">
          Forespørsler om HMS-oppsett fra kunder
        </p>
      </div>

      <ServiceRequestsTable requests={requests} />
    </div>
  );
}
