import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getPermissions } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { ArrowLeft, Edit, FileText, Calendar, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { ManagementReviewStatus } from "@prisma/client";

async function getManagementReview(id: string, tenantId: string) {
  return await db.managementReview.findFirst({
    where: {
      id,
      tenantId,
    },
  });
}

function getStatusBadge(status: ManagementReviewStatus) {
  switch (status) {
    case "PLANNED":
      return <Badge variant="secondary">Planlagt</Badge>;
    case "IN_PROGRESS":
      return <Badge className="bg-blue-500 hover:bg-blue-500">Pågår</Badge>;
    case "COMPLETED":
      return <Badge className="bg-yellow-500 hover:bg-yellow-500">Fullført</Badge>;
    case "APPROVED":
      return <Badge className="bg-green-600 hover:bg-green-600">Godkjent</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default async function ManagementReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || !session.user.tenantId) {
    return notFound();
  }

  const permissions = getPermissions(session.user.role);

  if (!permissions.canReadManagementReviews) {
    redirect("/dashboard");
  }

  const review = await getManagementReview(id, session.user.tenantId);

  if (!review) {
    return notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/management-reviews">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{review.title}</h1>
            <p className="text-muted-foreground">
              {format(new Date(review.reviewDate), "dd. MMMM yyyy", { locale: nb })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(review.status)}
          {permissions.canCreateManagementReviews && (
            <Button asChild>
              <Link href={`/dashboard/management-reviews/${review.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Rediger
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Grunnleggende informasjon */}
      <Card>
        <CardHeader>
          <CardTitle>Grunnleggende informasjon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Periode</p>
              <p className="text-lg font-semibold">{review.period}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Gjennomført av</p>
              <p className="text-lg">{review.conductedBy}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Opprettet</p>
              <p className="text-lg">
                {format(new Date(review.createdAt), "dd. MMM yyyy HH:mm", { locale: nb })}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sist oppdatert</p>
              <p className="text-lg">
                {format(new Date(review.updatedAt), "dd. MMM yyyy HH:mm", { locale: nb })}
              </p>
            </div>
          </div>

          {review.approvedAt && review.approvedBy && (
            <>
              <Separator />
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 dark:bg-green-950">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Godkjent av {review.approvedBy}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {format(new Date(review.approvedAt), "dd. MMMM yyyy 'kl.' HH:mm", { locale: nb })}
                  </p>
                </div>
              </div>
            </>
          )}

          {review.nextReviewDate && (
            <>
              <Separator />
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Neste gjennomgang planlagt
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {format(new Date(review.nextReviewDate), "dd. MMMM yyyy", { locale: nb })}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* HMS-gjennomgang */}
      <Card>
        <CardHeader>
          <CardTitle>HMS-gjennomgang</CardTitle>
          <CardDescription>Status og resultater fra ulike HMS-områder</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {review.hmsGoalsReview && (
            <div>
              <h3 className="mb-2 font-semibold">HMS-mål og resultater</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {review.hmsGoalsReview}
              </p>
            </div>
          )}

          {review.incidentStatistics && (
            <div>
              <h3 className="mb-2 font-semibold">Avvik og hendelser</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {review.incidentStatistics}
              </p>
            </div>
          )}

          {review.riskReview && (
            <div>
              <h3 className="mb-2 font-semibold">Risikovurderinger</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {review.riskReview}
              </p>
            </div>
          )}

          {review.auditResults && (
            <div>
              <h3 className="mb-2 font-semibold">Revisjoner og inspeksjoner</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {review.auditResults}
              </p>
            </div>
          )}

          {review.trainingStatus && (
            <div>
              <h3 className="mb-2 font-semibold">Opplæring og kompetanse</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {review.trainingStatus}
              </p>
            </div>
          )}

          {review.resourcesReview && (
            <div>
              <h3 className="mb-2 font-semibold">Ressurser og budsjett</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {review.resourcesReview}
              </p>
            </div>
          )}

          {review.externalChanges && (
            <div>
              <h3 className="mb-2 font-semibold">Eksterne endringer</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {review.externalChanges}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Konklusjoner og oppfølging */}
      {(review.conclusions || review.notes) && (
        <Card>
          <CardHeader>
            <CardTitle>Konklusjoner og oppfølging</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {review.conclusions && (
              <div>
                <h3 className="mb-2 font-semibold">Konklusjoner</h3>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {review.conclusions}
                </p>
              </div>
            )}

            {review.notes && (
              <div>
                <h3 className="mb-2 font-semibold">Notater</h3>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {review.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

