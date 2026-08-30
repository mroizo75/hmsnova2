"use client";

import { format, isPast, isToday } from "date-fns";
import { nb } from "date-fns/locale";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  SkipForward,
  FileText,
  Users,
  Activity,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FollowUpMilestone, FollowUpStatus } from "@prisma/client";

interface FollowUpItem {
  id: string;
  absenceId: string;
  milestone: FollowUpMilestone;
  status: FollowUpStatus;
  dueDate: string;
  completedAt: string | null;
  completedBy: { id: string; name: string | null } | null;
  skippedReason: string | null;
  notes: string | null;
}

const milestoneConfig: Record<
  FollowUpMilestone,
  { label: string; description: string; icon: typeof FileText; legalRef: string }
> = {
  FOLLOW_UP_PLAN: {
    label: "Oppfølgingsplan",
    description: "Utarbeide oppfølgingsplan med tilrettelegging",
    icon: FileText,
    legalRef: "AML § 4-6 (3)",
  },
  DIALOG_MEETING_1: {
    label: "Dialogmøte 1",
    description: "Innkalle til dialogmøte med arbeidstaker",
    icon: Users,
    legalRef: "AML § 4-6 (4)",
  },
  ACTIVITY_REQUIREMENT: {
    label: "Aktivitetskrav",
    description: "NAV vurderer aktivitetsplikt",
    icon: Activity,
    legalRef: "Ftrl. § 8-4",
  },
  DIALOG_MEETING_2: {
    label: "Dialogmøte 2",
    description: "NAV innkaller til dialogmøte 2",
    icon: Users,
    legalRef: "Ftrl. § 8-7a",
  },
  DIALOG_MEETING_3: {
    label: "Dialogmøte 3",
    description: "Dialogmøte 3 ved behov",
    icon: Users,
    legalRef: "Ftrl. § 8-7a",
  },
  MAX_DATE: {
    label: "Maksdato sykepenger",
    description: "52 uker – sykepenger utløper",
    icon: Calendar,
    legalRef: "Ftrl. § 8-12",
  },
};

function getStatusConfig(status: FollowUpStatus, dueDate: string) {
  const due = new Date(dueDate);
  const overdue = isPast(due) && !isToday(due) && status !== "COMPLETED" && status !== "SKIPPED";

  if (status === "COMPLETED") {
    return { color: "text-green-600", bg: "bg-green-50 border-green-200", icon: CheckCircle2, badgeClass: "bg-green-100 text-green-800", badgeLabel: "Fullført" };
  }
  if (status === "SKIPPED") {
    return { color: "text-gray-500", bg: "bg-gray-50 border-gray-200", icon: SkipForward, badgeClass: "bg-gray-100 text-gray-600", badgeLabel: "Hoppet over" };
  }
  if (overdue) {
    return { color: "text-red-600", bg: "bg-red-50 border-red-200", icon: AlertTriangle, badgeClass: "bg-red-100 text-red-800", badgeLabel: "Forfalt" };
  }
  return { color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200", icon: Clock, badgeClass: "bg-yellow-100 text-yellow-800", badgeLabel: "Venter" };
}

interface FollowUpTimelineProps {
  followUps: FollowUpItem[];
  absenceId: string;
  canEdit: boolean;
}

export function FollowUpTimeline({ followUps, absenceId, canEdit }: FollowUpTimelineProps) {
  if (followUps.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sykefraværsoppfølging</CardTitle>
        <p className="text-sm text-muted-foreground">
          Lovpålagte milepæler iht. AML § 4-6 og ftrl. § 8-7a
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertikal linje */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-6">
            {followUps.map((fu, index) => {
              const config = milestoneConfig[fu.milestone];
              const statusCfg = getStatusConfig(fu.status, fu.dueDate);
              const StatusIcon = statusCfg.icon;
              const MilestoneIcon = config.icon;

              return (
                <div key={fu.id} className="relative pl-12">
                  {/* Tidslinje-ikon */}
                  <div className={`absolute left-2.5 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-background ${statusCfg.color}`}>
                    <StatusIcon className="h-3 w-3" />
                  </div>

                  <div className={`rounded-lg border p-4 ${statusCfg.bg}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <MilestoneIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-sm">{config.label}</span>
                          <Badge variant="outline" className={statusCfg.badgeClass}>
                            {statusCfg.badgeLabel}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>
                            Frist: {format(new Date(fu.dueDate), "d. MMMM yyyy", { locale: nb })}
                          </span>
                          <span className="text-muted-foreground/50">({config.legalRef})</span>
                        </div>
                        {fu.completedAt && fu.completedBy && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {fu.status === "SKIPPED" ? "Hoppet over" : "Fullført"} av{" "}
                            {fu.completedBy.name}{" "}
                            {format(new Date(fu.completedAt), "d. MMM yyyy", { locale: nb })}
                          </p>
                        )}
                        {fu.skippedReason && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            Begrunnelse: {fu.skippedReason}
                          </p>
                        )}
                      </div>

                      {canEdit && fu.status !== "COMPLETED" && fu.status !== "SKIPPED" && (
                        <Link href={`/dashboard/fravaer/${absenceId}/oppfolging/${fu.id}`}>
                          <Button variant="outline" size="sm">
                            Fullfør
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
