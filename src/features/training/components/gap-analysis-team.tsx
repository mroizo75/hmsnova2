"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { UserGapResult } from "@/server/queries/competence.queries";

interface GapAnalysisTeamProps {
  gaps: UserGapResult[];
}

export function GapAnalysisTeam({ gaps }: GapAnalysisTeamProps) {
  const byDepartment = new Map<string, UserGapResult[]>();
  for (const g of gaps) {
    const dept = g.department ?? "Uten avdeling";
    const list = byDepartment.get(dept) ?? [];
    list.push(g);
    byDepartment.set(dept, list);
  }

  const departments = [...byDepartment.entries()].sort(([a], [b]) => a.localeCompare(b, "nb"));

  return (
    <div className="space-y-6">
      {departments.map(([dept, users]) => {
        const avgGap = Math.round(users.reduce((s, u) => s + u.gapPercent, 0) / users.length);
        return (
          <Card key={dept}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{dept}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{users.length} ansatte</span>
                  <Badge variant={avgGap >= 80 ? "default" : avgGap >= 50 ? "secondary" : "destructive"}>
                    {avgGap}% oppfylt
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {users
                  .sort((a, b) => a.gapPercent - b.gapPercent)
                  .map((user) => (
                    <div key={user.userId} className="flex items-center justify-between py-2">
                      <Link
                        href={`/dashboard/training/gap/${user.userId}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {user.userName ?? user.userEmail}
                      </Link>
                      <div className="flex items-center gap-3 min-w-[180px]">
                        <Progress value={user.gapPercent} className="h-2 flex-1" />
                        <span className="text-sm font-medium w-10 text-right">{user.gapPercent}%</span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
