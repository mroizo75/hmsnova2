"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import {
  Calendar,
  ChevronRight,
  MessageSquare,
  Target,
  User,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmployeeReviewStatusBadge } from "./employee-review-status-badge";
import type { EmployeeReviewStatus } from "@prisma/client";

type ReviewListItem = {
  id: string;
  status: EmployeeReviewStatus;
  scheduledDate: Date;
  completedDate: Date | null;
  konfidensielt: boolean;
  employee: { id: string; name: string | null; email: string; image: string | null };
  reviewer: { id: string; name: string | null; email: string; image: string | null };
  _count: { goals: number; actions: number };
};

interface EmployeeReviewListProps {
  reviews: ReviewListItem[];
  canCreate: boolean;
}

const STATUS_LABELS: Record<EmployeeReviewStatus | "ALL", string> = {
  ALL: "Alle statuser",
  PLANLAGT: "Planlagt",
  FORBEREDT: "Forberedt",
  GJENNOMFORT: "Gjennomført",
  SIGNERT: "Signert",
  AVBRUTT: "Avbrutt",
};

function getInitials(name: string | null, email: string) {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  return email[0].toUpperCase();
}

export function EmployeeReviewList({ reviews, canCreate }: EmployeeReviewListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmployeeReviewStatus | "ALL">("ALL");

  const filtered = reviews.filter((r) => {
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.employee.name?.toLowerCase().includes(q) ||
      r.employee.email.toLowerCase().includes(q) ||
      r.reviewer.name?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-4">
      {/* Filtrering */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 max-w-lg">
          <Input
            placeholder="Søk på ansatt eller leder..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as EmployeeReviewStatus | "ALL")}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_LABELS) as (EmployeeReviewStatus | "ALL")[]).map(
                (key) => (
                  <SelectItem key={key} value={key}>
                    {STATUS_LABELS[key]}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/dashboard/medarbeidersamtale/ny">
              <Plus className="h-4 w-4 mr-2" />
              Ny samtale
            </Link>
          </Button>
        )}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {reviews.length === 0
              ? "Ingen medarbeidersamtaler registrert ennå."
              : "Ingen samtaler matcher søket."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((review) => (
            <Link
              key={review.id}
              href={`/dashboard/medarbeidersamtale/${review.id}`}
              className="block"
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Ansatt avatar */}
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(review.employee.name, review.employee.email)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Innhold */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium truncate">
                          {review.employee.name ?? review.employee.email}
                        </span>
                        <EmployeeReviewStatusBadge status={review.status} />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(review.scheduledDate), "d. MMMM yyyy", {
                            locale: nb,
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          Leder: {review.reviewer.name ?? review.reviewer.email}
                        </span>
                        {review._count.goals > 0 && (
                          <span className="flex items-center gap-1">
                            <Target className="h-3.5 w-3.5" />
                            {review._count.goals} mål
                          </span>
                        )}
                        {review._count.actions > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {review._count.actions} tiltak
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
