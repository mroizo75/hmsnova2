"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type ComplianceData = {
  tenant?: {
    name: string;
    orgNumber: string | null;
  } | null;
  shaPlan: any | null;
  preNotification: any | null;
  rosterEntries: any[];
  rosterChecks: any[];
  availableEmployees?: Array<{
    userId: string;
    name: string;
    email: string;
    employeeNumber: string | null;
    phone: string | null;
  }>;
  isDailyCheckMissing?: boolean;
  latestCheckDate?: string | null;
  preNotificationRequirement?: {
    isRequired: boolean;
    reasons: string[];
    estimatedWorkerDays: number | null;
    workDays: number | null;
    submissionDeadline: string | null;
    isDeadlineSoon: boolean;
    isDeadlinePassed: boolean;
  };
  complianceValidation?: {
    shaReadyForActive: boolean;
    shaMissingFieldsForActive: string[];
    preNotificationReadyForSubmission: boolean;
    preNotificationMissingFieldsForSubmission: string[];
  };
  changeLogs?: Array<{
    id: string;
    action: string;
    createdAt: string;
    changedBy: string;
    changedByEmail: string | null;
    metadata: {
      changedFields?: Array<{ field: string; from: string | null; to: string | null }>;
    } | null;
  }>;
};

interface ConstructionComplianceClientProps {
  projectId: string;
  canManage: boolean;
}

const changeFieldLabels: Record<string, string> = {
  status: "Status",
  builderName: "Byggherre",
  builderRepresentativeName: "Byggherres representant",
  builderRepresentativeContact: "Kontakt representant",
  coordinatorPlanningName: "Koordinator prosjektering (KP)",
  coordinatorExecutionName: "Koordinator utførelse (KU)",
  organizationChart: "Organisasjonskart / rollefordeling",
  progressPlan: "Fremdriftsplan",
  specificMeasures: "Spesifikke SHA-tiltak",
  changeProcedure: "Rutine for endring",
  conflictAssessmentDocumented: "Rollekonflikt dokumentert",
  availableOnSite: "Tilgjengelig på byggeplass",
  sentAt: "Sendt dato",
  submissionDate: "Innsendingsdato",
  projectAddress: "Adresse byggeplass",
  projectType: "Prosjektets art",
  builderOrgNumber: "Byggherre org.nr",
  builderAddress: "Byggherre adresse",
  builderPhone: "Byggherre telefon",
  builderRepresentativePhone: "Representant telefon",
  coordinators: "Koordinatorer",
  designers: "Prosjekterende virksomheter",
  contractors: "Utførende virksomheter",
  expectedStartDate: "Startdato",
  expectedEndDate: "Sluttdato",
  maxWorkersSimultaneous: "Maks arbeidstakere samtidig",
  plannedBusinessesCount: "Planlagt antall virksomheter",
  visibleAtSite: "Synlig på byggeplass",
};

function formatChangeValue(value: string | null): string {
  if (!value || value.trim().length === 0) return "—";
  if (value === "true") return "Ja";
  if (value === "false") return "Nei";
  return value;
}

