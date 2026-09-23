"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock } from "lucide-react";

type FieldJobsData = {
  jobs: Array<{
    id: string;
    name: string;
    clientName: string | null;
    location: string | null;
    jobKind: string;
    status: string;
    billingStatus: string;
    _count?: { timeEntries: number; usageLines: number };
  }>;
  assignedJobs?: Array<{
    id: string;
    name: string;
    clientName: string | null;
    location: string | null;
    jobKind: string;
    status: string;
    billingStatus: string;
    startDate: string;
    endDate: string;
    plannedHours: number | null;
  }>;
  weekEntries: Array<{ id: string; hours: number; timeType: string; date: string; project: { name: string } }>;
  canCreateFieldProject?: boolean;
};

function JobCard({
  job,
  assigned,
}: {
  job: {
    id: string;
    name: string;
    clientName: string | null;
    location: string | null;
    jobKind: string;
    plannedHours?: number | null;
    startDate?: string;
    endDate?: string;
  };
  assigned?: boolean;
}) {
  return (
    <Link href={`/ansatt/timeregistrering?projectId=${job.id}`}>
      <Card className={`mb-2 border-l-4 ${assigned ? "border-l-sky-500" : "border-l-emerald-500"}`}>
        <CardContent className="flex items-start justify-between gap-3 py-4">
          <div className="min-w-0">
            <p className="font-medium leading-tight">{job.name}</p>
            <p className="text-sm text-muted-foreground truncate">
              {job.clientName}
              {job.location ? ` · ${job.location}` : ""}
            </p>
            {assigned && job.startDate && job.endDate ? (
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(`${job.startDate.slice(0, 10)}T12:00:00`).toLocaleDateString("nb-NO")}
                {" – "}
                {new Date(`${job.endDate.slice(0, 10)}T12:00:00`).toLocaleDateString("nb-NO")}
                {job.plannedHours != null ? ` · ${job.plannedHours} t planlagt` : ""}
              </p>
            ) : null}
          </div>
          <Badge variant="outline" className="bg-transparent shrink-0">
            {assigned ? "Tildelt" : job.jobKind === "HMS" ? "HMS" : "Småjobb"}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  );
}

export function FieldJobsContent({ initialData }: { initialData: FieldJobsData }) {
  const [tab, setTab] = useState<"jobs" | "week">("jobs");
  const weekHours = initialData.weekEntries.reduce((s, e) => s + e.hours, 0);
  const canCreate = initialData.canCreateFieldProject !== false;
  const assignedJobs = initialData.assignedJobs ?? [];
  const assignedIds = new Set(assignedJobs.map((j) => j.id));
  const otherJobs = initialData.jobs.filter((j) => !assignedIds.has(j.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Jobber</h1>
        {canCreate ? (
          <Button asChild>
            <Link href="/ansatt/jobber/ny">
              <Plus className="mr-1 h-4 w-4" />
              Ny jobb
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Button
          variant={tab === "jobs" ? "default" : "outline"}
          className={tab === "jobs" ? "" : "bg-transparent"}
          onClick={() => setTab("jobs")}
        >
          Aktive
        </Button>
        <Button
          variant={tab === "week" ? "default" : "outline"}
          className={tab === "week" ? "" : "bg-transparent"}
          asChild
        >
          <Link href="/ansatt/timeregistrering">{`Min uke (${weekHours} t)`}</Link>
        </Button>
      </div>

      {tab === "jobs" && (
        <div className="space-y-3">
          {assignedJobs.length === 0 && otherJobs.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                {canCreate
                  ? "Ingen aktive jobber. Opprett en når du er ute hos kunden."
                  : "Ingen jobber tildelt deg denne uken. Be leder om å sette deg på et prosjekt i ressursplanen."}
              </CardContent>
            </Card>
          ) : (
            <>
              {assignedJobs.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Tildelt deg</p>
                  {assignedJobs.map((job) => (
                    <JobCard key={`assigned-${job.id}`} job={job} assigned />
                  ))}
                </div>
              ) : null}
              {otherJobs.length > 0 ? (
                <div className="space-y-2">
                  {assignedJobs.length > 0 ? (
                    <p className="text-sm font-medium">Øvrige jobber</p>
                  ) : null}
                  {otherJobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      )}

      {tab === "week" && (
        <Card>
          <CardContent className="space-y-2 py-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              {weekHours} timer denne uken
            </p>
            {initialData.weekEntries.map((e) => (
              <div key={e.id} className="flex justify-between text-sm text-muted-foreground">
                <span className="truncate">{e.project.name}</span>
                <span>
                  {e.hours} t · {e.timeType === "NORMAL" ? "ordinær" : e.timeType.replace("_", " ")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
