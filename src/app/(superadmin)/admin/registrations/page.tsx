import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminPagination, AdminPaginationSearch } from "@/components/admin-pagination";
import {
  Building2,
  Calendar,
  Mail,
  Phone,
  Users,
  MapPin,
  Clock,
  Eye,
  ArrowRight,
} from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const ITEMS_PER_PAGE = 25;

export const metadata = {
  title: "Nye registreringer | HMS Nova Admin",
  description: "Håndter nye bedriftsregistreringer",
};

export default async function RegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const searchTerm = params.search?.trim() || "";

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isSuperAdmin: true, isSupport: true },
  });

  if (!user?.isSuperAdmin && !user?.isSupport) redirect("/dashboard");

  const baseFilter: Prisma.TenantWhereInput = {
    onboardingStatus: { in: ["NOT_STARTED", "IN_PROGRESS"] },
  };

  const searchFilter: Prisma.TenantWhereInput = {
    ...baseFilter,
    ...(searchTerm
      ? {
          OR: [
            { name: { contains: searchTerm } },
            { orgNumber: { contains: searchTerm } },
            { contactEmail: { contains: searchTerm } },
          ],
        }
      : {}),
  };

  const totalItems = await prisma.tenant.count({ where: searchFilter });
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  const registrations = await prisma.tenant.findMany({
    where: searchFilter,
    include: {
      users: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
      subscription: true,
    },
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * ITEMS_PER_PAGE,
    take: ITEMS_PER_PAGE,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Nye registreringer</h1>
          <p className="text-muted-foreground">
            Behandle og aktiver nye bedriftsregistreringer ({totalItems} totalt)
          </p>
        </div>
        <AdminPaginationSearch
          basePath="/admin/registrations"
          searchTerm={searchTerm}
          placeholder="Søk navn, org.nr, e-post..."
        />
      </div>

      {registrations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">
              {searchTerm ? "Ingen treff" : "Ingen nye registreringer"}
            </p>
            <p className="text-sm text-muted-foreground">
              {searchTerm
                ? `Ingen registreringer matcher "${searchTerm}"`
                : "Når bedrifter registrerer seg, vises de her"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {registrations.map((registration) => {
            const hasUsers = registration.users && registration.users.length > 0;
            const isNew = registration.onboardingStatus === "NOT_STARTED";

            return (
              <Card key={registration.id} className={isNew ? "border-primary/50" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl">{registration.name}</CardTitle>
                        {isNew && (
                          <Badge variant="default" className="bg-primary">
                            NY
                          </Badge>
                        )}
                        {hasUsers && (
                          <Badge variant="secondary">Konto opprettet</Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <Building2 className="h-3 w-3" />
                        Org.nr: {registration.orgNumber || "Ikke oppgitt"}
                      </CardDescription>
                    </div>
                    <Link href={`/admin/registrations/${registration.id}`}>
                      <Button>
                        <Eye className="h-4 w-4 mr-2" />
                        Se detaljer
                      </Button>
                    </Link>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">{registration.contactPerson}</p>
                          <p className="text-muted-foreground text-xs">Kontaktperson</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">{registration.contactEmail}</p>
                          <p className="text-muted-foreground text-xs">E-post</p>
                        </div>
                      </div>

                      {registration.contactPhone && (
                        <div className="flex items-start gap-3 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="font-medium">{registration.contactPhone}</p>
                            <p className="text-muted-foreground text-xs">Telefon</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {(registration.address || registration.city) && (
                        <div className="flex items-start gap-3 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="font-medium">
                              {registration.address && <span>{registration.address}<br /></span>}
                              {registration.postalCode && registration.city && (
                                <span>{registration.postalCode} {registration.city}</span>
                              )}
                            </p>
                            <p className="text-muted-foreground text-xs">Adresse</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-3 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">
                            {registration.employeeCount || "Ukjent"} ansatte
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Bransje: {registration.industry || "Ikke oppgitt"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">
                            {new Date(registration.createdAt).toLocaleDateString("nb-NO", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                          <p className="text-muted-foreground text-xs">Registrert</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {registration.subscription && (
                    <div className="mt-6 pt-6 border-t">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {registration.pricingTier === "MICRO" && "Micro (1-20 ansatte)"}
                            {registration.pricingTier === "SMALL" && "Small (21-50 ansatte)"}
                            {registration.pricingTier === "MEDIUM" && "Medium (51+ ansatte)"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {registration.subscription.price.toLocaleString("nb-NO")} kr/år
                          </p>
                        </div>
                        {registration.trialEndsAt && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Prøveperiode til{" "}
                            {new Date(registration.trialEndsAt).toLocaleDateString("nb-NO")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {registration.notes && (
                    <div className="mt-6 pt-6 border-t">
                      <p className="text-sm font-medium mb-2">Merknader:</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {registration.notes}
                      </p>
                    </div>
                  )}

                  {!hasUsers && (
                    <div className="mt-6 pt-6 border-t">
                      <Link href={`/admin/registrations/${registration.id}`}>
                        <Button variant="outline" className="w-full">
                          Opprett admin-konto
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        basePath="/admin/registrations"
        searchTerm={searchTerm}
      />
    </div>
  );
}
