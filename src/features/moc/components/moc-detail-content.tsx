"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  addMocAffectedUsers,
  addMocLink,
  markMocInformed,
  markMocVoReviewed,
  transitionMoc,
  updateMoc,
} from "@/server/actions/moc.actions";
import { getAllowedNextMocStatuses, type MocStatus, type MocTransitionContext } from "@/lib/moc-workflow";
import {
  MOC_STATUS_LABELS,
  MOC_TYPE_LABELS,
  MOC_CLASSIFICATION_LABELS,
  MOC_DURATION_LABELS,
  MOC_SOURCE_LABELS,
} from "@/lib/moc-labels";
import type { fetchMocDetail } from "@/server/queries/moc.queries";

type Detail = NonNullable<Awaited<ReturnType<typeof fetchMocDetail>>>;

const ACTION_LABELS: Partial<Record<MocStatus, string>> = {
  IMPACT_ASSESSMENT: "Start konsekvensvurdering",
  PENDING_APPROVAL: "Send til godkjenning",
  APPROVED: "Godkjenn",
  REJECTED: "Avvis",
  IMPLEMENTING: "Start iverksetting",
  VERIFYING: "Start verifikasjon",
  CLOSED: "Lukk sak",
  CANCELLED: "Kanseller",
  DRAFT: "Tilbake til utkast",
};

