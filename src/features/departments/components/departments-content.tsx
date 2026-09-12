"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDepartment, updateDepartment } from "@/server/actions/department.actions";
import type { DepartmentRow } from "@/server/queries/department.queries";
import type { DepartmentReport } from "@/server/queries/department-reports.queries";
import { PowerOfficeImportPanel } from "./poweroffice-import-panel";

interface DepartmentsContentProps {
  departments: DepartmentRow[];
  reports: DepartmentReport[];
  canManage: boolean;
  canImport: boolean;
  hidePersonnelDetails: boolean;
}

export function DepartmentsContent({
  departments,
  reports,
  canManage,
  canImport,
  hidePersonnelDetails,
}: DepartmentsContentProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setSaving(true);
    setError(null);
    try {
      const result = await createDepartment({ name, code });
      if (result.success === false) {
        setError(result.error);
        return;
      }
      setName("");
      setCode("");
      window.location.reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Building2 className="h-6 w-6 text-primary" />
          Avdelinger
        </h1>
        <p className="mt-1 text-muted-foreground">
          Organisasjonsenheter for personal, avvik og rapporter. LEDER ser kun egen avdeling.
        </p>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Ny avdeling</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Navn</Label>
              <Input id="dept-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-code">Kode</Label>
              <Input id="dept-code" value={code} onChange={(event) => setCode(event.target.value)} />
            </div>
            <Button type="button" onClick={handleCreate} disabled={saving || name.trim().length < 2}>
              Opprett
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      {canImport && <PowerOfficeImportPanel />}

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <CardTitle>{report.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                Ansatte: <strong>{report.employeeCount}</strong>
              </p>
              {!hidePersonnelDetails && (
                <ul className="text-muted-foreground">
                  {report.positions.map((row) => (
                    <li key={row.position}>
                      {row.position}: {row.count}
                    </li>
                  ))}
                </ul>
              )}
              <p>
                Avvik åpne/lukkede: {report.incidentsOpen}/{report.incidentsClosed}
              </p>
              {!hidePersonnelDetails && (
                <>
                  <p>
                    Fravær: {report.absenceCount} saker ({report.absenceDays} dager)
                  </p>
                  <p>
                    Kompetanse utløpt/mangler: {report.competenceExpired}/{report.competenceMissingRequired}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Alle avdelinger</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {departments.map((department) => (
              <div key={department.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <p className="font-medium">{department.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {department.code ?? "Uten kode"} · {department.memberCount} ansatte
                    {department.isActive ? "" : " · inaktiv"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await updateDepartment({
                      id: department.id,
                      name: department.name,
                      code: department.code,
                      isActive: !department.isActive,
                    });
                    window.location.reload();
                  }}
                >
                  {department.isActive ? "Deaktiver" : "Aktiver"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
