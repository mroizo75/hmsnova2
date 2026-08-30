"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, Clock, Users } from "lucide-react";

interface DepartmentGap {
  department: string;
  avgGapPercent: number;
  userCount: number;
}

interface TeamGapItem {
  userId: string;
  userName: string | null;
  userEmail: string;
  department: string | null;
  gapPercent: number;
  fulfilled: number;
  expired: number;
  missing: number;
  totalRequirements: number;
  criticalMissing: { courseKey: string; courseTitle: string; legalRef: string | null }[];
}

interface GapDashboardData {
  totalUsersWithProfiles: number;
  avgCompliancePercent: number;
  usersWithExpiredTraining: number;
  criticalMissingCount: number;
  departmentGaps: DepartmentGap[];
  teamGaps: TeamGapItem[];
}

interface GapAnalysisDashboardProps {
  data: GapDashboardData;
}

export function GapAnalysisDashboard({ data }: GapAnalysisDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gap-analyse</h1>
        <p className="text-muted-foreground mt-1">
          Oversikt over kompetansegap i organisasjonen (IK-HMS § 5 nr. 5)
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-50 p-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totalUsersWithProfiles}</p>
                <p className="text-xs text-muted-foreground">Ansatte med profil</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`rounded-full p-2 ${data.avgCompliancePercent >= 80 ? "bg-green-50" : data.avgCompliancePercent >= 50 ? "bg-yellow-50" : "bg-red-50"}`}>
                <CheckCircle2 className={`h-5 w-5 ${data.avgCompliancePercent >= 80 ? "text-green-600" : data.avgCompliancePercent >= 50 ? "text-yellow-600" : "text-red-600"}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.avgCompliancePercent}%</p>
                <p className="text-xs text-muted-foreground">Gj.sn. oppfyllelse</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-50 p-2">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.usersWithExpiredTraining}</p>
                <p className="text-xs text-muted-foreground">Utløpte kurs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-50 p-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.criticalMissingCount}</p>
                <p className="text-xs text-muted-foreground">Lovpålagte mangler</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {data.departmentGaps.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Per avdeling</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.departmentGaps.map((dept) => (
                <div key={dept.department} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{dept.department} ({dept.userCount} ansatte)</span>
                    <span className="font-medium">{dept.avgGapPercent}%</span>
                  </div>
                  <Progress value={dept.avgGapPercent} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Per ansatt</CardTitle></CardHeader>
        <CardContent>
          {data.teamGaps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Ingen ansatte har profiler tildelt ennå
            </p>
          ) : (
            <div className="divide-y">
              {data.teamGaps
                .sort((a, b) => a.gapPercent - b.gapPercent)
                .map((user) => (
                  <div key={user.userId} className="flex items-center justify-between py-3">
                    <div className="flex-1">
                      <Link
                        href={`/dashboard/training/gap/${user.userId}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {user.userName ?? user.userEmail}
                      </Link>
                      {user.department && (
                        <span className="text-xs text-muted-foreground ml-2">{user.department}</span>
                      )}
                      {user.criticalMissing.length > 0 && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          {user.criticalMissing.length} lovpålagte mangler
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <Progress value={user.gapPercent} className="h-2 flex-1" />
                      <span className="text-sm font-medium w-10 text-right">{user.gapPercent}%</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
