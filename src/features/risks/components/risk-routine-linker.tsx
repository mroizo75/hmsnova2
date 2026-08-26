"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { linkRoutineToRisk, unlinkRoutineFromRisk } from "@/server/actions/risk-routine-link.actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Link2, Plus, X } from "lucide-react";
import Link from "next/link";

interface RiskRoutineLinkerProps {
  riskId: string;
  linkedRoutines: Array<{
    id: string;
    title: string;
    status: string;
    category: string | null;
  }>;
  availableRoutines: Array<{ id: string; title: string }>;
}

export function RiskRoutineLinker({
  riskId,
  linkedRoutines,
  availableRoutines,
}: RiskRoutineLinkerProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>("");

  const linkedIds = new Set(linkedRoutines.map((r) => r.id));
  const unlinkedRoutines = availableRoutines.filter((r) => !linkedIds.has(r.id));

  const handleLink = async () => {
    if (!selectedRoutineId) return;
    setLoading(true);
    try {
      const result = await linkRoutineToRisk({ riskId, routineId: selectedRoutineId });
      if (result.success) {
        toast({ title: "Rutine koblet", description: "Rutinen er nå koblet til risikoen.", className: "bg-green-50 border-green-200" });
        setSelectedRoutineId("");
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Feil", description: result.error });
      }
    } catch {
      toast({ variant: "destructive", title: "Feil", description: "Kunne ikke koble rutine" });
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async (routineId: string) => {
    setLoading(true);
    try {
      const result = await unlinkRoutineFromRisk({ riskId, routineId });
      if (result.success) {
        toast({ title: "Kobling fjernet", className: "bg-green-50 border-green-200" });
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Feil", description: result.error });
      }
    } catch {
      toast({ variant: "destructive", title: "Feil", description: "Kunne ikke fjerne kobling" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4" />
          Koblede rutiner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {linkedRoutines.length > 0 ? (
          <div className="space-y-2">
            {linkedRoutines.map((routine) => (
              <div
                key={routine.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/rutiner/${routine.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {routine.title}
                  </Link>
                  <Badge variant="outline" className="text-xs">
                    {routine.status === "ACTIVE" ? "Aktiv" : routine.status}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={loading}
                  onClick={() => handleUnlink(routine.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ingen rutiner er koblet til denne risikoen ennå.
          </p>
        )}

        {unlinkedRoutines.length > 0 && (
          <div className="flex gap-2">
            <Select
              value={selectedRoutineId}
              onValueChange={setSelectedRoutineId}
              disabled={loading}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Velg rutine å koble..." />
              </SelectTrigger>
              <SelectContent>
                {unlinkedRoutines.map((routine) => (
                  <SelectItem key={routine.id} value={routine.id}>
                    {routine.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleLink}
              disabled={loading || !selectedRoutineId}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Koble
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