export function MocDetailContent({ data }: { data: Detail }) {
  const router = useRouter();
  const { toast } = useToast();
  const moc = data.moc;
  const [impact, setImpact] = useState(moc.impactAssessment ?? "");
  const [envImpact, setEnvImpact] = useState(moc.environmentalImpact ?? "");
  const [verificationNote, setVerificationNote] = useState(moc.verificationNote ?? "");
  const [rejectedReason, setRejectedReason] = useState("");
  const [linkKind, setLinkKind] = useState<
    "risk" | "incident" | "sja" | "document" | "routine" | "environment"
  >("risk");
  const [linkTarget, setLinkTarget] = useState("");
  const [affectedUserId, setAffectedUserId] = useState("");
  const [busy, setBusy] = useState(false);

  const ctx: MocTransitionContext = {
    classification: moc.classification,
    source: moc.source,
    duration: moc.duration,
    hasImpactAssessment: Boolean(impact.trim()),
    hasEnvironmentalImpact: Boolean(envImpact.trim()),
    hasRiskLink: moc.riskLinks.length > 0,
    hasVoReview: Boolean(moc.voReviewedAt),
    hasPlannedEnd: Boolean(moc.plannedEndAt),
    hasInformed: Boolean(moc.informedAt),
    hasVerification: Boolean(verificationNote.trim()),
  };
  const nextStatuses = getAllowedNextMocStatuses(moc.status, ctx);

  async function run(action: () => Promise<{ success: boolean; error?: string }>) {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (!result.success) {
      toast({ title: "Ikke gjennomført", description: result.error ?? "Ukjent feil", variant: "destructive" });
      return;
    }
    toast({ title: "Lagret" });
    router.refresh();
  }

  const linkOptions =
    linkKind === "risk"
      ? data.risks.map((item) => ({ id: item.id, label: item.title }))
      : linkKind === "incident"
        ? data.incidents.map((item) => ({
            id: item.id,
            label: `${item.avviksnummer ?? item.type}: ${item.title}`,
          }))
        : linkKind === "sja"
          ? data.sjaAnalyses.map((item) => ({
              id: item.id,
              label: `${item.sjaNummer ?? "SJA"}: ${item.title}`,
            }))
          : linkKind === "document"
            ? data.documents.map((item) => ({ id: item.id, label: item.title }))
            : linkKind === "environment"
              ? (data.environmentalAspects ?? []).map((item) => ({ id: item.id, label: item.title }))
              : data.routines.map((item) => ({ id: item.id, label: item.title }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{MOC_STATUS_LABELS[moc.status]}</Badge>
        <Badge variant="secondary">{MOC_CLASSIFICATION_LABELS[moc.classification]}</Badge>
        <Badge variant="secondary">{MOC_TYPE_LABELS[moc.changeType]}</Badge>
        <Badge variant="secondary">{MOC_DURATION_LABELS[moc.duration]}</Badge>
        <Badge variant="secondary">{MOC_SOURCE_LABELS[moc.source]}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Beskrivelse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="whitespace-pre-wrap">{moc.description}</p>
          <p>
            <span className="font-medium">HMS-konsekvens: </span>
            {moc.hseImpact ?? "–"}
          </p>
          <p>
            <span className="font-medium">Ytre miljø: </span>
            {moc.environmentalImpact ?? "–"}
          </p>
          <p className="text-muted-foreground">
            Foreslått av {moc.proposedBy.name ?? moc.proposedBy.email}
            {moc.responsible ? ` · Ansvarlig ${moc.responsible.name}` : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Konsekvensvurdering</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={impact}
            onChange={(event) => setImpact(event.target.value)}
            rows={4}
            placeholder="Konsekvenser for prosess, utstyr, organisasjon, bemanning og lovkrav (IK-HMS § 5 nr. 6)"
          />
          <Label htmlFor="environmentalImpact">Konsekvens for ytre miljø (ISO 14001:2026 6.3)</Label>
          <Textarea
            id="environmentalImpact"
            value={envImpact}
            onChange={(event) => setEnvImpact(event.target.value)}
            rows={3}
            placeholder="Påvirkning på klima, natur, ressurser eller forurensning – eller at den ikke er vesentlig"
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() =>
              run(() =>
                updateMoc({ id: moc.id, impactAssessment: impact, environmentalImpact: envImpact }),
              )
            }
          >
            Lagre vurdering
          </Button>
        </CardContent>
      </Card>

      {data.permissions.canApprove && (
        <Card>
          <CardHeader>
            <CardTitle>Saksgang</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {nextStatuses.map((status) => (
              <Button
                key={status}
                type="button"
                variant={status === "REJECTED" || status === "CANCELLED" ? "outline" : "default"}
                disabled={busy}
                onClick={() =>
                  run(() =>
                    transitionMoc({
                      id: moc.id,
                      to: status,
                      verificationNote,
                      rejectedReason,
                    }),
                  )
                }
              >
                {ACTION_LABELS[status] ?? MOC_STATUS_LABELS[status]}
              </Button>
            ))}
            {data.permissions.isVerneombud && !moc.voReviewedAt && (
              <Button type="button" variant="outline" disabled={busy} onClick={() => run(() => markMocVoReviewed(moc.id))}>
                Bekreft medvirkning (verneombud)
              </Button>
            )}
            {data.permissions.canApprove && moc.status === "PENDING_APPROVAL" && (
              <div className="w-full space-y-2">
                <Label>Begrunnelse ved avvisning</Label>
                <Textarea value={rejectedReason} onChange={(event) => setRejectedReason(event.target.value)} rows={2} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!data.permissions.canApprove && (
        <Card>
          <CardHeader>
            <CardTitle>Din deltakelse</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {nextStatuses.includes("IMPACT_ASSESSMENT") && (
              <Button
                type="button"
                disabled={busy}
                onClick={() => run(() => transitionMoc({ id: moc.id, to: "IMPACT_ASSESSMENT" }))}
              >
                Send til vurdering
              </Button>
            )}
            <Button type="button" variant="outline" disabled={busy} onClick={() => run(() => markMocInformed(moc.id))}>
              Bekreft at jeg er informert
            </Button>
            {data.permissions.isVerneombud && !moc.voReviewedAt && (
              <Button type="button" variant="outline" disabled={busy} onClick={() => run(() => markMocVoReviewed(moc.id))}>
                Bekreft medvirkning
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informasjon og verifikasjon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Informert: {moc.informedAt ? new Date(moc.informedAt).toLocaleDateString("nb-NO") : "ikke ennå"}
            {moc.voReviewedAt ? " · Verneombud har medvirket" : ""}
          </p>
          {data.permissions.canApprove && (
            <>
              <Label>Verifikasjonsnotat</Label>
              <Textarea
                value={verificationNote}
                onChange={(event) => setVerificationNote(event.target.value)}
                rows={3}
              />
              <Button type="button" variant="outline" disabled={busy} onClick={() => run(() => markMocInformed(moc.id))}>
                Marker berørte som informert
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Koblinger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="text-sm space-y-1">
            {moc.riskLinks.map((link) => (
              <li key={link.risk.id}>
                <Link className="hover:underline" href={`/dashboard/risks/${link.risk.id}`}>
                  Risiko: {link.risk.title}
                </Link>
              </li>
            ))}
            {moc.incidentLinks.map((link) => (
              <li key={link.incident.id}>
                <Link className="hover:underline" href={`/dashboard/incidents/${link.incident.id}`}>
                  Avvik: {link.incident.avviksnummer ?? link.incident.title}
                </Link>
              </li>
            ))}
            {moc.sjaLinks.map((link) => (
              <li key={link.sjaAnalysis.id}>
                <Link className="hover:underline" href={`/dashboard/sja/${link.sjaAnalysis.id}`}>
                  SJA: {link.sjaAnalysis.title}
                </Link>
              </li>
            ))}
            {moc.documentLinks.map((link) => (
              <li key={link.document.id}>
                <Link className="hover:underline" href={`/dashboard/documents/${link.document.id}`}>
                  Dokument: {link.document.title}
                </Link>
              </li>
            ))}
            {moc.routineLinks.map((link) => (
              <li key={link.routine.id}>
                <Link className="hover:underline" href={`/dashboard/rutiner/${link.routine.id}`}>
                  Rutine: {link.routine.title}
                </Link>
              </li>
            ))}
            {moc.environmentalAspectLinks?.map((link) => (
              <li key={link.environmentalAspect.id}>
                <Link className="hover:underline" href={`/dashboard/environment/${link.environmentalAspect.id}`}>
                  Miljøaspekt: {link.environmentalAspect.title}
                </Link>
              </li>
            ))}
            {moc.measures.map((measure) => (
              <li key={measure.id}>Tiltak: {measure.title}</li>
            ))}
          </ul>
          {data.permissions.canApprove && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={linkKind} onValueChange={(value) => setLinkKind(value as typeof linkKind)}>
                <SelectTrigger className="sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="risk">Risiko</SelectItem>
                  <SelectItem value="incident">Avvik</SelectItem>
                  <SelectItem value="sja">SJA</SelectItem>
                  <SelectItem value="document">Dokument</SelectItem>
                  <SelectItem value="routine">Rutine</SelectItem>
                  <SelectItem value="environment">Miljøaspekt</SelectItem>
                </SelectContent>
              </Select>
              <Select value={linkTarget} onValueChange={setLinkTarget}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg" />
                </SelectTrigger>
                <SelectContent>
                  {linkOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                disabled={busy || !linkTarget}
                onClick={() =>
                  run(() => addMocLink({ mocId: moc.id, kind: linkKind, targetId: linkTarget }))
                }
              >
                Knytt
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Berørte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="text-sm space-y-1">
            {moc.affectedUsers.map((row) => (
              <li key={row.userId}>
                {row.user.name ?? row.user.email}
                {row.informedAt ? " · informert" : ""}
              </li>
            ))}
            {moc.affectedUsers.length === 0 && (
              <li className="text-muted-foreground">Ingen berørte lagt til.</li>
            )}
          </ul>
          {data.permissions.canApprove && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={affectedUserId} onValueChange={setAffectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg ansatt" />
                </SelectTrigger>
                <SelectContent>
                  {data.users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name ?? user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                disabled={busy || !affectedUserId}
                onClick={() => run(() => addMocAffectedUsers(moc.id, [affectedUserId]))}
              >
                Legg til
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
