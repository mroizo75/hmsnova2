"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ACCESS_OBJECT_LABELS,
  DEFAULT_ASSIGN_OBJECTS,
  DEFAULT_ASSIST_OBJECTS,
  type AccessObject,
} from "@/lib/whistleblowing-objects";
import {
  addWhistleblowParty,
  assignWhistleblowCase,
  createWhistleblowMeasureTask,
  previewImpartiality,
  recordGdprAccessAssessment,
  requestWhistleblowAssistance,
  revokeWhistleblowGrant,
  sendWhistleblowStatement,
} from "@/server/actions/whistleblowing-access.actions";
import { decideBreakGlassRequest, fetchPendingBreakGlassRequests } from "@/server/actions/whistleblowing-break-glass.actions";

type TenantUser = {
  role: string;
  user: { id: string; name: string | null; email: string };
};

type GrantRow = {
  id: string;
  type: string;
  granteeId: string;
  purpose: string;
  expiresAt: string;
};

function GrantFormFields({
  users,
  purpose,
  setPurpose,
  granteeId,
  setGranteeId,
  confirmed,
  setConfirmed,
  warnings,
}: {
  users: TenantUser[];
  purpose: string;
  setPurpose: (v: string) => void;
  granteeId: string;
  setGranteeId: (v: string) => void;
  confirmed: boolean;
  setConfirmed: (v: boolean) => void;
  warnings: string[];
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Mottaker</Label>
        <select
          className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
          value={granteeId}
          onChange={(e) => setGranteeId(e.target.value)}
        >
          <option value="">Velg person</option>
          {users.map((u) => (
            <option key={u.user.id} value={u.user.id}>
              {u.user.name || u.user.email}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label>Formål</Label>
        <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={3} />
      </div>
      {warnings.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1"
        />
        Jeg bekrefter formål og at mottakeren er habil i denne saken.
      </label>
    </div>
  );
}

export function CaseAccessPanel({
  caseId,
  users,
  grants,
  isHandler,
  onChanged,
}: {
  caseId: string;
  users: TenantUser[];
  grants: GrantRow[];
  isHandler: boolean;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [purpose, setPurpose] = useState("");
  const [granteeId, setGranteeId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [fullAccess, setFullAccess] = useState(false);
  const [assistObjects, setAssistObjects] = useState<AccessObject[]>([...DEFAULT_ASSIST_OBJECTS]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [summary, setSummary] = useState("");
  const [partyUserId, setPartyUserId] = useState("");
  const [gdprRationale, setGdprRationale] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [breakGlass, setBreakGlass] = useState<Array<{ id: string; purpose: string; requesterName: string }>>([]);

  useEffect(() => {
    if (!granteeId) {
      setWarnings([]);
      return;
    }
    previewImpartiality(caseId, granteeId)
      .then((result) => setWarnings(result.warnings.map((w) => w.message)))
      .catch(() => setWarnings([]));
  }, [caseId, granteeId]);

  useEffect(() => {
    if (!isHandler) return;
    fetchPendingBreakGlassRequests()
      .then(setBreakGlass)
      .catch(() => setBreakGlass([]));
  }, [isHandler]);

  if (!isHandler) return null;

  const run = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast({ title: success });
      setPurpose("");
      setConfirmed(false);
      onChanged();
    } catch (err) {
      toast({
        title: "Ikke utført",
        description: err instanceof Error ? err.message : "Feil",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Tildel varslingssak</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tildel varslingssak</DialogTitle>
              <DialogDescription>
                Medsaksbehandler får tidsbegrenset, loggført tilgang. Identitet er skjult som standard.
              </DialogDescription>
            </DialogHeader>
            <GrantFormFields
              users={users}
              purpose={purpose}
              setPurpose={setPurpose}
              granteeId={granteeId}
              setGranteeId={setGranteeId}
              confirmed={confirmed}
              setConfirmed={setConfirmed}
              warnings={warnings}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={fullAccess} onChange={(e) => setFullAccess(e.target.checked)} />
              Gi hele saken (krever særskilt behov)
            </label>
            <p className="text-xs text-muted-foreground">
              Standard innsyn: {DEFAULT_ASSIGN_OBJECTS.map((o) => ACCESS_OBJECT_LABELS[o]).join(", ")}.
            </p>
            <Button
              onClick={() =>
                run(
                  () =>
                    assignWhistleblowCase({
                      caseId,
                      granteeId,
                      purpose,
                      impartialityConfirmed: confirmed,
                      fullAccess,
                    }),
                  "Saken er tildelt",
                )
              }
            >
              Tildel
            </Button>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Be om bistand</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Be om bistand</DialogTitle>
              <DialogDescription>
                Velg hvilke opplysninger mottakeren får se. Identitet og vedlegg er av som standard.
              </DialogDescription>
            </DialogHeader>
            <GrantFormFields
              users={users}
              purpose={purpose}
              setPurpose={setPurpose}
              granteeId={granteeId}
              setGranteeId={setGranteeId}
              confirmed={confirmed}
              setConfirmed={setConfirmed}
              warnings={warnings}
            />
            <div className="space-y-2">
              {(Object.keys(ACCESS_OBJECT_LABELS) as AccessObject[]).map((object) => (
                <label key={object} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={assistObjects.includes(object)}
                    onChange={(e) => {
                      setAssistObjects((current) =>
                        e.target.checked ? [...current, object] : current.filter((item) => item !== object),
                      );
                    }}
                  />
                  {ACCESS_OBJECT_LABELS[object]}
                </label>
              ))}
            </div>
            <Button
              onClick={() =>
                run(
                  () =>
                    requestWhistleblowAssistance({
                      caseId,
                      granteeId,
                      purpose,
                      impartialityConfirmed: confirmed,
                      objects: assistObjects,
                    }),
                  "Bistand er gitt",
                )
              }
            >
              Send
            </Button>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Opprett tiltak</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Opprett isolert tiltak</DialogTitle>
              <DialogDescription>
                Mottakeren ser bare tiltaket, uten at det kommer fra en varslingssak.
              </DialogDescription>
            </DialogHeader>
            <GrantFormFields
              users={users}
              purpose={purpose}
              setPurpose={setPurpose}
              granteeId={granteeId}
              setGranteeId={setGranteeId}
              confirmed={confirmed}
              setConfirmed={setConfirmed}
              warnings={warnings}
            />
            <Input placeholder="Tittel" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder="Beskrivelse" value={description} onChange={(e) => setDescription(e.target.value)} />
            <Button
              onClick={() =>
                run(
                  () =>
                    createWhistleblowMeasureTask({
                      caseId,
                      assigneeId: granteeId,
                      title,
                      description,
                      purpose,
                      impartialityConfirmed: confirmed,
                    }),
                  "Tiltak opprettet",
                )
              }
            >
              Opprett
            </Button>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Send til uttalelse</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send til uttalelse</DialogTitle>
              <DialogDescription>
                Lag en redigert saksfremstilling uten varslerens identitet (AML § 2 A-3, kontradiksjon).
              </DialogDescription>
            </DialogHeader>
            <GrantFormFields
              users={users}
              purpose={purpose}
              setPurpose={setPurpose}
              granteeId={granteeId}
              setGranteeId={setGranteeId}
              confirmed={confirmed}
              setConfirmed={setConfirmed}
              warnings={warnings}
            />
            <Textarea
              placeholder="Redigert beskrivelse av beskyldningen"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={6}
            />
            <Button
              onClick={() =>
                run(
                  () =>
                    sendWhistleblowStatement({
                      caseId,
                      assigneeId: granteeId,
                      summary,
                      purpose,
                      impartialityConfirmed: confirmed,
                    }),
                  "Sendt til uttalelse",
                )
              }
            >
              Send
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border p-3">
        <p className="mb-2 text-sm font-medium">Omvarslet</p>
        <div className="flex gap-2">
          <select
            className="flex-1 rounded-md border bg-transparent px-3 py-2 text-sm"
            value={partyUserId}
            onChange={(e) => setPartyUserId(e.target.value)}
          >
            <option value="">Velg person som omvarslet</option>
            {users.map((u) => (
              <option key={u.user.id} value={u.user.id}>
                {u.user.name || u.user.email}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              run(
                () => addWhistleblowParty({ caseId, role: "ACCUSED", userId: partyUserId }),
                "Omvarslet registrert",
              )
            }
          >
            Legg til
          </Button>
        </div>
      </div>

      <div className="rounded-md border p-3">
        <p className="mb-2 text-sm font-medium">Aktive tilganger</p>
        {grants.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen tildelinger</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {grants.map((grant) => (
              <li key={grant.id} className="flex items-center justify-between gap-2">
                <span>
                  {grant.type} · utløper {new Date(grant.expiresAt).toLocaleDateString("nb-NO")}
                </span>
                <Button size="sm" variant="ghost" onClick={() => run(() => revokeWhistleblowGrant(grant.id), "Tilgang trukket")}>
                  Trekk tilbake
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-md border p-3">
        <p className="mb-2 text-sm font-medium">GDPR-innsyn (POL § 16)</p>
        <p className="mb-2 text-xs text-muted-foreground">
          Systemet sender aldri ut hele saken automatisk. Dokumenter vurderingen før eventuell utlevering.
        </p>
        <Textarea
          placeholder="Begrunnelse for å holde tilbake eller utlevere identitet"
          value={gdprRationale}
          onChange={(e) => setGdprRationale(e.target.value)}
        />
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              run(
                () =>
                  recordGdprAccessAssessment({
                    caseId,
                    decision: "WITHHOLD",
                    legalBasis: "POL § 16",
                    rationale: gdprRationale,
                  }),
                "Vurdering lagret",
              )
            }
          >
            Hold tilbake
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              run(
                () =>
                  recordGdprAccessAssessment({
                    caseId,
                    decision: "DISCLOSE",
                    legalBasis: "POL § 16 vurdert, ikke anvendt",
                    rationale: gdprRationale,
                  }),
                "Vurdering lagret",
              )
            }
          >
            Utlever
          </Button>
        </div>
      </div>

      {breakGlass.length > 0 && (
        <div className="rounded-md border border-red-200 p-3">
          <p className="mb-2 text-sm font-medium">Nødinnsyn fra support</p>
          {breakGlass.map((row) => (
            <div key={row.id} className="mb-2 flex items-center justify-between gap-2 text-sm">
              <span>{row.requesterName}</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => run(() => decideBreakGlassRequest({ requestId: row.id, approve: true, whistleblowingId: caseId }), "Godkjent")}>
                  Godkjenn
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => run(() => decideBreakGlassRequest({ requestId: row.id, approve: false }), "Avslått")}
                >
                  Avslå
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
