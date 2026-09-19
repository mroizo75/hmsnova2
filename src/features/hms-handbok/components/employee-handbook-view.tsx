"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, BookOpen, Phone, Search, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { HandbokSignButton } from "./handbok-sign-button";
import { HandbokSectionExpanded } from "./handbok-section-expanded";
import {
  EMPLOYEE_HANDBOOK_ACTIONS,
  EMPLOYEE_HIDDEN_SECTION_KEYS,
  employeeHandbookModuleLink,
  groupEmployeeHandbookSections,
  handbookSectionMatchesQuery,
} from "@/lib/employee-handbook";
import type { HandbookData } from "@/server/actions/hms-handbok.actions";

interface EmployeeHandbookViewProps {
  tenantName: string;
  hmsContactName?: string | null;
  hmsContactPhone?: string | null;
  handbook: HandbookData;
  currentUserId: string;
}

export function EmployeeHandbookView({
  tenantName,
  hmsContactName,
  hmsContactPhone,
  handbook,
  currentUserId,
}: EmployeeHandbookViewProps) {
  const [query, setQuery] = useState("");
  const currentVersion = handbook.currentVersion;
  const alreadySigned = handbook.signatures.some((s) => s.userId === currentUserId);
  const isDraft = currentVersion?.status !== "APPROVED";

  const visibleSections = useMemo(() => {
    const sections = (currentVersion?.sections ?? [])
      .filter((section) => !EMPLOYEE_HIDDEN_SECTION_KEYS.has(section.sectionKey))
      .filter((section) => section.isEnabled !== false)
      .map((section) => ({
      ...section,
      moduleLink: employeeHandbookModuleLink(section.sectionKey),
    }));
    return sections.filter((section) => handbookSectionMatchesQuery(section, query));
  }, [currentVersion?.sections, query]);

  const groups = useMemo(
    () => groupEmployeeHandbookSections(visibleSections),
    [visibleSections]
  );

  return (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                  Dette må du vite
                  {isDraft ? (
                    <Badge variant="outline" className="bg-transparent font-normal">
                      Utkast v{currentVersion?.version}
                    </Badge>
                  ) : (
                    <Badge className="border border-green-300 bg-green-50 text-green-800 font-normal">
                      Gjeldende v{currentVersion?.version}
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Enkel oversikt for ansatte i {tenantName}. Alle skal lese og bekrefte — også mens
                  håndboken er utkast.
                </p>
              </div>
            </div>
            <HandbokSignButton
              tenantId={handbook.tenantId}
              alreadySigned={alreadySigned}
              versionId={currentVersion?.id}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Søk: avvik, ferie, brann, verneombud…"
              className="h-11 pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {EMPLOYEE_HANDBOOK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-lg border bg-transparent p-3 text-left hover:bg-muted"
              >
                <p className="text-sm font-medium">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.hint}</p>
              </Link>
            ))}
          </div>
          {(hmsContactName || hmsContactPhone) && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">HMS-kontakt:</span>
              <span>{hmsContactName}</span>
              {hmsContactPhone && (
                <a href={`tel:${hmsContactPhone}`} className="font-semibold text-primary">
                  {hmsContactPhone}
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isDraft && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <p className="text-sm text-amber-900">
            Dette er gjeldende utkast. Dashboard ber alle om lesebekreftelse på samme innhold.
            Bekreftelsen dokumenterer at du er kjent med rutinene (IK-HMS § 5).
          </p>
        </div>
      )}

      {groups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Ingen treff. Prøv et annet søkeord, eller kontakt HMS-ansvarlig.
          </CardContent>
        </Card>
      ) : (
        groups.map((group) => (
          <div key={group.id} className="space-y-3">
            <div>
              <h2 className="text-base font-semibold">{group.title}</h2>
              <p className="text-sm text-muted-foreground">{group.description}</p>
            </div>
            {group.sections.map((section) => (
              <HandbokSectionExpanded
                key={section.id}
                section={section}
                versionStatus={currentVersion?.status ?? "APPROVED"}
                canEdit={false}
              />
            ))}
          </div>
        ))
      )}

      <Card>
        <CardContent className="flex items-start gap-3 py-4 text-sm text-muted-foreground">
          {alreadySigned ? (
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          )}
          <p>
            {alreadySigned
              ? "Du har bekreftet at du har lest gjeldende versjon."
              : "Les kapitlene over og bekreft øverst. Alle ansatte skal kjenne rutinene (IK-HMS § 5, AML § 2-3)."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
