"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { updateAssignment } from "@/server/actions/assignment.actions";
import {
  INDUCTION_KEYS,
  INDUCTION_LABELS,
  type CompetenceItem,
  type InductionChecklist,
} from "@/features/assignments/lib/deployment-gate";
import { assignmentStatuses, assignmentStatusLabels } from "@/features/assignments/schemas/assignment.schema";

const NONE = "__none__";

interface AssignmentDetailEditorProps {
  canEdit: boolean;
  profiles: Array<{ id: string; name: string | null }>;
  assignment: {
    id: string;
    status: (typeof assignmentStatuses)[number];
    roleTitle: string;
    startDate: string;
    endDate: string;
    notes: string;
    induction: InductionChecklist;
    coordinationNoted: boolean;
    coordinationAt: string;
    coordinationContact: string;
    clientRiskReceived: boolean;
    competenceProfileId: string;
    user: { name: string | null; email: string };
    workplace: {
      name: string;
      orgNumber: string | null;
      contactName: string | null;
      contactPhone: string | null;
      contactEmail: string | null;
      address: string | null;
      industry: string | null;
      siteLeaderName: string | null;
    };
    project: { id: string; name: string } | null;
    profileName: string | null;
    competenceItems: CompetenceItem[];
    openIncidents: number;
    sjaCount: number;
  };
}

export function AssignmentDetailEditor({ assignment, profiles, canEdit }: AssignmentDetailEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(assignment.status);
  const [profileId, setProfileId] = useState(assignment.competenceProfileId);
  const [induction, setInduction] = useState<InductionChecklist>(assignment.induction);
  const [coordinationNoted, setCoordinationNoted] = useState(assignment.coordinationNoted);
  const [clientRiskReceived, setClientRiskReceived] = useState(assignment.clientRiskReceived);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const result = await updateAssignment({
      id: assignment.id,
      status,
      roleTitle: String(form.get("roleTitle") ?? ""),
      competenceProfileId: profileId,
      endDate: String(form.get("endDate") ?? ""),
      induction,
      coordinationNoted,
      coordinationAt: String(form.get("coordinationAt") ?? ""),
      coordinationContact: String(form.get("coordinationContact") ?? ""),
      clientRiskReceived,
      notes: String(form.get("notes") ?? ""),
    });
    setSaving(false);
    if (!result.success) {
      toast({ variant: "destructive", title: "Oppdraget ble ikke oppdatert", description: result.error });
      return;
    }
    toast({ title: "Oppdraget er oppdatert" });
    router.refresh();
  }

  const missing = assignment.competenceItems.filter(
    (item) => item.requiredLevel === "REQUIRED" && item.status !== "FULFILLED",
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href={`/dashboard/incidents?oppdrag=${assignment.id}`}>
            Avvik ({assignment.openIncidents} åpne)
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/incidents/new?oppdrag=${assignment.id}`}>Registrer avvik</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/sja?oppdrag=${assignment.id}`}>SJA ({assignment.sjaCount})</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/sja/new?oppdrag=${assignment.id}`}>Ny SJA</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {assignment.user.name || assignment.user.email} hos {assignment.workplace.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>Startet {assignment.startDate}</p>
          {assignment.workplace.address && <p>{assignment.workplace.address}</p>}
          {assignment.workplace.orgNumber && <p>Org.nr {assignment.workplace.orgNumber}</p>}
          {assignment.workplace.siteLeaderName && <p>Arbeidsleder: {assignment.workplace.siteLeaderName}</p>}
          {assignment.workplace.contactName && (
            <p>
              Kontakt: {assignment.workplace.contactName}
              {assignment.workplace.contactPhone ? ` · ${assignment.workplace.contactPhone}` : ""}
            </p>
          )}
          {assignment.project && <p>Prosjekt: {assignment.project.name}</p>}
          {assignment.workplace.industry && <p>Bransje på stedet: {assignment.workplace.industry}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kompetanse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>{assignment.profileName ?? "Ingen kompetanseprofil er valgt."}</p>
          {missing.length === 0 ? (
            <Badge>Påkrevd kompetanse er gyldig</Badge>
          ) : (
            missing.map((item) => (
              <p key={item.courseKey}>
                {item.courseKey}: {item.status === "EXPIRED" ? "utløpt" : "mangler"}
              </p>
            ))
          )}
        </CardContent>
      </Card>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Oppdrag</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as typeof status)} disabled={!canEdit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignmentStatuses.map((item) => (
                    <SelectItem key={item} value={item}>
                      {assignmentStatusLabels[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kompetanseprofil</Label>
              <Select
                value={profileId || NONE}
                onValueChange={(value) => setProfileId(value === NONE ? "" : value)}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Ingen profil</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleTitle">Rolle hos kunden</Label>
              <Input id="roleTitle" name="roleTitle" defaultValue={assignment.roleTitle} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Sluttdato</Label>
              <Input id="endDate" name="endDate" type="date" defaultValue={assignment.endDate} disabled={!canEdit} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Innføring og samordning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {INDUCTION_KEYS.map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={induction[key]}
                  disabled={!canEdit}
                  onCheckedChange={(value) => setInduction((current) => ({ ...current, [key]: value === true }))}
                />
                {INDUCTION_LABELS[key]}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={coordinationNoted}
                disabled={!canEdit}
                onCheckedChange={(value) => setCoordinationNoted(value === true)}
              />
              Samordning med innleier er avtalt
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={clientRiskReceived}
                disabled={!canEdit}
                onCheckedChange={(value) => setClientRiskReceived(value === true)}
              />
              Kundens risikovurdering eller SJA er mottatt
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="coordinationAt">Dato for samordning</Label>
                <Input
                  id="coordinationAt"
                  name="coordinationAt"
                  type="date"
                  defaultValue={assignment.coordinationAt}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coordinationContact">Kontakt i samordningen</Label>
                <Input
                  id="coordinationContact"
                  name="coordinationContact"
                  defaultValue={assignment.coordinationContact}
                  disabled={!canEdit}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notat</Label>
              <Textarea id="notes" name="notes" rows={3} defaultValue={assignment.notes} disabled={!canEdit} />
            </div>
          </CardContent>
        </Card>

        {canEdit && (
          <Button type="submit" disabled={saving}>
            {saving ? "Lagrer..." : "Lagre oppdrag"}
          </Button>
        )}
      </form>
    </div>
  );
}
