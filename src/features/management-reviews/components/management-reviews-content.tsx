"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Plus, Calendar, CheckCircle, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchManagementReviews } from "@/server/queries/management-review.queries";

type ReviewsData = Awaited<ReturnType<typeof fetchManagementReviews>>;

interface ManagementReviewsContentProps {
  initialData: ReviewsData;
  canCreateManagementReviews: boolean;
}

export function ManagementReviewsContent({ initialData, canCreateManagementReviews }: ManagementReviewsContentProps) {
  const { data: reviews } = useQuery({
    queryKey: ["management-reviews"],
    queryFn: () => fetchManagementReviews(),
    initialData,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; color: string }> = {
      PLANNED: { label: "Planlagt", color: "bg-blue-100 text-blue-900" },
      IN_PROGRESS: { label: "Pågår", color: "bg-yellow-100 text-yellow-900" },
      COMPLETED: { label: "Fullført", color: "bg-green-100 text-green-900" },
      APPROVED: { label: "Godkjent", color: "bg-green-600 text-white" },
    };
    return variants[status] || variants.PLANNED;
  };

  const stats = {
    total: reviews.length,
    planned: reviews.filter((r: any) => r.status === "PLANNED").length,
    inProgress: reviews.filter((r: any) => r.status === "IN_PROGRESS").length,
    completed: reviews.filter((r: any) => r.status === "COMPLETED" || r.status === "APPROVED").length,
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Totalt</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Planlagt</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{stats.planned}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pågår</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats.inProgress}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Fullført</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle gjennomganger</CardTitle>
          <CardDescription>Oversikt over gjennomførte og planlagte ledelsesgjennomganger</CardDescription>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Ingen gjennomganger registrert ennå</p>
              {canCreateManagementReviews && (
                <Link href="/dashboard/management-reviews/new">
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Opprett første gjennomgang
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tittel</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead>Dato</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Godkjent</TableHead>
                      <TableHead className="text-right">Handlinger</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.map((review: any) => {
                      const statusInfo = getStatusBadge(review.status);
                      return (
                        <TableRow key={review.id}>
                          <TableCell className="font-medium">{review.title}</TableCell>
                          <TableCell>{review.period}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {format(new Date(review.reviewDate), "d. MMM yyyy", { locale: nb })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                          </TableCell>
                          <TableCell>
                            {review.approvedAt ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-sm">
                                  {format(new Date(review.approvedAt), "d. MMM yyyy", { locale: nb })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/dashboard/management-reviews/${review.id}`}>
                              <Button variant="ghost" size="sm">Se detaljer</Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="md:hidden space-y-3">
                {reviews.map((review: any) => {
                  const statusInfo = getStatusBadge(review.status);
                  return (
                    <Card key={review.id}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium line-clamp-1">{review.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1">{review.period}</p>
                            </div>
                            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(review.reviewDate), "d. MMM yyyy", { locale: nb })}
                            </div>
                            {review.approvedAt && (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-3 w-3" />
                                Godkjent
                              </div>
                            )}
                          </div>
                          <Link href={`/dashboard/management-reviews/${review.id}`}>
                            <Button variant="outline" size="sm" className="w-full">Se detaljer</Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
