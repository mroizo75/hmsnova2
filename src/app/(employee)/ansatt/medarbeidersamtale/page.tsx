import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Calendar, ChevronRight, MessageSquare, PenLine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { EmployeeReviewStatus } from "@prisma/client";

const STATUS_CONFIG: Record<
  EmployeeReviewStatus,
  { label: string; className: string }
> = {
  PLANLAGT: { label: "Planlagt", className: "bg-muted text-muted-foreground" },
  FORBEREDT: { label: "Forberedt", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  GJENNOMFORT: { label: "Gjennomført", className: "bg-blue-100 text-blue-800 border-blue-200" },
  SIGNERT: { label: "Signert", className: "bg-green-100 text-green-800 border-green-200" },
  AVBRUTT: { label: "Avbrutt", className: "bg-red-100 text-red-800 border-red-200" },
};

export default async function AnsattMedarbeidersamtalePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || !session.user.id) redirect("/login");

  const reviews = await prisma.employeeReview.findMany({
    where: {
      tenantId: session.user.tenantId,
      employeeId: session.user.id,
    },
    include: {
      reviewer: { select: { name: true, email: true } },
    },
    orderBy: { scheduledDate: "desc" },
  });

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Mine medarbeidersamtaler
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dine samtaler med leder — logg, forberedelse og avtaler
        </p>
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            Ingen medarbeidersamtaler registrert ennå.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {reviews.map((review) => {
            const cfg = STATUS_CONFIG[review.status];
            const needsAction =
              review.status === "PLANLAGT" ||
              (review.status === "GJENNOMFORT" && !review.signertAvAnsatt);
            return (
              <Link
                key={review.id}
                href={`/ansatt/medarbeidersamtale/${review.id}`}
                className="block"
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm">
                            Samtale med {review.reviewer.name ?? review.reviewer.email}
                          </span>
                          <Badge className={`text-xs border ${cfg.className}`}>
                            {cfg.label}
                          </Badge>
                          {needsAction && (
                            <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200 border flex items-center gap-1">
                              <PenLine className="h-3 w-3" />
                              Handling kreves
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(review.scheduledDate), "d. MMMM yyyy", { locale: nb })}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
