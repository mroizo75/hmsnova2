import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { Building2, Eye, Landmark } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminPagination, AdminPaginationSearch } from "@/components/admin-pagination";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  REGISTRATION_QUEUE_PAGE_SIZE,
  NEW_GROUP_WINDOW_DAYS,
  NEW_ONBOARDING_STATUSES,
  companyAdminHref,
  countPendingGroupMembers,
  mergeRegistrationQueueKeys,
  paginateQueue,
} from "@/lib/admin-registration-queue";
import { getIndustryLabel } from "@/lib/industry-packages";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Nye registreringer | HMS Nova Admin",
  description: "Oversikt over nye bedrifter og konsern",
};

const VISIBLE_GROUP_COMPANIES = 4;

function formatRegisteredAt(date: Date) {
  return date.toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function RegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const requestedPage = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const searchTerm = params.search?.trim() || "";

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isSuperAdmin: true, isSupport: true },
  });

  if (!user?.isSuperAdmin && !user?.isSupport) redirect("/dashboard");

  const newGroupSince = new Date();
  newGroupSince.setDate(newGroupSince.getDate() - NEW_GROUP_WINDOW_DAYS);

  const tenantSearch: Prisma.TenantWhereInput = searchTerm
    ? {
        OR: [
          { name: { contains: searchTerm } },
          { orgNumber: { contains: searchTerm } },
          { contactEmail: { contains: searchTerm } },
          { contactPerson: { contains: searchTerm } },
        ],
      }
    : {};

  const tenantWhere: Prisma.TenantWhereInput = {
    onboardingStatus: { in: [...NEW_ONBOARDING_STATUSES] },
    corporateGroupMemberships: { none: { status: "ACTIVE" } },
    ...tenantSearch,
  };

  const groupSearch: Prisma.CorporateGroupWhereInput[] = searchTerm
    ? [
        {
          OR: [
            { name: { contains: searchTerm } },
            { orgNumber: { contains: searchTerm } },
            { contactEmail: { contains: searchTerm } },
            {
              tenants: {
                some: {
                  status: "ACTIVE",
                  tenant: {
                    OR: [
                      { name: { contains: searchTerm } },
                      { orgNumber: { contains: searchTerm } },
                    ],
                  },
                },
              },
            },
          ],
        },
      ]
    : [];

  const groupWhere: Prisma.CorporateGroupWhereInput = {
    AND: [
      {
        OR: [
          { createdAt: { gte: newGroupSince } },
          {
            tenants: {
              some: {
                status: "ACTIVE",
                tenant: { onboardingStatus: { in: [...NEW_ONBOARDING_STATUSES] } },
              },
            },
          },
        ],
      },
      ...groupSearch,
    ],
  };

  const [tenantKeys, groupKeys] = await Promise.all([
    prisma.tenant.findMany({
      where: tenantWhere,
      select: { id: true, createdAt: true },
    }),
    prisma.corporateGroup.findMany({
      where: groupWhere,
      select: { id: true, createdAt: true },
    }),
  ]);

  const queue = paginateQueue(
    mergeRegistrationQueueKeys(tenantKeys, groupKeys),
    requestedPage,
    REGISTRATION_QUEUE_PAGE_SIZE,
  );

  const pageTenantIds = queue.items
    .filter((item) => item.kind === "tenant")
    .map((item) => item.id);
  const pageGroupIds = queue.items
    .filter((item) => item.kind === "group")
    .map((item) => item.id);

  const [tenants, groups] = await Promise.all([
    pageTenantIds.length
      ? prisma.tenant.findMany({
          where: { id: { in: pageTenantIds } },
          select: {
            id: true,
            name: true,
            orgNumber: true,
            contactPerson: true,
            contactEmail: true,
            employeeCount: true,
            industry: true,
            onboardingStatus: true,
            createdAt: true,
            _count: { select: { users: true } },
          },
        })
      : Promise.resolve([]),
    pageGroupIds.length
      ? prisma.corporateGroup.findMany({
          where: { id: { in: pageGroupIds } },
          select: {
            id: true,
            name: true,
            orgNumber: true,
            contactEmail: true,
            createdAt: true,
            tenants: {
              where: { status: "ACTIVE" },
              orderBy: { joinedAt: "asc" },
              select: {
                tenant: {
                  select: {
                    id: true,
                    name: true,
                    orgNumber: true,
                    onboardingStatus: true,
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const tenantMap = new Map(tenants.map((tenant) => [tenant.id, tenant]));
  const groupMap = new Map(groups.map((group) => [group.id, group]));
  const groupCount = groupKeys.length;
  const standaloneCount = tenantKeys.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Nye registreringer</h1>
          <p className="text-muted-foreground">
            Oversikt over nye kunder. Konsern vises som én rad med alle bedrifter under.
            {queue.totalItems > 0 ? ` ${queue.totalItems} totalt.` : ""}
          </p>
        </div>
        <AdminPaginationSearch
          basePath="/admin/registrations"
          searchTerm={searchTerm}
          placeholder="Søk navn, org.nr, e-post..."
        />
      </div>

      {queue.items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 text-lg font-medium">
              {searchTerm ? "Ingen treff" : "Ingen nye registreringer"}
            </p>
            <p className="text-sm text-muted-foreground">
              {searchTerm
                ? `Ingen registreringer matcher «${searchTerm}»`
                : "Når bedrifter eller konsern registrerer seg, vises de her"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Nye kunder ({queue.totalItems})</CardTitle>
            <CardDescription>
              {standaloneCount} {standaloneCount === 1 ? "bedrift" : "bedrifter"} uten konsern
              {" · "}
              {groupCount} konsern. Maks {REGISTRATION_QUEUE_PAGE_SIZE} per side.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kunde</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Org.nr</TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead>Bedrifter</TableHead>
                  <TableHead>Registrert</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Handling</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.items.map((item) => {
                  if (item.kind === "tenant") {
                    const tenant = tenantMap.get(item.id);
                    if (!tenant) return null;
                    const isNew = tenant.onboardingStatus === "NOT_STARTED";
                    const hasUsers = tenant._count.users > 0;
                    const industryLabel = tenant.industry
                      ? getIndustryLabel(tenant.industry)
                      : null;

                    return (
                      <TableRow key={`tenant-${tenant.id}`}>
                        <TableCell>
                          <Link
                            href={`/admin/registrations/${tenant.id}`}
                            className="font-medium hover:underline"
                          >
                            {tenant.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {tenant.employeeCount
                              ? `${tenant.employeeCount} ansatte`
                              : "Ukjent antall ansatte"}
                            {industryLabel ? ` · ${industryLabel}` : ""}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1">
                            <Building2 className="h-3 w-3" />
                            Bedrift
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {tenant.orgNumber || "—"}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{tenant.contactPerson || "—"}</p>
                          <p className="text-xs text-muted-foreground">{tenant.contactEmail}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">—</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatRegisteredAt(tenant.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {isNew ? (
                              <Badge>NY</Badge>
                            ) : (
                              <Badge variant="secondary">Behandles</Badge>
                            )}
                            {hasUsers && <Badge variant="outline">Konto opprettet</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm">
                            <Link href={`/admin/registrations/${tenant.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Se detaljer
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  const group = groupMap.get(item.id);
                  if (!group) return null;

                  const members = group.tenants.map((membership) => membership.tenant);
                  const pendingCount = countPendingGroupMembers(members);
                  const visibleMembers = members.slice(0, VISIBLE_GROUP_COMPANIES);
                  const hiddenCount = members.length - visibleMembers.length;
                  return (
                    <TableRow key={`group-${group.id}`}>
                      <TableCell>
                        <Link
                          href={`/admin/konsern/${group.id}`}
                          className="font-medium hover:underline"
                        >
                          {group.name}
                        </Link>
                        {members.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                            {visibleMembers.map((member, index) => (
                              <span key={member.id}>
                                <Link
                                  href={companyAdminHref(member.onboardingStatus, member.id)}
                                  className="hover:underline"
                                >
                                  {member.name}
                                </Link>
                                {index < visibleMembers.length - 1 || hiddenCount > 0 ? "," : ""}
                              </span>
                            ))}
                            {hiddenCount > 0 && (
                              <Link
                                href={`/admin/konsern/${group.id}`}
                                className="hover:underline"
                              >
                                +{hiddenCount} flere
                              </Link>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className="gap-1">
                          <Landmark className="h-3 w-3" />
                          Konsern
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {group.orgNumber || "—"}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{group.contactEmail || "—"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">
                          {members.length} {members.length === 1 ? "bedrift" : "bedrifter"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pendingCount > 0
                            ? `${pendingCount} trenger oppsett`
                            : "Alle i drift"}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatRegisteredAt(group.createdAt)}
                      </TableCell>
                      <TableCell>
                        {pendingCount > 0 ? (
                          <Badge>NY</Badge>
                        ) : (
                          <Badge variant="secondary">I drift</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm">
                          <Link href={`/admin/konsern/${group.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Se konsern
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AdminPagination
        currentPage={queue.currentPage}
        totalPages={queue.totalPages}
        totalItems={queue.totalItems}
        basePath="/admin/registrations"
        searchTerm={searchTerm}
      />
    </div>
  );
}
