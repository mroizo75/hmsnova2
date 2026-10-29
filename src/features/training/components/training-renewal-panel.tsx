"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BulkTrainingForm } from "@/features/training/components/bulk-training-form";
import { daysUntil, pickCurrentTrainings } from "@/features/training/lib/current-training";
import type { CourseTemplate } from "@prisma/client";

interface RenewalTraining {
  id: string;
  userId: string;
  courseKey: string;
  title: string;
  validUntil?: Date | string | null;
  completedAt?: Date | string | null;
  createdAt?: Date | string | null;
  user?: { id: string; name: string | null; email: string } | null;
}

interface TrainingRenewalPanelProps {
  tenantId: string;
  trainings: RenewalTraining[];
  users: Array<{ id: string; name: string | null; email: string }>;
  courseTemplates: CourseTemplate[];
  reminderDays: number;
}

interface CourseGroup {
  courseKey: string;
  title: string;
  kind: "expired" | "expiring";
  people: Array<{ userId: string; name: string; days: number }>;
}

function personName(training: RenewalTraining): string {
  return training.user?.name || training.user?.email || "Ukjent ansatt";
}

export function TrainingRenewalPanel({
  tenantId,
  trainings,
  users,
  courseTemplates,
  reminderDays,
}: TrainingRenewalPanelProps) {
  const [renewal, setRenewal] = useState<{ courseKey: string; userIds: string[] } | null>(null);
  const [open, setOpen] = useState(false);

  const groups = useMemo(() => {
    const now = new Date();
    const current = pickCurrentTrainings(trainings);
    const grouped = new Map<string, CourseGroup>();

    for (const training of current) {
      const days = daysUntil(training.validUntil, now);
      if (days === null || days > reminderDays) continue;
      const kind = days <= 0 ? "expired" : "expiring";
      const key = `${kind}::${training.courseKey}`;
      const group = grouped.get(key) ?? {
        courseKey: training.courseKey,
        title: training.title,
        kind,
        people: [],
      };
      group.people.push({
        userId: training.userId,
        name: personName(training),
        days,
      });
      grouped.set(key, group);
    }

    return [...grouped.values()]
      .map((group) => ({
        ...group,
        people: group.people.sort((a, b) => a.days - b.days || a.name.localeCompare(b.name, "nb")),
      }))
      .sort((a, b) => b.people.length - a.people.length || a.title.localeCompare(b.title, "nb"));
  }, [trainings, reminderDays]);

  const expired = groups.filter((group) => group.kind === "expired");
  const expiring = groups.filter((group) => group.kind === "expiring");

  if (groups.length === 0) return null;

  function startRenewal(group: CourseGroup) {
    setRenewal({
      courseKey: group.courseKey,
      userIds: group.people.map((person) => person.userId),
    });
    setOpen(true);
  }

  return (
    <>
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-950">
            <AlertTriangle className="h-5 w-5" />
            Kurs som må fornyes
          </CardTitle>
          <CardDescription className="text-amber-900">
            Delt på kurs, så et helt kull kan fornyes og få diplomene lastet opp samlet.
            Varsler i systemet samles også, i stedet for én e-post per ansatt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RenewalSection
            title="Utløpt"
            groups={expired}
            onRenew={startRenewal}
          />
          <RenewalSection
            title={`Utløper innen ${reminderDays} dager`}
            groups={expiring}
            onRenew={startRenewal}
          />
        </CardContent>
      </Card>

      <BulkTrainingForm
        tenantId={tenantId}
        users={users}
        courseTemplates={courseTemplates}
        open={open}
        onOpenChange={setOpen}
        renewalPreset={renewal}
      />
    </>
  );
}

function RenewalSection({
  title,
  groups,
  onRenew,
}: {
  title: string;
  groups: CourseGroup[];
  onRenew: (group: CourseGroup) => void;
}) {
  if (groups.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-amber-950">{title}</h3>
      {groups.map((group) => {
        const shown = group.people.slice(0, 8);
        const rest = group.people.length - shown.length;
        return (
          <div
            key={`${group.kind}-${group.courseKey}`}
            className="flex flex-col gap-3 rounded-md border border-amber-200 bg-white p-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{group.title}</p>
                <Badge variant={group.kind === "expired" ? "destructive" : "outline"}>
                  {group.people.length} {group.people.length === 1 ? "ansatt" : "ansatte"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {shown.map((person) => person.name).join(", ")}
                {rest > 0 ? ` og ${rest} til` : ""}
              </p>
            </div>
            <Button type="button" size="sm" className="shrink-0" onClick={() => onRenew(group)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Forny og last opp diplom
            </Button>
          </div>
        );
      })}
    </div>
  );
}