export function ConstructionComplianceClient({ projectId, canManage }: ConstructionComplianceClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ComplianceData>({
    shaPlan: null,
    preNotification: null,
    rosterEntries: [],
    rosterChecks: [],
  });

  const [shaPlan, setShaPlan] = useState({
    status: "DRAFT",
    builderName: "",
    builderRepresentativeName: "",
    builderRepresentativeContact: "",
    coordinatorPlanningName: "",
    coordinatorExecutionName: "",
    organizationChart: "",
    progressPlan: "",
    specificMeasures: "",
    changeProcedure: "",
    conflictAssessmentDocumented: false,
    availableOnSite: false,
  });

  const [preNotification, setPreNotification] = useState({
    status: "DRAFT",
    projectAddress: "",
    projectType: "Bygge- og anleggsarbeid",
    builderName: "",
    builderOrgNumber: "",
    builderAddress: "",
    builderPhone: "",
    builderRepresentativeName: "",
    builderRepresentativePhone: "",
    expectedStartDate: "",
    expectedEndDate: "",
    maxWorkersSimultaneous: "",
    plannedBusinessesCount: "",
    coordinators: "",
    designers: "",
    contractors: "",
    visibleAtSite: false,
  });

  const [newEntry, setNewEntry] = useState({
    fullName: "",
    birthDate: "",
    employerName: "",
    employerOrgNumber: "",
    hiringCompanyName: "",
    hmsCardNumber: "",
    startedAtSiteDate: "",
    endedAtSiteDate: "",
    notes: "",
  });
  const [dailyCheckDate, setDailyCheckDate] = useState(new Date().toISOString().slice(0, 10));
  const [dailyCheckNotes, setDailyCheckNotes] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryDraft, setEntryDraft] = useState({
    fullName: "",
    birthDate: "",
    employerName: "",
    employerOrgNumber: "",
    hiringCompanyName: "",
    hmsCardNumber: "",
    startedAtSiteDate: "",
    endedAtSiteDate: "",
    notes: "",
    isActive: true,
  });

  const activeRosterCount = useMemo(
    () => data.rosterEntries.filter((entry) => entry.isActive).length,
    [data.rosterEntries]
  );
  const availableEmployees = useMemo(
    () =>
      [...(data.availableEmployees ?? [])].sort((left, right) =>
        left.name.localeCompare(right.name, "nb-NO", { sensitivity: "base" })
      ),
    [data.availableEmployees]
  );
  const activeRosterNameSet = useMemo(
    () =>
      new Set(
        data.rosterEntries
          .filter((entry) => entry.isActive)
          .map((entry) => String(entry.fullName ?? "").trim().toLowerCase())
      ),
    [data.rosterEntries]
  );

  const lastCheckLabel = useMemo(() => {
    if (!data.latestCheckDate) return "Ingen registrert kontroll";
    return new Date(data.latestCheckDate).toLocaleDateString("nb-NO");
  }, [data.latestCheckDate]);
  const submissionDeadlineLabel = useMemo(() => {
    if (!data.preNotificationRequirement?.submissionDeadline) return null;
    return new Date(data.preNotificationRequirement.submissionDeadline).toLocaleDateString("nb-NO");
  }, [data.preNotificationRequirement?.submissionDeadline]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/construction-compliance`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || "Kunne ikke hente compliance-data");
      }

      const payload = result.data as ComplianceData;
      setData(payload);

      if (payload.shaPlan) {
        setShaPlan({
          status: payload.shaPlan.status ?? "DRAFT",
          builderName: payload.shaPlan.builderName ?? "",
          builderRepresentativeName: payload.shaPlan.builderRepresentativeName ?? "",
          builderRepresentativeContact: payload.shaPlan.builderRepresentativeContact ?? "",
          coordinatorPlanningName: payload.shaPlan.coordinatorPlanningName ?? "",
          coordinatorExecutionName: payload.shaPlan.coordinatorExecutionName ?? "",
          organizationChart: payload.shaPlan.organizationChart ?? "",
          progressPlan: payload.shaPlan.progressPlan ?? "",
          specificMeasures: payload.shaPlan.specificMeasures ?? "",
          changeProcedure: payload.shaPlan.changeProcedure ?? "",
          conflictAssessmentDocumented: payload.shaPlan.conflictAssessmentDocumented ?? false,
          availableOnSite: payload.shaPlan.availableOnSite ?? false,
        });
      }

      if (payload.preNotification) {
        setPreNotification({
          status: payload.preNotification.status ?? "DRAFT",
          projectAddress: payload.preNotification.projectAddress ?? "",
          projectType: payload.preNotification.projectType ?? "Bygge- og anleggsarbeid",
          builderName: payload.preNotification.builderName ?? "",
          builderOrgNumber: payload.preNotification.builderOrgNumber ?? "",
          builderAddress: payload.preNotification.builderAddress ?? "",
          builderPhone: payload.preNotification.builderPhone ?? "",
          builderRepresentativeName: payload.preNotification.builderRepresentativeName ?? "",
          builderRepresentativePhone: payload.preNotification.builderRepresentativePhone ?? "",
          expectedStartDate: payload.preNotification.expectedStartDate
            ? new Date(payload.preNotification.expectedStartDate).toISOString().slice(0, 10)
            : "",
          expectedEndDate: payload.preNotification.expectedEndDate
            ? new Date(payload.preNotification.expectedEndDate).toISOString().slice(0, 10)
            : "",
          maxWorkersSimultaneous: payload.preNotification.maxWorkersSimultaneous?.toString() ?? "",
          plannedBusinessesCount: payload.preNotification.plannedBusinessesCount?.toString() ?? "",
          coordinators: payload.preNotification.coordinators ?? "",
          designers: payload.preNotification.designers ?? "",
          contractors: payload.preNotification.contractors ?? "",
          visibleAtSite: payload.preNotification.visibleAtSite ?? false,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Feil",
        description: "Kunne ikke laste bygg/anlegg-compliance",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [projectId]);

  const saveCompliance = async () => {
    if (!canManage) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/construction-compliance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shaPlan: {
            ...shaPlan,
            lastReviewedAt: new Date().toISOString(),
          },
          preNotification: {
            ...preNotification,
            expectedStartDate: preNotification.expectedStartDate || undefined,
            expectedEndDate: preNotification.expectedEndDate || null,
            maxWorkersSimultaneous: preNotification.maxWorkersSimultaneous
              ? Number(preNotification.maxWorkersSimultaneous)
              : null,
            plannedBusinessesCount: preNotification.plannedBusinessesCount
              ? Number(preNotification.plannedBusinessesCount)
              : null,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || "Kunne ikke lagre compliance-data");
      }

      toast({
        title: "Lagring fullført",
        description: "SHA-plan og forhåndsmelding er oppdatert.",
      });
      await loadData();
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Feil ved lagring",
        description: "Sjekk feltene og prøv igjen.",
      });
    } finally {
      setSaving(false);
    }
  };

  const addRosterEntry = async () => {
    if (!canManage) return;
    if (!newEntry.fullName || !newEntry.birthDate || !newEntry.employerName) {
      toast({
        variant: "destructive",
        title: "Mangler påkrevde felt",
        description: "Navn, fødselsdato og arbeidsgiver er obligatorisk.",
      });
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/construction-compliance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_ROSTER_ENTRY",
          data: {
            ...newEntry,
            isActive: !newEntry.endedAtSiteDate,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || "Kunne ikke legge til person");
      }

      setNewEntry({
        fullName: "",
        birthDate: "",
        employerName: "",
        employerOrgNumber: "",
        hiringCompanyName: "",
        hmsCardNumber: "",
        startedAtSiteDate: "",
        endedAtSiteDate: "",
        notes: "",
      });
      toast({
        title: "Person registrert",
        description: "Elektronisk oversiktsliste er oppdatert.",
      });
      await loadData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Feil",
        description: "Kunne ikke legge til person i oversiktslisten.",
      });
    }
  };

  const fillFromEmployee = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    const employee = availableEmployees.find((candidate) => candidate.userId === employeeId);
    if (!employee) return;
    setNewEntry((prev) => ({
      ...prev,
      fullName: employee.name,
      employerName: data.tenant?.name || prev.employerName,
      employerOrgNumber: data.tenant?.orgNumber || prev.employerOrgNumber,
      startedAtSiteDate: prev.startedAtSiteDate || new Date().toISOString().slice(0, 10),
    }));
  };

  const registerDailyCheck = async () => {
    if (!canManage) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/construction-compliance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHECK_ROSTER_DAY",
          data: {
            checkedDate: dailyCheckDate,
            notes: dailyCheckNotes || null,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || "Kunne ikke registrere kontroll");
      }

      toast({
        title: "Daglig kontroll registrert",
        description: "Kontrollen av oversiktslisten er lagret.",
      });
      setDailyCheckNotes("");
      await loadData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Feil",
        description: "Kunne ikke registrere daglig kontroll.",
      });
    }
  };

  const startEditEntry = (entry: any) => {
    setEditingEntryId(entry.id);
    setEntryDraft({
      fullName: entry.fullName ?? "",
      birthDate: entry.birthDate ? new Date(entry.birthDate).toISOString().slice(0, 10) : "",
      employerName: entry.employerName ?? "",
      employerOrgNumber: entry.employerOrgNumber ?? "",
      hiringCompanyName: entry.hiringCompanyName ?? "",
      hmsCardNumber: entry.hmsCardNumber ?? "",
      startedAtSiteDate: entry.startedAtSiteDate
        ? new Date(entry.startedAtSiteDate).toISOString().slice(0, 10)
        : "",
      endedAtSiteDate: entry.endedAtSiteDate
        ? new Date(entry.endedAtSiteDate).toISOString().slice(0, 10)
        : "",
      notes: entry.notes ?? "",
      isActive: entry.isActive ?? true,
    });
  };

  const saveEditedEntry = async () => {
    if (!canManage) return;
    if (!editingEntryId) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/construction-compliance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_ROSTER_ENTRY",
          rosterEntryId: editingEntryId,
          data: {
            ...entryDraft,
            employerOrgNumber: entryDraft.employerOrgNumber || null,
            hiringCompanyName: entryDraft.hiringCompanyName || null,
            hmsCardNumber: entryDraft.hmsCardNumber || null,
            startedAtSiteDate: entryDraft.startedAtSiteDate || null,
            endedAtSiteDate: entryDraft.endedAtSiteDate || null,
            notes: entryDraft.notes || null,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || "Kunne ikke oppdatere mannskapslinje");
      }
      toast({
        title: "Mannskapslinje oppdatert",
        description: "Endringene er lagret.",
      });
      setEditingEntryId(null);
      await loadData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Feil",
        description: "Kunne ikke oppdatere mannskapslinjen.",
      });
    }
  };

  const closeRosterEntry = async (entryId: string) => {
    if (!canManage) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/construction-compliance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CLOSE_ROSTER_ENTRY",
          rosterEntryId: entryId,
          endedAtSiteDate: new Date().toISOString().slice(0, 10),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || "Kunne ikke avslutte mannskapslinje");
      }
      toast({
        title: "Mannskapslinje avsluttet",
        description: "Personen er satt som ikke aktiv på byggeplassen.",
      });
      await loadData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Feil",
        description: "Kunne ikke avslutte mannskapslinjen.",
      });
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Laster bygg/anlegg-compliance ...</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Elektronisk oversiktsliste</CardTitle>
          <CardDescription>
            Registrer alle som utfører arbeid på byggeplassen, inkludert HMS-kortnummer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
            Oversiktslisten er underlagt oppbevaringskrav i 6 måneder etter avsluttet arbeid
            (Byggherreforskriften § 15).
          </div>
          {!canManage ? (
            <div className="rounded border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
              Du har lesetilgang. Kun HMS/Admin/Leder/Verneombud kan redigere bygg/anlegg-compliance.
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm">
              <span className="font-medium">Aktive på plassen:</span> {activeRosterCount}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <a href={`/api/projects/${projectId}/construction-compliance?format=csv`}>
                  Eksporter oversiktsliste (CSV)
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={`/api/projects/${projectId}/construction-compliance/report`} target="_blank" rel="noreferrer">
                  Last ned compliance-PDF
                </a>
              </Button>
            </div>
          </div>

          {data.isDailyCheckMissing ? (
            <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Daglig kontroll mangler for i dag. Siste registrerte kontroll: {lastCheckLabel}.
            </div>
          ) : (
            <div className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-900">
              Daglig kontroll er oppdatert. Siste registrerte kontroll: {lastCheckLabel}.
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Legg til fra ansatte</Label>
              <Select value={selectedEmployeeId} onValueChange={fillFromEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg ansatt for forhåndsutfylling" />
                </SelectTrigger>
                <SelectContent>
                  {availableEmployees.map((employee) => (
                    <SelectItem key={employee.userId} value={employee.userId}>
                      {employee.name}
                      {employee.employeeNumber ? ` (${employee.employeeNumber})` : ""}
                      {activeRosterNameSet.has(employee.name.trim().toLowerCase()) ? " · Allerede aktiv" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Fyller ut navn, arbeidsgiver, org.nr og startdato automatisk.
              </p>
            </div>
            <div>
              <Label>Navn *</Label>
              <Input
                value={newEntry.fullName}
                onChange={(e) => setNewEntry((prev) => ({ ...prev, fullName: e.target.value }))}
              />
              {selectedEmployeeId && !newEntry.birthDate ? (
                <p className="mt-1 text-xs text-amber-700">
                  Velg fødselsdato manuelt før registrering.
                </p>
              ) : null}
            </div>
            <div>
              <Label>Fødselsdato *</Label>
              <Input
                type="date"
                value={newEntry.birthDate}
                onChange={(e) => setNewEntry((prev) => ({ ...prev, birthDate: e.target.value }))}
              />
            </div>
            <div>
              <Label>Arbeidsgiver *</Label>
              <Input
                value={newEntry.employerName}
                onChange={(e) => setNewEntry((prev) => ({ ...prev, employerName: e.target.value }))}
              />
            </div>
            <div>
              <Label>Org.nr arbeidsgiver</Label>
              <Input
                value={newEntry.employerOrgNumber}
                onChange={(e) =>
                  setNewEntry((prev) => ({ ...prev, employerOrgNumber: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Innleievirksomhet</Label>
              <Input
                value={newEntry.hiringCompanyName}
                onChange={(e) =>
                  setNewEntry((prev) => ({ ...prev, hiringCompanyName: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>HMS-kortnummer</Label>
              <Input
                value={newEntry.hmsCardNumber}
                onChange={(e) => setNewEntry((prev) => ({ ...prev, hmsCardNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label>Startdato på plassen</Label>
              <Input
                type="date"
                value={newEntry.startedAtSiteDate}
                onChange={(e) =>
                  setNewEntry((prev) => ({ ...prev, startedAtSiteDate: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Sluttdato på plassen</Label>
              <Input
                type="date"
                value={newEntry.endedAtSiteDate}
                onChange={(e) =>
                  setNewEntry((prev) => ({ ...prev, endedAtSiteDate: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <Label>Notater</Label>
            <Textarea
              rows={2}
              value={newEntry.notes}
              onChange={(e) => setNewEntry((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          {canManage ? <Button onClick={addRosterEntry}>Legg til i oversiktsliste</Button> : null}

          <div className="rounded border">
            {data.rosterEntries.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Ingen personer registrert ennå.</p>
            ) : (
              data.rosterEntries.map((entry) => (
                <div key={entry.id} className="border-b p-3 last:border-b-0">
                  {editingEntryId === entry.id ? (
                    <div className="space-y-2">
                      <div className="grid gap-2 md:grid-cols-3">
                        <Input
                          value={entryDraft.fullName}
                          onChange={(e) =>
                            setEntryDraft((prev) => ({ ...prev, fullName: e.target.value }))
                          }
                        />
                        <Input
                          type="date"
                          value={entryDraft.birthDate}
                          onChange={(e) =>
                            setEntryDraft((prev) => ({ ...prev, birthDate: e.target.value }))
                          }
                        />
                        <Input
                          value={entryDraft.employerName}
                          onChange={(e) =>
                            setEntryDraft((prev) => ({ ...prev, employerName: e.target.value }))
                          }
                        />
                        <Input
                          placeholder="HMS-kortnummer"
                          value={entryDraft.hmsCardNumber}
                          onChange={(e) =>
                            setEntryDraft((prev) => ({ ...prev, hmsCardNumber: e.target.value }))
                          }
                        />
                        <Input
                          type="date"
                          value={entryDraft.startedAtSiteDate}
                          onChange={(e) =>
                            setEntryDraft((prev) => ({ ...prev, startedAtSiteDate: e.target.value }))
                          }
                        />
                        <Input
                          type="date"
                          value={entryDraft.endedAtSiteDate}
                          onChange={(e) =>
                            setEntryDraft((prev) => ({ ...prev, endedAtSiteDate: e.target.value }))
                          }
                        />
                      </div>
                      <Textarea
                        rows={2}
                        value={entryDraft.notes}
                        onChange={(e) =>
                          setEntryDraft((prev) => ({ ...prev, notes: e.target.value }))
                        }
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEditedEntry}>
                          Lagre
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingEntryId(null)}>
                          Avbryt
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium">{entry.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.employerName}
                        {entry.hmsCardNumber ? ` · HMS-kort: ${entry.hmsCardNumber}` : " · HMS-kort mangler"}
                        {entry.isActive ? " · Aktiv" : " · Avsluttet"}
                      </p>
                      {canManage ? (
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEditEntry(entry)}>
                            Rediger
                          </Button>
                          {entry.isActive ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => closeRosterEntry(entry.id)}
                            >
                              Avslutt linje
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daglig kontroll av oversiktsliste</CardTitle>
          <CardDescription>Dokumenter daglig kontroll i henhold til byggherreforskriften.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Kontrolldato</Label>
              <Input type="date" value={dailyCheckDate} onChange={(e) => setDailyCheckDate(e.target.value)} />
            </div>
            <div>
              <Label>Kommentar</Label>
              <Input value={dailyCheckNotes} onChange={(e) => setDailyCheckNotes(e.target.value)} />
            </div>
          </div>
          {canManage ? (
            <Button variant="outline" onClick={registerDailyCheck}>
              Registrer kontroll
            </Button>
          ) : null}
          <div className="space-y-2">
            {data.rosterChecks.map((check) => (
              <div key={check.id} className="rounded border p-2 text-sm">
                {new Date(check.checkedDate).toLocaleDateString("nb-NO")}
                {" · "}
                {check.checkedBy?.name || check.checkedBy?.email || "Ukjent bruker"}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SHA-plan</CardTitle>
          <CardDescription>
            Prosjektspesifikk SHA-plan med organisering, fremdrift, tiltak og endringsrutine.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Byggherre</Label>
              <Input
                value={shaPlan.builderName}
                onChange={(e) => setShaPlan((prev) => ({ ...prev, builderName: e.target.value }))}
              />
            </div>
            <div>
              <Label>Byggherres representant</Label>
              <Input
                value={shaPlan.builderRepresentativeName}
                onChange={(e) =>
                  setShaPlan((prev) => ({ ...prev, builderRepresentativeName: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Kontakt representant</Label>
              <Input
                value={shaPlan.builderRepresentativeContact}
                onChange={(e) =>
                  setShaPlan((prev) => ({ ...prev, builderRepresentativeContact: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Koordinator prosjektering (KP)</Label>
              <Input
                value={shaPlan.coordinatorPlanningName}
                onChange={(e) =>
                  setShaPlan((prev) => ({ ...prev, coordinatorPlanningName: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Koordinator utførelse (KU)</Label>
              <Input
                value={shaPlan.coordinatorExecutionName}
                onChange={(e) =>
                  setShaPlan((prev) => ({ ...prev, coordinatorExecutionName: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <Label>Organisasjonskart / rollefordeling</Label>
            <Textarea
              rows={4}
              value={shaPlan.organizationChart}
              onChange={(e) => setShaPlan((prev) => ({ ...prev, organizationChart: e.target.value }))}
            />
          </div>
          <div>
            <Label>Fremdriftsplan (når/hvor arbeidsoperasjoner utføres)</Label>
            <Textarea
              rows={4}
              value={shaPlan.progressPlan}
              onChange={(e) => setShaPlan((prev) => ({ ...prev, progressPlan: e.target.value }))}
            />
          </div>
          <div>
            <Label>Spesifikke SHA-tiltak (risikoforhold etter § 8)</Label>
            <Textarea
              rows={4}
              value={shaPlan.specificMeasures}
              onChange={(e) => setShaPlan((prev) => ({ ...prev, specificMeasures: e.target.value }))}
            />
          </div>
          <div>
            <Label>Rutine for endring og oppdatering av SHA-plan</Label>
            <Textarea
              rows={3}
              value={shaPlan.changeProcedure}
              onChange={(e) => setShaPlan((prev) => ({ ...prev, changeProcedure: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={shaPlan.conflictAssessmentDocumented}
                onCheckedChange={(checked) =>
                  setShaPlan((prev) => ({ ...prev, conflictAssessmentDocumented: checked === true }))
                }
              />
              <span className="text-sm">Rollekonflikt-vurdering for koordinator er dokumentert</span>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={shaPlan.availableOnSite}
                onCheckedChange={(checked) =>
                  setShaPlan((prev) => ({ ...prev, availableOnSite: checked === true }))
                }
              />
              <span className="text-sm">SHA-plan er tilgjengelig på byggeplassen</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Forhåndsmelding til Arbeidstilsynet</CardTitle>
          <CardDescription>
            Registrer opplysningene som kreves for forhåndsmelding ved varighet over 15 virkedager
            eller over 250 dagsverk.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.preNotificationRequirement?.isRequired ? (
            <div
              className={`rounded border p-3 text-sm ${
                data.preNotificationRequirement.isDeadlinePassed
                  ? "border-red-300 bg-red-50 text-red-900"
                  : data.preNotificationRequirement.isDeadlineSoon
                  ? "border-amber-300 bg-amber-50 text-amber-900"
                  : "border-blue-300 bg-blue-50 text-blue-900"
              }`}
            >
              <p className="font-medium">Forhåndsmelding er meldepliktig (Byggherreforskriften § 10)</p>
              <p>Årsak: {data.preNotificationRequirement.reasons.join(" / ")}</p>
              {data.preNotificationRequirement.workDays !== null ? (
                <p>Estimert varighet: {data.preNotificationRequirement.workDays} virkedager</p>
              ) : null}
              {data.preNotificationRequirement.estimatedWorkerDays !== null ? (
                <p>Estimert arbeidsmengde: {data.preNotificationRequirement.estimatedWorkerDays} dagsverk</p>
              ) : null}
              {submissionDeadlineLabel ? <p>Innsendingsfrist: {submissionDeadlineLabel}</p> : null}
            </div>
          ) : (
            <div className="rounded border border-muted bg-muted/20 p-3 text-sm text-muted-foreground">
              Ikke meldepliktig ut fra dagens estimat. Oppdater datoer/bemanning ved endringer.
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Adresse byggeplass</Label>
              <Input
                value={preNotification.projectAddress}
                onChange={(e) =>
                  setPreNotification((prev) => ({ ...prev, projectAddress: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Prosjektets art</Label>
              <Input
                value={preNotification.projectType}
                onChange={(e) => setPreNotification((prev) => ({ ...prev, projectType: e.target.value }))}
              />
            </div>
            <div>
              <Label>Byggherre navn</Label>
              <Input
                value={preNotification.builderName}
                onChange={(e) => setPreNotification((prev) => ({ ...prev, builderName: e.target.value }))}
              />
            </div>
            <div>
              <Label>Byggherre org.nr</Label>
              <Input
                value={preNotification.builderOrgNumber}
                onChange={(e) =>
                  setPreNotification((prev) => ({ ...prev, builderOrgNumber: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Byggherre adresse</Label>
              <Input
                value={preNotification.builderAddress}
                onChange={(e) =>
                  setPreNotification((prev) => ({ ...prev, builderAddress: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Byggherre telefon</Label>
              <Input
                value={preNotification.builderPhone}
                onChange={(e) =>
                  setPreNotification((prev) => ({ ...prev, builderPhone: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Startdato</Label>
              <Input
                type="date"
                value={preNotification.expectedStartDate}
                onChange={(e) =>
                  setPreNotification((prev) => ({ ...prev, expectedStartDate: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Sluttdato</Label>
              <Input
                type="date"
                value={preNotification.expectedEndDate}
                onChange={(e) =>
                  setPreNotification((prev) => ({ ...prev, expectedEndDate: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Forventet maks antall arbeidstakere samtidig</Label>
              <Input
                type="number"
                min={1}
                value={preNotification.maxWorkersSimultaneous}
                onChange={(e) =>
                  setPreNotification((prev) => ({
                    ...prev,
                    maxWorkersSimultaneous: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Planlagt antall virksomheter</Label>
              <Input
                type="number"
                min={1}
                value={preNotification.plannedBusinessesCount}
                onChange={(e) =>
                  setPreNotification((prev) => ({
                    ...prev,
                    plannedBusinessesCount: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div>
            <Label>Koordinatorer og kontaktinformasjon</Label>
            <Textarea
              rows={3}
              value={preNotification.coordinators}
              onChange={(e) => setPreNotification((prev) => ({ ...prev, coordinators: e.target.value }))}
            />
          </div>
          <div>
            <Label>Prosjekterende virksomheter</Label>
            <Textarea
              rows={3}
              value={preNotification.designers}
              onChange={(e) => setPreNotification((prev) => ({ ...prev, designers: e.target.value }))}
            />
          </div>
          <div>
            <Label>Utførende virksomheter</Label>
            <Textarea
              rows={3}
              value={preNotification.contractors}
              onChange={(e) => setPreNotification((prev) => ({ ...prev, contractors: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={preNotification.visibleAtSite}
              onCheckedChange={(checked) =>
                setPreNotification((prev) => ({ ...prev, visibleAtSite: checked === true }))
              }
            />
            <span className="text-sm">Oppdatert forhåndsmelding er synlig på byggeplassen</span>
          </div>
        </CardContent>
      </Card>

      {canManage ? (
        <div className="flex justify-end">
          <Button onClick={saveCompliance} disabled={saving}>
            {saving ? "Lagrer..." : "Lagre bygg/anlegg-compliance"}
          </Button>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Compliance-status</CardTitle>
          <CardDescription>
            Obligatoriske kontroller før SHA-plan settes aktiv og før forhåndsmelding registreres som innsendt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded border p-3">
            <p className="font-medium">SHA-plan klar for aktiv status</p>
            <p
              className={
                data.complianceValidation?.shaReadyForActive ? "text-green-700" : "text-amber-700"
              }
            >
              {data.complianceValidation?.shaReadyForActive ? "Ja" : "Nei"}
            </p>
            {!data.complianceValidation?.shaReadyForActive &&
            data.complianceValidation?.shaMissingFieldsForActive?.length ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Mangler: {data.complianceValidation.shaMissingFieldsForActive.join(", ")}
              </p>
            ) : null}
          </div>
          <div className="rounded border p-3">
            <p className="font-medium">Forhåndsmelding klar for innsending</p>
            <p
              className={
                data.complianceValidation?.preNotificationReadyForSubmission
                  ? "text-green-700"
                  : "text-amber-700"
              }
            >
              {data.complianceValidation?.preNotificationReadyForSubmission ? "Ja" : "Nei"}
            </p>
            {!data.complianceValidation?.preNotificationReadyForSubmission &&
            data.complianceValidation?.preNotificationMissingFieldsForSubmission?.length ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Mangler: {data.complianceValidation.preNotificationMissingFieldsForSubmission.join(", ")}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endringshistorikk (SHA og forhåndsmelding)</CardTitle>
          <CardDescription>Viser hvem som har endret hva og når.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data.changeLogs ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen endringer logget ennå.</p>
          ) : (
            (data.changeLogs ?? []).map((entry) => (
              <div key={entry.id} className="rounded border p-3 text-sm">
                <p className="font-medium">
                  {entry.action === "CONSTRUCTION_SHA_PLAN_UPDATED" ? "SHA-plan oppdatert" : "Forhåndsmelding oppdatert"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString("nb-NO")} · {entry.changedBy}
                </p>
                {entry.metadata?.changedFields?.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                    {entry.metadata.changedFields.slice(0, 8).map((field) => (
                      <li key={`${entry.id}-${field.field}`}>
                        {changeFieldLabels[field.field] ?? field.field}: {formatChangeValue(field.from)} →{" "}
                        {formatChangeValue(field.to)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
