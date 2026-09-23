"use client";

import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PersonnelReviewRow } from "@/server/queries/personnel.queries";

const STATUS_LABEL: Record<string, string> = {
  PLANLAGT: "Planlagt",
  FORBEREDT: "Forberedt",
  GJENNOMFORT: "Gjennomført",
  SIGNERT: "Signert",
  AVBRUTT: "Avbrutt",
};

export function PersonnelReviewsSection({
  userId,
  reviews,
  canCreate,
  reviewBaseHref = "/dashboard/medarbeidersamtale",
}: {
  userId: string;
  reviews: PersonnelReviewRow[];
  canCreate: boolean;
  reviewBaseHref?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          PUS / medarbeidersamtale
        </CardTitle>
        {canCreate && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/dashboard/medarbeidersamtale/ny?ansatt=${userId}`}>
              <Plus className="mr-2 h-4 w-4" />
              Ny samtale
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Personlig utviklingssamtale etter AML § 4-2. Samtalene ligger i medarbeidersamtale-modulen og vises her i personalmappen.
        </p>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen samtaler registrert.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {reviews.map((review) => (
              <li key={review.id}>
                <Link
                  href={`${reviewBaseHref}/${review.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-muted/50"
                >
                  <span>
                    {format(new Date(review.scheduledDate), "d. MMM yyyy", { locale: nb })}
                    {review.reviewerName ? ` · ${review.reviewerName}` : ""}
                  </span>
                  <span className="text-muted-foreground">
                    {STATUS_LABEL[review.status] ?? review.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
