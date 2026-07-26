"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlarmClock,
  ImageIcon,
  Lock,
  MessageSquare,
  Paperclip,
  ShieldAlert,
  Timer,
  UserCheck,
} from "lucide-react";
import {
  parseGuestAttachments,
  type GuestPriority,
  type GuestStatus,
  type GuestType,
} from "../lib/gjesteservice-config";
import { GUEST_TYPE_EMOJI, getGuestDictionary } from "../lib/guest-i18n";

export interface GuestSubmissionRow {
  id: string;
  type: GuestType;
  status: GuestStatus;
  priority: GuestPriority;
  message: string;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  roomOrTable: string | null;
  locale: string;
  consentContact: boolean;
  response: string | null;
  internalNotes: string | null;
  assignedToId: string | null;
  attachments: unknown;
  trackingToken: string;
  createdAt: string;
  respondedAt: string | null;
  slaDueAt: string | null;
  escalatedAt: string | null;
}

interface TeamMember {
  id: string;
  name: string;
}

interface Props {
  submissions: GuestSubmissionRow[];
  tavleId: string;
  canManage: boolean;
  teamMembers: TeamMember[];
  onRefresh: () => void;
}

const STATUS_STYLES: Record<GuestStatus, { label: string; cls: string }> = {
  NY: { label: "Ny", cls: "bg-blue-100 text-blue-700" },
  LEST: { label: "Under behandling", cls: "bg-yellow-100 text-yellow-800" },
  BEHANDLET: { label: "Behandlet", cls: "bg-green-100 text-green-700" },
  LUKKET: { label: "Ferdig", cls: "bg-gray-100 text-gray-600" },
};

const PRIORITY_STYLES: Record<GuestPriority, { label: string; cls: string }> = {
  KRITISK: { label: "Kritisk", cls: "bg-red-100 text-red-700 border-red-200" },
  HOY: { label: "Høy", cls: "bg-orange-100 text-orange-700 border-orange-200" },
  NORMAL: { label: "Normal", cls: "bg-slate-100 text-slate-700 border-slate-200" },
};

const RESPONSE_TEMPLATES: Record<"nb" | "en", string[]> = {
  nb: [
    "Vi har rettet forholdet og kontrollert at det fungerer som det skal. Takk for at du meldte fra.",
    "Vi har snakket med avdelingen og endret rutinen slik at dette ikke skjer igjen.",
    "Vi har registrert saken som avvik og følger den opp internt. Takk for tilbakemeldingen.",
  ],
  en: [
    "We have fixed the issue and verified that everything now works as expected. Thank you for letting us know.",
    "We have spoken with the department and changed the routine so this does not happen again.",
    "We have registered your case as a deviation and are following it up internally. Thank you for your feedback.",
  ],
};

const UNASSIGNED = "__ingen__";

function minutesBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 60_000);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} t ${minutes % 60} min`;
  return `${Math.floor(hours / 24)} d ${hours % 24} t`;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

export function GjesteservicePane({
  submissions,
  tavleId,
  canManage,
  teamMembers,
  onRefresh,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { response: string; internalNotes: string }>>(
    {}
  );

  const now = new Date();

  const stats = useMemo(() => {
    const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const open = submissions.filter((s) => s.status === "NY" || s.status === "LEST");
    const overdue = open.filter((s) => s.slaDueAt && new Date(s.slaDueAt) < now);
    const responseTimes = submissions
      .filter((s) => s.respondedAt && new Date(s.createdAt) >= cutoff)
      .map((s) => minutesBetween(new Date(s.createdAt), new Date(s.respondedAt!)));

    return {
      open: open.length,
      overdue: overdue.length,
      medianMinutes: median(responseTimes),
      last30: submissions.filter((s) => new Date(s.createdAt) >= cutoff).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissions]);

  function draftFor(row: GuestSubmissionRow) {
    return (
      drafts[row.id] ?? {
        response: row.response ?? "",
        internalNotes: row.internalNotes ?? "",
      }
    );
  }

  function updateDraft(row: GuestSubmissionRow, patch: Partial<{ response: string; internalNotes: string }>) {
    setDrafts((prev) => ({ ...prev, [row.id]: { ...draftFor(row), ...patch } }));
  }

  async function patchSubmission(
    row: GuestSubmissionRow,
    payload: Record<string, unknown>,
    successMessage: string
  ) {
    setSaving(row.id);
    try {
      const res = await fetch(`/api/hms-tavle/${tavleId}/gjest-submissions?submissionId=${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message ?? "Kunne ikke lagre");
      toast.success(successMessage);
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kunne ikke lagre");
    } finally {
      setSaving(null);
    }
  }

  if (submissions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
          <MessageSquare className="h-8 w-8 opacity-30" />
          <p className="text-sm">Ingen gjestmeldinger ennå</p>
          <p className="text-xs text-center max-w-sm">
            Legg til seksjonen <strong>Gjesteskjema</strong> på tavlen og heng opp rom-QR, så kan
            gjester melde fra uten innlogging.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Åpne saker</p>
            <p className="text-2xl font-bold">{stats.open}</p>
          </CardContent>
        </Card>
        <Card className={stats.overdue > 0 ? "border-red-200" : undefined}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Forbi svarfrist</p>
            <p className={`text-2xl font-bold ${stats.overdue > 0 ? "text-red-600" : ""}`}>
              {stats.overdue}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Median svartid (30 d)</p>
            <p className="text-2xl font-bold">
              {stats.medianMinutes === null ? "–" : formatDuration(stats.medianMinutes)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Meldinger (30 d)</p>
            <p className="text-2xl font-bold">{stats.last30}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 border rounded-lg px-3 py-2">
        <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <p>
          Gjestmeldinger er konfidensielle og vises aldri på den offentlige tavlen. Teksten du
          skriver i «Hva ble gjort» er den eneste informasjonen gjesten ser.
        </p>
      </div>

      <div className="space-y-3">
        {submissions.map((row) => {
          const statusCfg = STATUS_STYLES[row.status] ?? STATUS_STYLES.NY;
          const priorityCfg = PRIORITY_STYLES[row.priority] ?? PRIORITY_STYLES.NORMAL;
          const attachments = parseGuestAttachments(row.attachments);
          const guestLocale = row.locale === "en" ? "en" : "nb";
          const guestDict = getGuestDictionary(guestLocale);
          const slaDue = row.slaDueAt ? new Date(row.slaDueAt) : null;
          const isOpen = row.status === "NY" || row.status === "LEST";
          const isOverdue = Boolean(slaDue && isOpen && slaDue < now);
          const expanded = expandedId === row.id;
          const draft = draftFor(row);

          return (
            <Card key={row.id} className={isOverdue ? "border-red-200" : undefined}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg leading-none">{GUEST_TYPE_EMOJI[row.type]}</span>
                    <span className="text-sm font-semibold">{guestDict.types[row.type].label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusCfg.cls}`}>
                      {statusCfg.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityCfg.cls}`}>
                      {priorityCfg.label}
                    </span>
                    {row.roomOrTable && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                        {row.roomOrTable}
                      </span>
                    )}
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full uppercase">
                      {guestLocale === "en" ? "EN" : "NO"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(row.createdAt).toLocaleString("nb-NO", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {slaDue && isOpen && (
                  <p
                    className={`text-xs flex items-center gap-1.5 ${
                      isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {isOverdue ? (
                      <ShieldAlert className="h-3.5 w-3.5" />
                    ) : (
                      <Timer className="h-3.5 w-3.5" />
                    )}
                    {isOverdue
                      ? `Forbi svarfrist med ${formatDuration(minutesBetween(slaDue, now))}`
                      : `Svarfrist om ${formatDuration(minutesBetween(now, slaDue))}`}
                    {row.escalatedAt && " · eskalert til ledelsen"}
                  </p>
                )}

                <p className="text-sm bg-muted/40 rounded-lg px-3 py-2 whitespace-pre-line">
                  {row.message}
                </p>

                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((attachment) => (
                      <a
                        key={attachment.key}
                        href={`/api/hms-tavle/${tavleId}/gjest-submissions/vedlegg?submissionId=${row.id}&key=${encodeURIComponent(attachment.key)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs border rounded-lg px-2 py-1.5 hover:bg-muted transition-colors"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        <span className="max-w-[12rem] truncate">{attachment.name}</span>
                      </a>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {row.guestName && <span className="font-medium">{row.guestName}</span>}
                  {row.guestEmail && (
                    <a href={`mailto:${row.guestEmail}`} className="hover:underline">
                      {row.guestEmail}
                    </a>
                  )}
                  {row.guestPhone && <span>{row.guestPhone}</span>}
                  <span className="flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    {row.trackingToken.slice(0, 8)}
                  </span>
                  {row.guestEmail && (
                    <span>
                      {row.consentContact ? "Samtykke til kontakt" : "Ingen samtykke til kontakt"}
                    </span>
                  )}
                </div>

                {row.response && (
                  <div className="border-l-2 border-green-500 pl-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Hva ble gjort (synlig for gjesten)
                    </p>
                    <p className="text-sm whitespace-pre-line">{row.response}</p>
                  </div>
                )}

                {canManage && (
                  <div className="pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExpandedId(expanded ? null : row.id)}
                    >
                      {expanded ? "Lukk behandling" : "Behandle saken"}
                    </Button>
                  </div>
                )}

                {canManage && expanded && (
                  <div className="space-y-4 border-t pt-4">
                    <div className="space-y-1.5">
                      <Label htmlFor={`response-${row.id}`}>
                        Hva ble gjort {guestLocale === "en" && "(gjesten leser engelsk)"}
                      </Label>
                      <Textarea
                        id={`response-${row.id}`}
                        rows={4}
                        maxLength={2000}
                        value={draft.response}
                        onChange={(event) => updateDraft(row, { response: event.target.value })}
                        placeholder="Beskriv konkret hva som ble gjort. Denne teksten sendes til gjesten."
                      />
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {RESPONSE_TEMPLATES[guestLocale].map((template, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => updateDraft(row, { response: template })}
                            className="text-xs border rounded-full px-2.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            Forslag {index + 1}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`notes-${row.id}`}>
                        Interne notater (vises aldri for gjesten)
                      </Label>
                      <Textarea
                        id={`notes-${row.id}`}
                        rows={2}
                        maxLength={4000}
                        value={draft.internalNotes}
                        onChange={(event) => updateDraft(row, { internalNotes: event.target.value })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Ansvarlig</Label>
                      <Select
                        value={row.assignedToId ?? UNASSIGNED}
                        onValueChange={(value) =>
                          patchSubmission(
                            row,
                            { assignedToId: value === UNASSIGNED ? null : value },
                            "Ansvarlig oppdatert"
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Velg ansvarlig" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED}>Ingen ansvarlig</SelectItem>
                          {teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={saving === row.id}
                        onClick={() =>
                          patchSubmission(
                            row,
                            {
                              response: draft.response.trim() || null,
                              internalNotes: draft.internalNotes.trim() || null,
                            },
                            "Lagret"
                          )
                        }
                      >
                        Lagre
                      </Button>
                      {row.status === "NY" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={saving === row.id}
                          onClick={() =>
                            patchSubmission(
                              row,
                              {
                                status: "LEST",
                                internalNotes: draft.internalNotes.trim() || null,
                              },
                              "Satt under behandling"
                            )
                          }
                        >
                          <AlarmClock className="h-3.5 w-3.5 mr-1.5" />
                          Under behandling
                        </Button>
                      )}
                      {row.status !== "BEHANDLET" && row.status !== "LUKKET" && (
                        <Button
                          size="sm"
                          disabled={saving === row.id || !draft.response.trim()}
                          onClick={() =>
                            patchSubmission(
                              row,
                              {
                                status: "BEHANDLET",
                                response: draft.response.trim(),
                                internalNotes: draft.internalNotes.trim() || null,
                              },
                              "Saken er behandlet og gjesten er oppdatert"
                            )
                          }
                        >
                          <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                          Merk som behandlet
                        </Button>
                      )}
                      {row.status !== "LUKKET" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground"
                          disabled={saving === row.id || !draft.response.trim()}
                          onClick={() =>
                            patchSubmission(
                              row,
                              {
                                status: "LUKKET",
                                response: draft.response.trim(),
                                internalNotes: draft.internalNotes.trim() || null,
                              },
                              "Saken er avsluttet"
                            )
                          }
                        >
                          Avslutt saken
                        </Button>
                      )}
                    </div>

                    {!draft.response.trim() && (
                      <p className="text-xs text-muted-foreground">
                        «Hva ble gjort» må fylles ut før saken kan settes til behandlet eller
                        avsluttes – det er dette gjesten får se.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
