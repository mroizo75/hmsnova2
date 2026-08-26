import Link from "next/link";
import { Building2, Plus, Users, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminPagination, AdminPaginationSearch } from "@/components/admin-pagination";

const ITEMS_PER_PAGE = 25;

export default async function AdminCorporateGroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return <div className="p-8">Ingen tilgang</div>;
  }

  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const searchTerm = params.search?.trim() || "";

  const where = searchTerm
    ? {
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" as const } },
          { orgNumber: { contains: searchTerm, mode: "insensitive" as const } },
          { contactEmail: { contains: searchTerm, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [totalItems, groups] = await Promise.all([
    prisma.corporateGroup.count({ where }),
    prisma.corporateGroup.findMany({
      where,
      include: {
        _count: {
          select: { tenants: true, users: true, content: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
    }),
  ]);

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Konsern-administrasjon</h1>
          <p className="mt-1 text-sm text-gray-500">
            Opprett og administrer konsern/kjeder
          </p>
        </div>
        <Link href="/admin/konsern/ny">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nytt konsern
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Konsern ({totalItems})</CardTitle>
            <AdminPaginationSearch
              basePath="/admin/konsern"
              searchTerm={searchTerm}
              placeholder="Søk på navn, org.nr, e-post..."
            />
          </div>
        </CardHeader>
      </Card>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-gray-300" />
            <p className="mt-4 text-sm text-gray-500">
              {searchTerm ? "Ingen konsern matcher søket." : "Ingen konsern opprettet ennå."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Link key={group.id} href={`/admin/konsern/${group.id}`}>
              <Card className="transition-colors hover:border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{group.name}</CardTitle>
                  {group.orgNumber && (
                    <p className="text-xs text-gray-500">Org.nr: {group.orgNumber}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {group._count.tenants} bedrifter
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {group._count.users} brukere
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {group._count.content} innhold
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        basePath="/admin/konsern"
        searchTerm={searchTerm}
      />
    </div>
  );
}
