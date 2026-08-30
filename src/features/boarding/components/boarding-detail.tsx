"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BoardingProgressBar } from "./boarding-progress-bar";
import { BoardingTaskList } from "./boarding-task-list";
import { cancelBoarding } from "@/server/actions/boarding.actions";
import type { BoardingStatus, BoardingType } from "@prisma/client";

const STATUS_CONFIG: Record<BoardingStatus, { label: string; className: string }> = {
  NOT_STARTED: { label: "Ikke startet", className: "bg-gray-100 text-gray-700" },
  IN_PROGRESS: { label: "Pågår", className: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Fullført", className: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Kansellert", className: "bg-gray-100 text-gray-500" },
};

interface BoardingDetailProps {
  boarding: {
    id: string;
    type: BoardingType;
    status: BoardingStatus;
    startDate: string;
    dueDate: string | null;
    completedAt: string | null;
    notes: string | null;
    employee: { id: string; name: string | null; email: string };
    template: { id: string; name: string } | null;
    tasks: any[];
  };
  canEdit: boolean;
  currentUserId: string;
}

export function BoardingDetail({ boarding, canEdit, currentUserId }: BoardingDetailProps) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);

  const status = STATUS_CONFIG[boarding.status];
  const completed = boarding.tasks.filter((t: any) => t.status === "COMPLETED").length;
  const skipped = boarding.tasks.filter((t: any) => t.status === "SKIPPED").length;
  const canCancel = canEdit && (boarding.status === "IN_PROGRESS" || boarding.status === "NOT_STARTED");

  async function handleCancel() {
    if (!confirm("Er du sikker på at du vil kansellere denne prosessen?")) return;
    setCancelling(true);
    const result = await cancelBoarding(boarding.id);
    setCancelling(false);
    if (result.success) {
      router.push("/dashboard/onboarding");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/onboarding">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Tilbake
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {boarding.type === "ONBOARDING" ? "Onboarding" : "Offboarding"} –{" "}
                {boarding.employee.name ?? boarding.employee.email}
              </CardTitle>
              {boarding.template && (
                <p className="text-sm text-muted-foreground mt-1">
                  Mal: {boarding.template.name}
                </p>
              )}
            </div>
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">
                {boarding.type === "ONBOARDING" ? "Tiltredelsesdato" : "Siste arbeidsdag"}
              </p>
              <p className="text-sm font-medium">
                {format(new Date(boarding.startDate), "d. MMMM yyyy", { locale: nb })}
              </p>
            </div>
            {boarding.dueDate && (
              <div>
                <p className="text-sm text-muted-foreground">Forventet ferdig</p>
                <p className="text-sm font-medium">
                  {format(new Date(boarding.dueDate), "d. MMMM yyyy", { locale: nb })}
                </p>
              </div>
            )}
            {boarding.completedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Fullført</p>
                <p className="text-sm font-medium text-green-600">
                  {format(new Date(boarding.completedAt), "d. MMMM yyyy", { locale: nb })}
                </p>
              </div>
            )}
          </div>

          <BoardingProgressBar
            total={boarding.tasks.length}
            completed={completed}
            skipped={skipped}
          />

          {boarding.notes && (
            <div>
              <p className="text-sm text-muted-foreground">Notater</p>
              <p className="text-sm mt-1">{boarding.notes}</p>
            </div>
          )}

          {canCancel && (
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? "Kansellerer..." : "Kanseller prosess"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Oppgaver</CardTitle>
        </CardHeader>
        <CardContent>
          <BoardingTaskList
            tasks={boarding.tasks}
            canEdit={canEdit}
            currentUserId={currentUserId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
