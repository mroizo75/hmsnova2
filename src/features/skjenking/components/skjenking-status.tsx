"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { evaluateSkjenkingInternkontroll } from "@/features/skjenking/lib/internkontroll";
import type {
  AlcoholTrainingStatus,
  SkjenkeBevillingView,
  SkjenkeGjennomgangView,
  SkjenkeHendelseView,
  SkjenkeRutineView,
} from "./skjenking-types";

interface Props {
  bevilling: SkjenkeBevillingView | null;
  hendelser: SkjenkeHendelseView[];
  rutiner: SkjenkeRutineView[];
  gjennomganger: SkjenkeGjennomgangView[];
  alcoholTraining: AlcoholTrainingStatus;
  onOpen: (tab: string) => void;
}

const TAB_FOR_SECTION: Record<number, string> = {
  1: "bevilling",
  2: "kompetanse",
  3: "bevilling",
  4: "rutiner",
  5: "hendelser",
  6: "gjennomgang",
};

export function SkjenkingStatus({
  bevilling,
  hendelser,
  rutiner,
  gjennomganger,
  alcoholTraining,
  onOpen,
}: Props) {
  const coverage = evaluateSkjenkingInternkontroll({
    bevilling,
    rutiner,
    apneHendelser: hendelser.filter((item) => item.status === "APEN").length,
    gjennomganger,
    opplaering: {
      total: alcoholTraining.users.length,
      fullfort: alcoholTraining.users.filter((user) => user.completed).length,
    },
  });

  if (coverage.exempt) {
    return (
      <div className="rounded-lg border p-4 text-sm">
        Ambulerende skjenkebevilling er unntatt fra internkontrollplikten, jf. alkoholforskriften § 8-1 andre ledd.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant={coverage.complete ? "secondary" : "destructive"}>
          {coverage.complete ? "Internkontrollen er dokumentert" : "Internkontrollen er ufullstendig"}
        </Badge>
        <span className="text-sm text-muted-foreground">Alkoholforskriften § 8-3 nr. 1–6</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {coverage.sections.map((section) => {
          const missing = section.checks.filter((item) => !item.ok);
          return (
            <div key={section.nr} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {section.nr}. {section.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{section.legalRef}</p>
                </div>
                <Badge variant={section.ok ? "secondary" : "destructive"}>{section.ok ? "Dekket" : "Mangler"}</Badge>
              </div>
              {missing.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {missing.slice(0, 4).map((item) => (
                    <li key={item.id}>{item.detail}</li>
                  ))}
                </ul>
              )}
              {!section.ok && (
                <Button className="mt-3" variant="outline" size="sm" onClick={() => onOpen(TAB_FOR_SECTION[section.nr])}>
                  Rett opp
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
