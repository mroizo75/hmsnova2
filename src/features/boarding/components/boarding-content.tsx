"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText } from "lucide-react";
import { BoardingList } from "./boarding-list";

interface BoardingContentProps {
  boardings: any[];
  canCreate: boolean;
  canManageTemplates: boolean;
}

export function BoardingContent({ boardings, canCreate, canManageTemplates }: BoardingContentProps) {
  const [tab, setTab] = useState<string>("all");

  const filtered = tab === "all"
    ? boardings
    : boardings.filter((b) => b.type === tab);

  const activeCount = boardings.filter((b) => b.status === "IN_PROGRESS").length;
  const completedCount = boardings.filter((b) => b.status === "COMPLETED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Onboarding & offboarding</h1>
          <p className="text-muted-foreground mt-1">
            {activeCount} aktive prosesser, {completedCount} fullført
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
            <Link href="/dashboard/onboarding/ny">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ny prosess
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

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">Alle</TabsTrigger>
          <TabsTrigger value="ONBOARDING">Onboarding</TabsTrigger>
          <TabsTrigger value="OFFBOARDING">Offboarding</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              <BoardingList boardings={filtered} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
