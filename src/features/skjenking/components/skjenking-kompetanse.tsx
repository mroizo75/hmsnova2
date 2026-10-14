"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AlcoholTrainingStatus, SkjenkeBevillingView } from "./skjenking-types";
import { toDateInput } from "./skjenking-types";

interface Props {
  bevilling: SkjenkeBevillingView | null;
  alcoholTraining: AlcoholTrainingStatus;
}

export function SkjenkingKompetanse({ bevilling, alcoholTraining }: Props) {
  const done = alcoholTraining.users.filter((user) => user.completed).length;
  return (
    <div className="max-w-3xl space-y-4">
      <div className="space-y-2 rounded-lg border p-4 text-sm">
        <p>
          Styrer og stedfortreder skal ha bestått kunnskapsprøve, jf. alkoholforskriften § 5-1. Datoen føres under Bevilling.
        </p>
        <p>Styrer: {bevilling?.styrer || "ikke ført"} · prøve {toDateInput(bevilling?.styrerProveDato) || "mangler"}</p>
        <p>Stedfortreder: {bevilling?.stedfortreder || "ikke ført"} · prøve {toDateInput(bevilling?.stedfortrederProveDato) || "mangler"}</p>
      </div>
      <div className="space-y-3 rounded-lg border p-4">
        <p className="text-sm">
          Ansatte som selger eller skjenker skal ha nødvendig kunnskap, jf. alkoholloven § 1-7c og alkoholforskriften § 8-3 nr. 2.
        </p>
        <p className="font-medium">{alcoholTraining.title}</p>
        <p className="text-sm text-muted-foreground">{done} av {alcoholTraining.users.length} ansatte har gyldig kurs.</p>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Ansatt</th>
                <th className="p-3">Status</th>
                <th className="p-3">Gyldig til</th>
              </tr>
            </thead>
            <tbody>
              {alcoholTraining.users.length === 0 && (
                <tr><td colSpan={3} className="p-6 text-muted-foreground">Ingen ansatte funnet.</td></tr>
              )}
              {alcoholTraining.users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="p-3">{user.name}</td>
                  <td className="p-3">
                    <Badge variant={user.completed ? "secondary" : "destructive"}>{user.completed ? "Fullført" : "Mangler"}</Badge>
                  </td>
                  <td className="p-3">{user.validUntil ? new Date(user.validUntil).toLocaleDateString("nb-NO") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button asChild>
          <Link href="/dashboard/training?tema=skjenking">
            <GraduationCap className="mr-2 h-4 w-4" />
            Registrer skjenkekurs
          </Link>
        </Button>
      </div>
    </div>
  );
}
