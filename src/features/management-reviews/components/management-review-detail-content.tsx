"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { ArrowLeft, Edit, FileText, Calendar, CheckCircle2, Check } from "lucide-react";
import { ApproveManagementReviewButton } from "@/components/management-review/approve-button";
import { fetchManagementReviewDetail } from "@/server/queries/management-review.queries";

type ReviewDetailData = NonNullable<Awaited<ReturnType<typeof fetchManagementReviewDetail>>>;

interface ManagementReviewDetailContentProps {
  initialData: ReviewDetailData;
  reviewId: string;
  canCreateManagementReviews: boolean;
}

function getStatusBadge(status: string) {
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

export function ManagementReviewDetailContent({
  initialData,
  reviewId,
  canCreateManagementReviews,
}: ManagementReviewDetailContentProps) {
  const { data: review } = useQuery({
    queryKey: ["management-reviews", reviewId],
    queryFn: () => fetchManagementReviewDetail(reviewId),
    initialData,
  });

  if (!review) return null;

  return (
    <div className="space-y-6">
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
          {canCreateManagementReviews && review.status !== "APPROVED" && (
            <>
              <ApproveManagementReviewButton
                reviewId={review.id}
                canApprove={review.status === "COMPLETED"}
                documentsCount={review.documentsToReview.length}
              />
              <Button asChild>
                <Link href={`/dashboard/management-reviews/${review.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Rediger
                </Link>
              </Button>
            </>
          )}
          {review.status === "APPROVED" && canCreateManagementReviews && (
            <Button asChild>
              <Link href={`/dashboard/management-reviews/${review.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Rediger
              </Link>
            </Button>
          )}
        </div>
      </div>

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
              <p className="text-lg">{review.conductedByName}</p>
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

          {review.approvedAt && review.approvedByName && (
            <>
              <Separator />
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 dark:bg-green-950">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Godkjent av {review.approvedByName}
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
                  <p className="font-medium text-blue-900 dark:text-blue-100">Neste gjennomgang planlagt</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {format(new Date(review.nextReviewDate), "dd. MMMM yyyy", { locale: nb })}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {review.documentsToReview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Dokumenter til gjennomgang
            </CardTitle>
            <CardDescription>
              {review.documentsToReview.length} dokument(er) som skulle vært gjennomgått innen denne datoen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {review.documentsToReview.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{doc.title}</p>
                      <Badge variant={doc.status === "APPROVED" ? "default" : "secondary"}>
                        {doc.status === "APPROVED" ? "Godkjent" : doc.status === "DRAFT" ? "Utkast" : "Arkivert"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>Versjon: {doc.version}</span>
                      <span>
                        Skulle vært gjennomgått: {format(new Date(doc.nextReviewDate!), "dd. MMM yyyy", { locale: nb })}
                      </span>
                      {doc.status === "APPROVED" && doc.approvedAt && (
                        <span className="text-green-600 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Godkjent {format(new Date(doc.approvedAt), "dd. MMM yyyy", { locale: nb })}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link href={`/dashboard/documents/${doc.id}`}>
                    <Button variant="ghost" size="sm">Se dokument</Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>HMS-gjennomgang</CardTitle>
          <CardDescription>Status og resultater fra ulike HMS-områder</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {review.hmsGoalsReview && (
            <div>
              <h3 className="mb-2 font-semibold">HMS-mål og resultater</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{review.hmsGoalsReview}</p>
            </div>
          )}
          {review.incidentStatistics && (
            <div>
              <h3 className="mb-2 font-semibold">Avvik og hendelser</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{review.incidentStatistics}</p>
            </div>
          )}
          {review.riskReview && (
            <div>
              <h3 className="mb-2 font-semibold">Risikovurderinger</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{review.riskReview}</p>
            </div>
          )}
          {review.auditResults && (
            <div>
              <h3 className="mb-2 font-semibold">Revisjoner og inspeksjoner</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{review.auditResults}</p>
            </div>
          )}
          {review.trainingStatus && (
            <div>
              <h3 className="mb-2 font-semibold">Opplæring og kompetanse</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{review.trainingStatus}</p>
            </div>
          )}
          {review.resourcesReview && (
            <div>
              <h3 className="mb-2 font-semibold">Ressurser og budsjett</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{review.resourcesReview}</p>
            </div>
          )}
          {review.externalChanges && (
            <div>
              <h3 className="mb-2 font-semibold">Eksterne endringer</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{review.externalChanges}</p>
            </div>
          )}
          {review.wellbeingSummary && (
            <div>
              <h3 className="mb-2 font-semibold">Psykososialt arbeidsmiljø</h3>
              <div className="whitespace-pre-wrap text-sm text-muted-foreground bg-blue-50 p-4 rounded-lg border border-blue-200">
                {review.wellbeingSummary}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {(review.conclusions || review.notes) && (
        <Card>
          <CardHeader>
            <CardTitle>Konklusjoner og oppfølging</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {review.conclusions && (
              <div>
                <h3 className="mb-2 font-semibold">Konklusjoner</h3>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{review.conclusions}</p>
              </div>
            )}
            {review.notes && (
              <div>
                <h3 className="mb-2 font-semibold">Notater</h3>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{review.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
