"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  APPROVAL_VALIDITY_LABELS,
  approvalIntervalExceedsAnnual,
  equipmentCategoryLabel,
  formatApprovalDate,
  getApprovalValidity,
  type ApprovalValidity,
} from "@/lib/equipment-approval";
import type { EquipmentDetail } from "@/server/queries/equipment-approval.queries";
import {
  deleteEquipmentDocument,
  linkEquipmentRisk,
  linkEquipmentRoutine,
  unlinkEquipmentRisk,
  unlinkEquipmentRoutine,
  uploadEquipmentDocuments,
} from "@/server/actions/equipment-approval.actions";

const VALIDITY_CLASS: Record<ApprovalValidity, string> = {
  GYLDIG: "border-green-300 bg-green-100 text-green-900",
  UTLOPER: "border-amber-300 bg-amber-100 text-amber-950",
  UTLOPT: "border-red-300 bg-red-100 text-red-900",
  UTTATT: "border-slate-300 bg-slate-100 text-slate-800",
};

export function EquipmentApprovalDetail({
  equipment,
  canEdit,
}: {
  equipment: EquipmentDetail;
  canEdit: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [routineId, setRoutineId] = useState("");
  const [riskId, setRiskId] = useState("");
  const [busy, setBusy] = useState(false);
  const validity = getApprovalValidity(equipment);
  const longInterval = approvalIntervalExceedsAnnual(equipment.validFrom, equipment.validTo);

  async function run(action: () => Promise<{ success: boolean; error?: { message: string } }>) {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (!result.success) {
      toast({
        variant: "destructive",
        title: "Kunne ikke oppdatere",
        description: result.error?.message ?? "Ukjent feil",
      });
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{equipment.name}</h2>
            <Badge variant="outline" className={VALIDITY_CLASS[validity]}>
              {APPROVAL_VALIDITY_LABELS[validity]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {equipmentCategoryLabel(equipment.category)}
            {equipment.location ? ` · ${equipment.location}` : ""}
            {equipment.serialNumber ? ` · ${equipment.serialNumber}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/dashboard/incidents/new?equipmentId=${equipment.id}`}>
              <Plus className="mr-2 h-4 w-4" />
              Registrer avvik
            </Link>
          </Button>
          {canEdit && (
            <Button asChild variant="outline" className="bg-transparent">
              <Link href={`/dashboard/utstyr/${equipment.id}/rediger`}>
                <Pencil className="mr-2 h-4 w-4" />
                Rediger
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Godkjenning</CardTitle>
          <CardDescription>FuA § 13-2 og § 13-4. Attesten skal kunne vises tilsyn.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-2">
          <p><span className="text-muted-foreground">Leverandør: </span>{equipment.supplierName}</p>
          <p><span className="text-muted-foreground">Godkjent av: </span>{equipment.approvalBody}</p>
          <p>
            <span className="text-muted-foreground">Gyldig: </span>
            {formatApprovalDate(equipment.validFrom)} – {formatApprovalDate(equipment.validTo)}
          </p>
          <p>
            <span className="text-muted-foreground">Attestnummer: </span>
            {equipment.certificateNumber ?? "–"}
          </p>
          {longInterval && (
            <p className="text-amber-800 md:col-span-2">
              Kontrollintervallet er lengre enn 12 måneder og må være dokumentert som forsvarlig.
            </p>
          )}
          {equipment.notes && <p className="whitespace-pre-wrap md:col-span-2">{equipment.notes}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dokumenter</CardTitle>
          <CardDescription>Kontrollattest, bruksanvisning og vedlikeholdsjournal (FuA § 12-8).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {equipment.documents.length === 0 ? (
            <p className="text-sm text-amber-800">Ingen dokumenter er lastet opp.</p>
          ) : (
            <ul className="space-y-2">
              {equipment.documents.map((document) => (
                <li key={document.id} className="flex items-center justify-between gap-3 text-sm">
                  <a
                    href={`/api/files/${document.fileKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    {document.name}
                  </a>
                  {canEdit && (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="bg-transparent"
                      disabled={busy}
                      onClick={() => run(() => deleteEquipmentDocument(document.id))}
                      aria-label={`Slett ${document.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canEdit && (
            <form
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                void run(() => uploadEquipmentDocuments(equipment.id, formData));
                event.currentTarget.reset();
              }}
            >
              <div className="flex-1 space-y-2">
                <Input name="files" type="file" multiple accept=".pdf,.docx,image/jpeg,image/png,image/webp" required />
              </div>
              <Button type="submit" disabled={busy}>Last opp</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rutiner</CardTitle>
            <CardDescription>FuA § 13-4: rutiner for sakkyndig kontroll skal ligge i internkontrollen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {equipment.routines.length === 0 && (
              <p className="text-sm text-muted-foreground">Ingen rutiner er knyttet.</p>
            )}
            <ul className="space-y-2">
              {equipment.routines.map((routine) => (
                <li key={routine.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/dashboard/rutiner/${routine.id}`} className="hover:underline">
                    {routine.title}
                  </Link>
                  {canEdit && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="bg-transparent"
                      disabled={busy}
                      onClick={() => run(() => unlinkEquipmentRoutine(equipment.id, routine.id))}
                    >
                      Fjern
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {canEdit && equipment.routineOptions.length > 0 && (
              <div className="flex gap-2">
                <Select value={routineId || undefined} onValueChange={setRoutineId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg rutine" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipment.routineOptions.map((routine) => (
                      <SelectItem key={routine.id} value={routine.id}>
                        {routine.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  disabled={busy || !routineId}
                  onClick={() => {
                    void run(() => linkEquipmentRoutine(equipment.id, routineId)).then(() => setRoutineId(""));
                  }}
                >
                  Knytt
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risiko</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {equipment.risks.length === 0 && (
              <p className="text-sm text-muted-foreground">Ingen risikoer er knyttet.</p>
            )}
            <ul className="space-y-2">
              {equipment.risks.map((risk) => (
                <li key={risk.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/dashboard/risks/${risk.id}`} className="hover:underline">
                    {risk.title}
                    <span className="text-muted-foreground"> · {risk.score}</span>
                  </Link>
                  {canEdit && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="bg-transparent"
                      disabled={busy}
                      onClick={() => run(() => unlinkEquipmentRisk(equipment.id, risk.id))}
                    >
                      Fjern
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {canEdit && equipment.riskOptions.length > 0 && (
              <div className="flex gap-2">
                <Select value={riskId || undefined} onValueChange={setRiskId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg risiko" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipment.riskOptions.map((risk) => (
                      <SelectItem key={risk.id} value={risk.id}>
                        {risk.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  disabled={busy || !riskId}
                  onClick={() => {
                    void run(() => linkEquipmentRisk(equipment.id, riskId)).then(() => setRiskId(""));
                  }}
                >
                  Knytt
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Avvik</CardTitle>
          <CardDescription>Hendelser registrert på dette utstyret.</CardDescription>
        </CardHeader>
        <CardContent>
          {equipment.incidents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen avvik er knyttet ennå.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {equipment.incidents.map((incident) => (
                <li key={incident.id}>
                  <Link href={`/dashboard/incidents/${incident.id}`} className="hover:underline">
                    {incident.avviksnummer ? `${incident.avviksnummer} · ` : ""}
                    {incident.title}
                  </Link>
                  <span className="text-muted-foreground"> · {incident.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
