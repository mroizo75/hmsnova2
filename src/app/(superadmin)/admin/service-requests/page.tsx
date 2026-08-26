import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ServiceRequestsTable } from "@/features/admin/components/service-requests-table";
import { AdminPagination, AdminPaginationSearch } from "@/components/admin-pagination";
import type { Prisma } from "@prisma/client";

const ITEMS_PER_PAGE = 25;

export default async function ServiceRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const searchTerm = params.search?.trim() || "";

  const session = await getServerSession(authOptions);
  const currentUser = session?.user?.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { isSuperAdmin: true },
      })
    : null;

  if (!currentUser?.isSuperAdmin) redirect("/dashboard");

  const searchFilter: Prisma.ServiceRequestWhereInput = searchTerm
    ? {
        OR: [
          { description: { contains: searchTerm } },
          { notes: { contains: searchTerm } },
          { tenant: { name: { contains: searchTerm } } },
          { tenant: { contactEmail: { contains: searchTerm } } },
        ],
      }
    : {};

  const totalItems = await prisma.serviceRequest.count({ where: searchFilter });
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  const requests = await prisma.serviceRequest.findMany({
    where: searchFilter,
    include: {
      tenant: { select: { id: true, name: true, contactEmail: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * ITEMS_PER_PAGE,
    take: ITEMS_PER_PAGE,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Serviceforespørsler</h1>
          <p className="text-muted-foreground">
            Forespørsler om HMS-oppsett fra kunder ({totalItems} totalt)
          </p>
        </div>
        <AdminPaginationSearch
          basePath="/admin/service-requests"
          searchTerm={searchTerm}
          placeholder="Søk bedrift, beskrivelse..."
        />
      </div>

      <ServiceRequestsTable requests={requests} />

      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        basePath="/admin/service-requests"
        searchTerm={searchTerm}
      />
    </div>
  );
}
