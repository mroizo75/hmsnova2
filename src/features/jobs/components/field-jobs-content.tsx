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
    _count: { timeEntries: number; usageLines: number };
  }>;
  weekEntries: Array<{ id: string; hours: number; timeType: string; date: string; project: { name: string } }>;
};

export function FieldJobsContent({ initialData }: { initialData: FieldJobsData }) {
  const [tab, setTab] = useState<"jobs" | "week">("jobs");
  const weekHours = initialData.weekEntries.reduce((s, e) => s + e.hours, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Jobber</h1>
        <Button asChild>
          <Link href="/ansatt/jobber/ny">
            <Plus className="mr-1 h-4 w-4" />
            Ny jobb
          </Link>
        </Button>
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
          {initialData.jobs.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Ingen aktive jobber. Opprett en når du er ute hos kunden.
              </CardContent>
            </Card>
          ) : (
            initialData.jobs.map((job) => (
              <Link key={job.id} href={`/ansatt/timeregistrering?projectId=${job.id}`}>
                <Card className="mb-2 border-l-4 border-l-emerald-500">
                  <CardContent className="flex items-start justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <p className="font-medium leading-tight">{job.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {job.clientName}
                        {job.location ? ` · ${job.location}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-transparent shrink-0">
                      {job.jobKind === "HMS" ? "HMS" : "Småjobb"}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))
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
