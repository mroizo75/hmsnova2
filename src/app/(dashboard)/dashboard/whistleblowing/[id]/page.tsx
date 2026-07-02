"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Shield,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  User,
  MapPin,
  Calendar,
  AlertTriangle,
  ClipboardList,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Info,
} from "lucide-react";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { nb } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type WhistleblowStatus =
  | "RECEIVED"
  | "ACKNOWLEDGED"
  | "UNDER_INVESTIGATION"
  | "ACTION_TAKEN"
  | "RESOLVED"
  | "CLOSED"
  | "DISMISSED";

type WhistleblowSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type WhistleblowCategory =
  | "HARASSMENT"
  | "DISCRIMINATION"
  | "WORK_ENVIRONMENT"
  | "SAFETY"
  | "CORRUPTION"
  | "ETHICS"
  | "LEGAL"
  | "OTHER";
type MessageSender = "REPORTER" | "HANDLER" | "SYSTEM";

interface TenantUser {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface CaseAction {
  id: string;
  description: string;
  createdAt: string;
  completedAt?: string;
}

interface WhistleblowCase {
  id: string;
  caseNumber: string;
  category: WhistleblowCategory;
  title: string;
  description: string;
  occurredAt?: string;
  location?: string;
  involvedPersons?: string;
  witnesses?: string;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  isAnonymous: boolean;
  status: WhistleblowStatus;
  severity: WhistleblowSeverity;
  handledBy?: string;
  assignedTo?: string;
  investigationNotes?: string;
  actions?: string;
  outcome?: string;
  closedReason?: string;
  receivedAt: string;
  acknowledgedAt?: string;
  investigatedAt?: string;
  closedAt?: string;
  messages: Message[];
}

interface Message {
  id: string;
  sender: MessageSender;
  senderUserId?: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
}

// --- Badges ---

function getStatusBadge(status: WhistleblowStatus) {
  const map: Record<WhistleblowStatus, JSX.Element> = {
    RECEIVED: <Badge variant="secondary">Mottatt</Badge>,
    ACKNOWLEDGED: <Badge className="bg-blue-500 hover:bg-blue-500">Bekreftet</Badge>,
    UNDER_INVESTIGATION: (
      <Badge className="bg-purple-500 hover:bg-purple-500">Under behandling</Badge>
    ),
    ACTION_TAKEN: <Badge className="bg-yellow-500 hover:bg-yellow-500">Tiltak iverksatt</Badge>,
    RESOLVED: <Badge className="bg-green-600 hover:bg-green-600">Avsluttet</Badge>,
    CLOSED: <Badge variant="outline">Avsluttet</Badge>,
    DISMISSED: <Badge variant="destructive">Henlagt</Badge>,
  };
  return map[status];
}

function getSeverityBadge(severity: WhistleblowSeverity) {
  const map: Record<WhistleblowSeverity, JSX.Element> = {
    LOW: <Badge variant="outline">Lav</Badge>,
    MEDIUM: <Badge className="bg-yellow-500 hover:bg-yellow-500">Medium</Badge>,
    HIGH: <Badge className="bg-orange-500 hover:bg-orange-500">Høy</Badge>,
    CRITICAL: <Badge variant="destructive">Kritisk</Badge>,
  };
  return map[severity];
}

const CATEGORY_LABELS: Record<WhistleblowCategory, string> = {
  HARASSMENT: "Trakassering",
  DISCRIMINATION: "Diskriminering",
  WORK_ENVIRONMENT: "Arbeidsmiljø",
  SAFETY: "HMS/Sikkerhet",
  CORRUPTION: "Korrupsjon",
  ETHICS: "Etikk",
  LEGAL: "Lovbrudd",
  OTHER: "Annet",
};

// --- Behandlingsrutine (AML kap. 2 A, særlig § 2A-3) ---
// Varslerloven § 2A-3: Arbeidsgiver skal sørge for forsvarlig behandling.
// Intern frist: bekreft mottak innen rimelig tid (praksis: 7 dager).

interface ProsessSteg {
  id: WhistleblowStatus;
  label: string;
  description: string;
  legalRef: string;
  daysLimit?: number; // fra mottatt
}

const PROSESS_STEG: ProsessSteg[] = [
  {
    id: "RECEIVED",
    label: "1. Mottatt",
    description: "Varselet er registrert. Saksbehandler skal utpekes og varsler skal informeres.",
    legalRef: "AML § 2A-3 (1)",
  },
  {
    id: "ACKNOWLEDGED",
    label: "2. Mottatt bekreftet",
    description:
      "Bekreft mottaket til varsler. Arbeidsgiver skal bekrefte mottak og informere om videre prosess.",
    legalRef: "AML § 2A-3 (2)",
    daysLimit: 7,
  },
  {
    id: "UNDER_INVESTIGATION",
    label: "3. Under behandling",
    description:
      "Gjennomfør nødvendig undersøkelse. Saken skal behandles forsvarlig og konfidensielt. Involverte parter skal gis mulighet til kontradiksjon.",
    legalRef: "AML § 2A-3 (3)",
  },
  {
    id: "ACTION_TAKEN",
    label: "4. Tiltak iverksatt",
    description:
      "Tiltak er besluttet og iverksatt. Dokumenter alle tiltak som er gjennomført.",
    legalRef: "AML § 2A-3 (4)",
  },
  {
    id: "RESOLVED",
    label: "5. Avsluttet",
    description:
      "Saken er ferdigbehandlet. Varsler skal informeres om utfallet i den grad det er mulig. Dokumenter begrunnelsen.",
    legalRef: "AML § 2A-3 (5)",
  },
];

function BehandlingsrutineCard({
  caseData,
  onStatusChange,
}: {
  caseData: WhistleblowCase;
  onStatusChange: (status: WhistleblowStatus) => void;
}) {
  const activeIndex = PROSESS_STEG.findIndex((s) => s.id === caseData.status);
  const daysSinceReceived = differenceInDays(new Date(), new Date(caseData.receivedAt));
  const isDismissed = caseData.status === "DISMISSED" || caseData.status === "CLOSED";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Behandlingsrutine
        </CardTitle>
        <CardDescription>
          Basert på Varslerloven (AML kap. 2 A, § 2A-3). Følg stegene for forsvarlig
          saksbehandling.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fristadvarsel: bekreftelse innen 7 dager */}
        {!caseData.acknowledgedAt && daysSinceReceived >= 5 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Frist nærmer seg</AlertTitle>
            <AlertDescription>
              Saken er {daysSinceReceived} dager gammel. Varsler bør bekrefte mottaket innen 7
              dager (AML § 2A-3). Endre status til «Bekreftet» og send en bekreftelsesmelding til
              varsler.
            </AlertDescription>
          </Alert>
        )}

        {isDismissed && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Saken er avsluttet/henlagt</AlertTitle>
            <AlertDescription>
              Saken er ferdigbehandlet. Dokumentasjon oppbevares i henhold til GDPR og
              Arbeidsmiljølovens krav.
            </AlertDescription>
          </Alert>
        )}

        {/* Steg-liste */}
        <div className="space-y-3">
          {PROSESS_STEG.map((steg, i) => {
            const isPast = i < activeIndex && !isDismissed;
            const isActive = steg.id === caseData.status && !isDismissed;
            const isFuture = i > activeIndex && !isDismissed;

            return (
              <div
                key={steg.id}
                className={`rounded-lg border p-4 transition-colors ${
                  isActive
                    ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950"
                    : isPast
                    ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                    : "border-border bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isPast
                          ? "bg-green-500 text-white"
                          : isActive
                          ? "bg-blue-500 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          isFuture ? "text-muted-foreground" : ""
                        }`}
                      >
                        {steg.label}
                        {steg.daysLimit && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            (maks {steg.daysLimit} dager)
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{steg.description}</p>
                      <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                        {steg.legalRef}
                      </p>
                    </div>
                  </div>

                  {/* Knapp for å gå videre til neste steg */}
                  {isActive && i < PROSESS_STEG.length - 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-shrink-0"
                      onClick={() => onStatusChange(PROSESS_STEG[i + 1].id)}
                    >
                      Neste steg →
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Inline-redigerbar tekstblokk ---
function EditableTextField({
  label,
  value,
  placeholder,
  onSave,
  rows = 4,
}: {
  label: string;
  value?: string;
  placeholder: string;
  onSave: (val: string) => void;
  rows?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value ?? "");
    setEditing(false);
  };

  if (!editing) {
    return (
      <div>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-semibold">{label}</h3>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Edit2 className="mr-1 h-3 w-3" />
            Rediger
          </Button>
        </div>
        {value ? (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{value}</p>
        ) : (
          <p className="text-sm italic text-muted-foreground">{placeholder}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        autoFocus
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave}>
          <Save className="mr-1 h-3 w-3" />
          Lagre
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel}>
          <X className="mr-1 h-3 w-3" />
          Avbryt
        </Button>
      </div>
    </div>
  );
}

// --- Tiltaksliste ---
function ActionsList({
  actions,
  onAdd,
  onToggle,
  onRemove,
}: {
  actions: CaseAction[];
  onAdd: (description: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [newAction, setNewAction] = useState("");

  const handleAdd = () => {
    if (!newAction.trim()) return;
    onAdd(newAction.trim());
    setNewAction("");
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Tiltak og oppfølging</h3>
      <p className="text-xs text-muted-foreground">
        Dokumenter alle tiltak som er besluttet og iverksatt (AML § 2A-3 (4)).
      </p>

      {actions.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">Ingen tiltak registrert ennå.</p>
      ) : (
        <div className="space-y-2">
          {actions.map((action) => (
            <div
              key={action.id}
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                action.completedAt ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950" : "bg-muted/30"
              }`}
            >
              <button
                onClick={() => onToggle(action.id)}
                className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
                  action.completedAt
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-border bg-background"
                }`}
              >
                {action.completedAt && <CheckCircle2 className="h-3 w-3" />}
              </button>
              <div className="flex-1">
                <p
                  className={`text-sm ${
                    action.completedAt ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  {action.description}
                </p>
                {action.completedAt && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Fullført {format(new Date(action.completedAt), "dd. MMM yyyy", { locale: nb })}
                  </p>
                )}
              </div>
              <button
                onClick={() => onRemove(action.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={newAction}
          onChange={(e) => setNewAction(e.target.value)}
          placeholder="Beskriv tiltaket..."
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button size="sm" onClick={handleAdd} disabled={!newAction.trim()}>
          <Plus className="mr-1 h-4 w-4" />
          Legg til
        </Button>
      </div>
    </div>
  );
}

// --- Lukke-modal ---
function CloseSection({
  status,
  closedReason,
  outcome,
  onClose,
}: {
  status: WhistleblowStatus;
  closedReason?: string;
  outcome?: string;
  onClose: (status: WhistleblowStatus, reason: string, outcome: string) => void;
}) {
  const [reason, setReason] = useState(closedReason ?? "");
  const [outcomeText, setOutcomeText] = useState(outcome ?? "");
  const [open, setOpen] = useState(false);

  const isAlreadyClosed =
    status === "RESOLVED" || status === "CLOSED" || status === "DISMISSED";

  if (isAlreadyClosed) {
    return (
      <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm font-semibold">Saken er avsluttet</p>
        {outcome && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Utfall</p>
            <p className="mt-0.5 text-sm">{outcome}</p>
          </div>
        )}
        {closedReason && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Avslutningstekst</p>
            <p className="mt-0.5 text-sm">{closedReason}</p>
          </div>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setOpen(true); }}
          className="border-green-300 text-green-700 hover:bg-green-50"
        >
          <CheckCircle2 className="mr-1 h-4 w-4" />
          Avslutt sak
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setOpen(true); }}
          className="border-red-300 text-red-700 hover:bg-red-50"
        >
          <X className="mr-1 h-4 w-4" />
          Henlegg sak
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-2">
        <Label>Utfall (vises til varsler)</Label>
        <Textarea
          value={outcomeText}
          onChange={(e) => setOutcomeText(e.target.value)}
          placeholder="Beskriv resultatet av behandlingen..."
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label>Intern avslutningstekst</Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Intern begrunnelse for avslutning..."
          rows={2}
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onClose("RESOLVED", reason, outcomeText)}
        >
          <CheckCircle2 className="mr-1 h-4 w-4" />
          Avslutt som løst
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onClose("DISMISSED", reason, outcomeText)}
        >
          <X className="mr-1 h-4 w-4" />
          Henlegg
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Avbryt
        </Button>
      </div>
    </div>
  );
}

// --- Hovedkomponent ---

export default function WhistleblowingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [caseData, setCaseData] = useState<WhistleblowCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [isInternalMessage, setIsInternalMessage] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [savingField, setSavingField] = useState(false);

  useEffect(() => {
    fetchCase();
  }, [params.id]);

  useEffect(() => {
    if (!session?.user?.tenantId) return;
    fetch(`/api/tenants/${session.user.tenantId}/users`)
      .then((r) => r.json())
      .then((data) => {
        if (data.users) setUsers(data.users);
      })
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, [session?.user?.tenantId]);

  const fetchCase = async () => {
    try {
      const response = await fetch(`/api/admin/whistleblowing/${params.id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kunne ikke hente sak");
      setCaseData(data.data);
    } catch (error: any) {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
      router.push("/dashboard/whistleblowing");
    } finally {
      setLoading(false);
    }
  };

  const patchCase = async (payload: Record<string, unknown>) => {
    setSavingField(true);
    try {
      const response = await fetch(`/api/admin/whistleblowing/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kunne ikke lagre");
      setCaseData(data.data);
      return true;
    } catch (error: any) {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
      return false;
    } finally {
      setSavingField(false);
    }
  };

  const updateStatus = async (newStatus: WhistleblowStatus) => {
    const ok = await patchCase({ status: newStatus });
    if (ok) {
      toast({ title: "Status oppdatert", description: `Status er satt til: ${newStatus}` });
    }
  };

  const updateSeverity = async (newSeverity: WhistleblowSeverity) => {
    await patchCase({ severity: newSeverity });
    toast({ title: "Alvorlighet oppdatert" });
  };

  const updateAssignedTo = async (userId: string) => {
    const actualUserId = userId === "NONE" ? null : userId;
    const ok = await patchCase({ assignedTo: actualUserId });
    if (ok) {
      toast({
        title: actualUserId ? "Sak tildelt" : "Tildeling fjernet",
        description: actualUserId
          ? "Saksbehandler er varslet."
          : "Saken har ikke lenger en tildelt saksbehandler.",
      });
    }
  };

  const saveInvestigationNotes = async (notes: string) => {
    await patchCase({ investigationNotes: notes });
    toast({ title: "Notater lagret" });
  };

  const saveOutcome = async (outcome: string) => {
    await patchCase({ outcome });
    toast({ title: "Utfall lagret" });
  };

  const closeCase = async (status: WhistleblowStatus, reason: string, outcome: string) => {
    await patchCase({ status, closedReason: reason, outcome });
    toast({ title: status === "DISMISSED" ? "Sak henlagt" : "Sak avsluttet" });
  };

  // Tiltak (actions) er lagret som JSON-streng i DB
  const parsedActions: CaseAction[] = (() => {
    if (!caseData?.actions) return [];
    try {
      return JSON.parse(caseData.actions);
    } catch {
      return [];
    }
  })();

  const saveActions = async (actions: CaseAction[]) => {
    await patchCase({ actions });
  };

  const addAction = async (description: string) => {
    const newAction: CaseAction = {
      id: `${Date.now()}`,
      description,
      createdAt: new Date().toISOString(),
    };
    const updated = [...parsedActions, newAction];
    await saveActions(updated);
    toast({ title: "Tiltak lagt til" });
  };

  const toggleAction = async (id: string) => {
    const updated = parsedActions.map((a) =>
      a.id === id
        ? { ...a, completedAt: a.completedAt ? undefined : new Date().toISOString() }
        : a
    );
    await saveActions(updated);
  };

  const removeAction = async (id: string) => {
    const updated = parsedActions.filter((a) => a.id !== id);
    await saveActions(updated);
    toast({ title: "Tiltak fjernet" });
  };

  const sendMessage = async () => {
    if (!messageText.trim()) return;
    setSendingMessage(true);
    try {
      const response = await fetch(`/api/admin/whistleblowing/${params.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, isInternal: isInternalMessage }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kunne ikke sende melding");
      toast({
        title: "Melding sendt",
        description: isInternalMessage ? "Intern notat lagt til" : "Melding sendt til varsler",
      });
      setMessageText("");
      setIsInternalMessage(false);
      fetchCase();
    } catch (error: any) {
      toast({ title: "Feil", description: error.message, variant: "destructive" });
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Laster sak...</p>
      </div>
    );
  }

  if (!caseData) return null;

  const daysSinceReceived = differenceInDays(new Date(), new Date(caseData.receivedAt));
  const assignedUser = users.find((u) => u.user.id === caseData.assignedTo);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/whistleblowing">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{caseData.title}</h1>
            <p className="text-sm text-muted-foreground">
              Saksnummer: <span className="font-mono font-semibold">{caseData.caseNumber}</span>
              {" · "}
              Mottatt for {daysSinceReceived} {daysSinceReceived === 1 ? "dag" : "dager"} siden
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getSeverityBadge(caseData.severity)}
          {getStatusBadge(caseData.status)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Venstre kolonne */}
        <div className="space-y-6 lg:col-span-2">
          {/* Behandlingsrutine (AML § 2A-3) */}
          <BehandlingsrutineCard caseData={caseData} onStatusChange={updateStatus} />

          {/* Saksdetaljer */}
          <Card>
            <CardHeader>
              <CardTitle>Innmeldt saksdetaljer</CardTitle>
              <CardDescription>
                Kategori: {CATEGORY_LABELS[caseData.category]}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="mb-1 font-semibold">Beskrivelse</h3>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {caseData.description}
                </p>
              </div>

              {(caseData.occurredAt || caseData.location) && (
                <>
                  <Separator />
                  <div className="grid gap-4 md:grid-cols-2">
                    {caseData.occurredAt && (
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Når</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(caseData.occurredAt), "dd. MMMM yyyy HH:mm", {
                              locale: nb,
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                    {caseData.location && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Sted</p>
                          <p className="text-sm text-muted-foreground">{caseData.location}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {caseData.involvedPersons && (
                <>
                  <Separator />
                  <div>
                    <h3 className="mb-1 font-semibold">Involverte personer</h3>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {caseData.involvedPersons}
                    </p>
                  </div>
                </>
              )}

              {caseData.witnesses && (
                <>
                  <Separator />
                  <div>
                    <h3 className="mb-1 font-semibold">Vitner</h3>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {caseData.witnesses}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Saksbehandlingsnotater */}
          <Card>
            <CardHeader>
              <CardTitle>Intern saksbehandling</CardTitle>
              <CardDescription>
                Interne notater og dokumentasjon (ikke synlig for varsler)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <EditableTextField
                label="Etterforskningsnotater"
                value={caseData.investigationNotes}
                placeholder="Legg til notater om undersøkelsen, funn og vurderinger..."
                onSave={saveInvestigationNotes}
                rows={5}
              />

              <Separator />

              <ActionsList
                actions={parsedActions}
                onAdd={addAction}
                onToggle={toggleAction}
                onRemove={removeAction}
              />

              <Separator />

              <EditableTextField
                label="Utfall (kan kommuniseres til varsler)"
                value={caseData.outcome}
                placeholder="Beskriv resultatet av behandlingen..."
                onSave={saveOutcome}
                rows={3}
              />

              <Separator />

              {/* Avslutte sak */}
              <div>
                <h3 className="mb-2 font-semibold">Avslutt sak</h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Varsler skal informeres om utfallet i den grad det er mulig (AML § 2A-3).
                </p>
                <CloseSection
                  status={caseData.status}
                  closedReason={caseData.closedReason}
                  outcome={caseData.outcome}
                  onClose={closeCase}
                />
              </div>
            </CardContent>
          </Card>

          {/* Kommunikasjon */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Kommunikasjon
              </CardTitle>
              <CardDescription>
                Meldinger til/fra varsler og interne notater
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {caseData.messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">Ingen meldinger ennå</p>
              ) : (
                <div className="space-y-3">
                  {caseData.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-lg p-4 ${
                        message.isInternal
                          ? "border-2 border-dashed border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950"
                          : message.sender === "REPORTER"
                          ? "bg-blue-50 dark:bg-blue-950"
                          : "bg-muted/50"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {message.sender === "REPORTER"
                              ? "Varsler"
                              : message.sender === "HANDLER"
                              ? "Saksbehandler"
                              : "System"}
                          </Badge>
                          {message.isInternal && (
                            <Badge className="bg-yellow-500 hover:bg-yellow-500">Intern</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(message.createdAt), "dd. MMM yyyy HH:mm", {
                            locale: nb,
                          })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{message.message}</p>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <Label htmlFor="message">Ny melding</Label>
                <Textarea
                  id="message"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Skriv en melding til varsler eller et internt notat..."
                  rows={4}
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isInternalMessage}
                      onChange={(e) => setIsInternalMessage(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    Intern notat (ikke synlig for varsler)
                  </label>
                  <Button onClick={sendMessage} disabled={sendingMessage || !messageText.trim()}>
                    <Send className="mr-2 h-4 w-4" />
                    {sendingMessage ? "Sender..." : isInternalMessage ? "Lagre notat" : "Send til varsler"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Høyre sidebar */}
        <div className="space-y-6">
          {/* Varsler */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Varsler
              </CardTitle>
            </CardHeader>
            <CardContent>
              {caseData.isAnonymous ? (
                <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Anonym varsling</span>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  {caseData.reporterName && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{caseData.reporterName}</span>
                    </div>
                  )}
                  {caseData.reporterEmail && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">E-post</p>
                      <p>{caseData.reporterEmail}</p>
                    </div>
                  )}
                  {caseData.reporterPhone && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Telefon</p>
                      <p>{caseData.reporterPhone}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saksbehandling */}
          <Card>
            <CardHeader>
              <CardTitle>Administrasjon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={caseData.status}
                  onValueChange={(v) => updateStatus(v as WhistleblowStatus)}
                  disabled={savingField}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RECEIVED">Mottatt</SelectItem>
                    <SelectItem value="ACKNOWLEDGED">Bekreftet</SelectItem>
                    <SelectItem value="UNDER_INVESTIGATION">Under behandling</SelectItem>
                    <SelectItem value="ACTION_TAKEN">Tiltak iverksatt</SelectItem>
                    <SelectItem value="RESOLVED">Løst</SelectItem>
                    <SelectItem value="CLOSED">Avsluttet</SelectItem>
                    <SelectItem value="DISMISSED">Henlagt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Alvorlighetsgrad</Label>
                <Select
                  value={caseData.severity}
                  onValueChange={(v) => updateSeverity(v as WhistleblowSeverity)}
                  disabled={savingField}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Lav</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">Høy</SelectItem>
                    <SelectItem value="CRITICAL">Kritisk</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ansvarlig saksbehandler</Label>
                <Select
                  value={caseData.assignedTo || "NONE"}
                  onValueChange={updateAssignedTo}
                  disabled={loadingUsers || savingField}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingUsers ? "Laster..." : "Velg saksbehandler"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Ingen tildelt</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.user.id} value={u.user.id}>
                        {u.user.name || u.user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {assignedUser && (
                  <p className="text-xs text-muted-foreground">
                    Tildelt: {assignedUser.user.name || assignedUser.user.email}
                  </p>
                )}
              </div>

              <Separator />

              {/* Tidslinje */}
              <div className="space-y-2 text-sm">
                <p className="font-medium text-muted-foreground">Tidslinje</p>

                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium">Mottatt</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(caseData.receivedAt), "dd. MMM yyyy HH:mm", { locale: nb })}
                    </p>
                  </div>
                </div>

                {caseData.acknowledgedAt ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                    <div>
                      <p className="text-xs font-medium">Bekreftet</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(caseData.acknowledgedAt), "dd. MMM yyyy HH:mm", {
                          locale: nb,
                        })}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={`h-3.5 w-3.5 ${
                        daysSinceReceived >= 5 ? "text-red-500" : "text-yellow-500"
                      }`}
                    />
                    <p className="text-xs text-muted-foreground">
                      Ikke bekreftet ennå
                      {daysSinceReceived >= 5 && (
                        <span className="ml-1 font-medium text-red-600">(frist nærmer seg)</span>
                      )}
                    </p>
                  </div>
                )}

                {caseData.investigatedAt && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-purple-500" />
                    <div>
                      <p className="text-xs font-medium">Behandling startet</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(caseData.investigatedAt), "dd. MMM yyyy HH:mm", {
                          locale: nb,
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {caseData.closedAt && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    <div>
                      <p className="text-xs font-medium">Avsluttet</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(caseData.closedAt), "dd. MMM yyyy HH:mm", { locale: nb })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Juridisk referanse */}
          <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Lovpålagte krav</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>
                <span className="font-semibold">AML § 2A-1:</span> Rett til å varsle om
                kritikkverdige forhold.
              </p>
              <p>
                <span className="font-semibold">AML § 2A-3:</span> Arbeidsgiver plikter forsvarlig
                og konfidensiell behandling.
              </p>
              <p>
                <span className="font-semibold">AML § 2A-4:</span> Forbud mot gjengjeldelse mot
                varsler.
              </p>
              <p>
                <span className="font-semibold">AML § 2A-6:</span> Arbeidsgiver skal sørge for
                rutiner for intern varsling.
              </p>
              <Separator />
              <p className="text-xs">
                Bekreft mottaket innen 7 dager. All behandling skal dokumenteres.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
