"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText } from "lucide-react";
import { BoardingList } from "./boarding-list";
import type { BoardingType } from "@prisma/client";

interface BoardingContentProps {
  type: BoardingType;
  boardings: any[];
  canCreate: boolean;
  canManageTemplates: boolean;
}

const COPY: Record<BoardingType, { title: string; description: string; create: string }> = {
  ONBOARDING: {
    title: "Onboarding",
    description: "Innmelding av nyansatte. Arbeidsavtale innen 7 dager, AML § 14-5 og § 14-6.",
    create: "Ny onboarding",
  },
  OFFBOARDING: {
    title: "Offboarding",
    description: "Utmelding. Sluttattest etter AML § 15-15 og avslutning av tilganger.",
    create: "Ny offboarding",
  },
};

export function BoardingContent({ type, boardings, canCreate, canManageTemplates }: BoardingContentProps) {
  const copy = COPY[type];
  const activeCount = boardings.filter((b) => b.status === "IN_PROGRESS" || b.status === "NOT_STARTED").length;
  const completedCount = boardings.filter((b) => b.status === "COMPLETED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{copy.title}</h1>
          <p className="text-muted-foreground mt-1">
            {copy.description} {activeCount} pågår, {completedCount} fullført.
          </p>
        </div>
        <div className="flex gap-2">
          {canManageTemplates && (
            <Link href="/dashboard/onboarding/maler">
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Maler
              </Button>
            </Link>
          )}
          {canCreate && (
            <Link href={`/dashboard/onboarding/ny?type=${type}`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {copy.create}
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aktive</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fullført</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{completedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Totalt</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{boardings.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <BoardingList boardings={boardings} />
        </CardContent>
      </Card>
    </div>
  );
}
