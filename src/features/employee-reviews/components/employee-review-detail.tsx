"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  PenLine,
  Plus,
  Save,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { EmployeeReviewStatusBadge } from "./employee-review-status-badge";
import {
  updateEmployeeReview,
  signEmployeeReview,
  markEmployeeReviewCompleted,
  deleteEmployeeReview,
  upsertEmployeeReviewGoals,
  upsertEmployeeReviewActions,
} from "@/server/actions/employee-review.actions";
import type {
  EmployeeReview,
  EmployeeReviewGoal,
  EmployeeReviewAction,
  PsykososialtNiva,
  EmployeeReviewGoalCategory,
  EmployeeReviewGoalStatus,
} from "@prisma/client";

// ─── Typer ───────────────────────────────────────────────────────────────────

type ReviewWithRelations = EmployeeReview & {
  employee: { id: string; name: string | null; email: string; image: string | null };
  reviewer: { id: string; name: string | null; email: string; image: string | null };
  goals: EmployeeReviewGoal[];
  actions: EmployeeReviewAction[];
};

interface EmployeeReviewDetailProps {
  review: ReviewWithRelations;
  currentUserId: string;
  canConduct: boolean;
  canDelete: boolean;
}

// ─── Konstanter ──────────────────────────────────────────────────────────────

const SCORE_LABELS: Record<number, string> = {
  1: "Svært misfornøyd",
  2: "Misfornøyd",
  3: "Nøytral",
  4: "Fornøyd",
  5: "Svært fornøyd",
};

const PSYK_LABELS: Record<PsykososialtNiva, string> = {
  FORSVARLIG: "Fullt forsvarlig",
  DELVIS_FORSVARLIG: "Delvis forsvarlig – krever oppfølging",
  IKKE_FORSVARLIG: "Ikke forsvarlig – tiltak påkrevd",
};

const PSYK_COLORS: Record<PsykososialtNiva, string> = {
  FORSVARLIG: "text-green-700 bg-green-50 border-green-200",
  DELVIS_FORSVARLIG: "text-yellow-700 bg-yellow-50 border-yellow-200",
  IKKE_FORSVARLIG: "text-red-700 bg-red-50 border-red-200",
};

const GOAL_CATEGORY_LABELS: Record<EmployeeReviewGoalCategory, string> = {
  FAGLIG: "Faglig utvikling",
  PERSONLIG: "Personlig utvikling",
  VIRKSOMHET: "Virksomhetsmål",
};

const GOAL_STATUS_LABELS: Record<EmployeeReviewGoalStatus, string> = {
  IKKE_STARTET: "Ikke startet",
  PAGAENDE: "Pågående",
  OPPNADD: "Oppnådd",
  IKKE_OPPNADD: "Ikke oppnådd",
};

// ─── Hjelpefunksjon: Score-velger ────────────────────────────────────────────

function ScoreSelector({
  value,
  onChange,
  disabled,
}: {
  value: number | null | undefined;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className={`w-10 h-10 rounded-full border-2 font-semibold text-sm transition-colors ${
            value === n
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted bg-background text-muted-foreground hover:border-primary/50"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={SCORE_LABELS[n]}
        >
          {n}
        </button>
      ))}
      {value !== null && value !== undefined && (
        <span className="self-center text-sm text-muted-foreground">
          {SCORE_LABELS[value]}
        </span>
      )}
    </div>
  );
}

// ─── Psykososial velger ──────────────────────────────────────────────────────

function PsykSelector({
  value,
  onChange,
  disabled,
}: {
  value: PsykososialtNiva | null | undefined;
  onChange: (v: PsykososialtNiva) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      {(["FORSVARLIG", "DELVIS_FORSVARLIG", "IKKE_FORSVARLIG"] as PsykososialtNiva[]).map(
        (niva) => (
          <button
            key={niva}
            type="button"
            disabled={disabled}
            onClick={() => onChange(niva)}
            className={`px-3 py-2 rounded-md border text-sm font-medium text-left transition-colors ${
              value === niva
                ? PSYK_COLORS[niva] + " border-2"
                : "border-muted bg-background text-muted-foreground hover:border-muted-foreground/40"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {PSYK_LABELS[niva]}
          </button>
        )
      )}
    </div>
  );
}

// ─── Hovedkomponent ──────────────────────────────────────────────────────────

export function EmployeeReviewDetail({
  review: initialReview,
  currentUserId,
  canConduct,
  canDelete,
}: EmployeeReviewDetailProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [review, setReview] = useState(initialReview);

  const isEmployee = review.employeeId === currentUserId;
  const isReviewer = review.reviewerId === currentUserId;
  const isLocked = review.status === "SIGNERT" || review.status === "AVBRUTT";

  // ─── Lokalt draft-state ──────────────────────────────────────────────────

  const [forberedelse, setForberedelse] = useState({
    ansattForberedelse: review.ansattForberedelse ?? "",
    ansattMedvirkning: review.ansattMedvirkning ?? "",
  });

  const [arbeidssituasjon, setArbeidssituasjon] = useState({
    trivselScore: review.trivselScore,
    arbeidsmiljoeScore: review.arbeidsmiljoeScore,
    samarbeidScore: review.samarbeidScore,
    psykKravOgForventninger: review.psykKravOgForventninger,
    psykEmosjonelleKrav: review.psykEmosjonelleKrav,
    psykArbeidsmengde: review.psykArbeidsmengde,
    psykStotteOgHjelp: review.psykStotteOgHjelp,
    psykKommentar: review.psykKommentar ?? "",
  });

  const [malKompetensar, setMalKompetensar] = useState({
    maloppnaelseKommentar: review.maloppnaelseKommentar ?? "",
    kompetanseKommentar: review.kompetanseKommentar ?? "",
    opplaeringsOnske: review.opplaeringsOnske ?? "",
    karrierePlaner: review.karrierePlaner ?? "",
  });

  const [tilrettelegging, setTilrettelegging] = useState({
    tilretteleggingBehov: review.tilretteleggingBehov ?? "",
    arbeidstidKommentar: review.arbeidstidKommentar ?? "",
    lederTilbakemeldingTilAnsatt: review.lederTilbakemeldingTilAnsatt ?? "",
    ansattTilbakemeldingTilLeder: review.ansattTilbakemeldingTilLeder ?? "",
    oppsummeringKommentar: review.oppsummeringKommentar ?? "",
  });

  const [goals, setGoals] = useState<
    { id?: string; description: string; category: EmployeeReviewGoalCategory; status: EmployeeReviewGoalStatus; deadline: string; note: string; overfortTilNeste: boolean }[]
  >(
    review.goals.map((g) => ({
      id: g.id,
      description: g.description,
      category: g.category,
      status: g.status,
      deadline: g.deadline ? new Date(g.deadline).toISOString().split("T")[0] : "",
      note: g.note ?? "",
      overfortTilNeste: g.overfortTilNeste,
    }))
  );

  const [actions, setActions] = useState<
    { id?: string; description: string; ansvarlig: string; dueDate: string; completed: boolean; note: string }[]
  >(
    review.actions.map((a) => ({
      id: a.id,
      description: a.description,
      ansvarlig: a.ansvarlig ?? "",
      dueDate: a.dueDate ? new Date(a.dueDate).toISOString().split("T")[0] : "",
      completed: a.completed,
      note: a.note ?? "",
    }))
  );

  // ─── Lagre-handlinger ────────────────────────────────────────────────────

  function save(section: string, data: Record<string, unknown>) {
    startTransition(async () => {
      const result = await updateEmployeeReview(review.id, data as Parameters<typeof updateEmployeeReview>[1]);
      if (result.success) {
        toast({ title: `${section} lagret` });
      } else {
        toast({ title: "Feil", description: result.error, variant: "destructive" });
      }
    });
  }

  function saveGoals() {
    startTransition(async () => {
      const result = await upsertEmployeeReviewGoals(
        review.id,
        goals.map((g) => ({
          ...g,
          deadline: g.deadline ? new Date(g.deadline) : null,
          note: g.note || null,
        }))
      );
      if (result.success) {
        toast({ title: "Mål lagret" });
      } else {
        toast({ title: "Feil", description: result.error, variant: "destructive" });
      }
    });
  }

  function saveActions() {
    startTransition(async () => {
      const result = await upsertEmployeeReviewActions(
        review.id,
        actions.map((a) => ({
          ...a,
          ansvarlig: (a.ansvarlig as "LEDER" | "ANSATT" | "BEGGE" | undefined) || null,
          dueDate: a.dueDate ? new Date(a.dueDate) : null,
          note: a.note || null,
        }))
      );
      if (result.success) {
        toast({ title: "Tiltak lagret" });
      } else {
        toast({ title: "Feil", description: result.error, variant: "destructive" });
      }
    });
  }

  function handleSign(rolle: "LEDER" | "ANSATT") {
    startTransition(async () => {
      const result = await signEmployeeReview(review.id, rolle);
      if (result.success) {
        toast({ title: "Signert" });
        router.refresh();
      } else {
        toast({ title: "Feil", description: result.error, variant: "destructive" });
      }
    });
  }

  function handleMarkCompleted() {
    startTransition(async () => {
      const result = await markEmployeeReviewCompleted(review.id);
      if (result.success) {
        toast({ title: "Markert som gjennomført" });
        router.refresh();
      } else {
        toast({ title: "Feil", description: result.error, variant: "destructive" });
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteEmployeeReview(review.id);
      if (result.success) {
        toast({ title: "Samtale slettet" });
        router.push("/dashboard/medarbeidersamtale");
      } else {
        toast({ title: "Feil", description: result.error, variant: "destructive" });
      }
    });
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header-info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-semibold">
                  {review.employee.name ?? review.employee.email}
                </h2>
                <EmployeeReviewStatusBadge status={review.status} />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(review.scheduledDate), "d. MMMM yyyy", { locale: nb })}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  Leder: {review.reviewer.name ?? review.reviewer.email}
                </span>
                {review.nextReviewDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Neste samtale:{" "}
                    {format(new Date(review.nextReviewDate), "d. MMMM yyyy", {
                      locale: nb,
                    })}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {/* Merk som gjennomført */}
              {canConduct && review.status === "FORBEREDT" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkCompleted}
                  disabled={isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Marker gjennomført
                </Button>
              )}
              {canConduct && review.status === "PLANLAGT" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkCompleted}
                  disabled={isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Marker gjennomført
                </Button>
              )}

              {/* Signering */}
              {review.status === "GJENNOMFORT" && (
                <>
                  {isEmployee && !review.signertAvAnsatt && (
                    <Button
                      size="sm"
                      onClick={() => handleSign("ANSATT")}
                      disabled={isPending}
                    >
                      <PenLine className="h-4 w-4 mr-1" />
                      Signer (ansatt)
                    </Button>
                  )}
                  {(isReviewer || canConduct) && !review.signertAvLeder && (
                    <Button
                      size="sm"
                      onClick={() => handleSign("LEDER")}
                      disabled={isPending}
                    >
                      <PenLine className="h-4 w-4 mr-1" />
                      Signer (leder)
                    </Button>
                  )}
                </>
              )}

              {/* Slett */}
              {canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Slett medarbeidersamtale?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Dette vil permanent slette samtalen og alle tilhørende mål og tiltak.
                        Handlingen kan ikke angres.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Avbryt</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Slett
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          {/* Signeringsvisning */}
          {review.status === "GJENNOMFORT" && (
            <div className="mt-4 p-3 rounded-md bg-muted/50 border border-muted grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                {review.signertAvAnsatt ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                )}
                <span>
                  Ansatt:{" "}
                  {review.signertAvAnsatt && review.ansattSignertAt
                    ? format(new Date(review.ansattSignertAt), "d. MMM yyyy", { locale: nb })
                    : "Ikke signert"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {review.signertAvLeder ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                )}
                <span>
                  Leder:{" "}
                  {review.signertAvLeder && review.lederSignertAt
                    ? format(new Date(review.lederSignertAt), "d. MMM yyyy", { locale: nb })
                    : "Ikke signert"}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Faner */}
      <Tabs defaultValue="forberedelse">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="forberedelse">Forberedelse</TabsTrigger>
          <TabsTrigger value="arbeidssituasjon">Arbeidssituasjon</TabsTrigger>
          <TabsTrigger value="mal">Mål</TabsTrigger>
          <TabsTrigger value="kompetanse">Kompetanse</TabsTrigger>
          <TabsTrigger value="tilbakemelding">Tilbakemelding</TabsTrigger>
          <TabsTrigger value="tiltak">Tiltak</TabsTrigger>
        </TabsList>

        {/* ── FORBEREDELSE ── */}
        <TabsContent value="forberedelse" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                Ansattens forberedelse
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Ansatt fyller ut dette før samtalen. AML § 4-2 (2): rett til medvirkning
                i eget arbeidsmiljø.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Hva vil du ta opp i samtalen?</Label>
                <Textarea
                  className="mt-1.5"
                  rows={4}
                  disabled={isLocked || (!isEmployee && !canConduct)}
                  value={forberedelse.ansattForberedelse}
                  onChange={(e) =>
                    setForberedelse((p) => ({ ...p, ansattForberedelse: e.target.value }))
                  }
                  placeholder="Skriv inn temaer eller spørsmål du ønsker å diskutere..."
                />
              </div>
              <div>
                <Label>Din vurdering av arbeidssituasjonen</Label>
                <Textarea
                  className="mt-1.5"
                  rows={4}
                  disabled={isLocked || (!isEmployee && !canConduct)}
                  value={forberedelse.ansattMedvirkning}
                  onChange={(e) =>
                    setForberedelse((p) => ({ ...p, ansattMedvirkning: e.target.value }))
                  }
                  placeholder="Hvordan opplever du arbeidssituasjonen din? Hva fungerer bra / kan bli bedre?"
                />
              </div>
              {!isLocked && (isEmployee || canConduct) && (
                <Button
                  size="sm"
                  onClick={() => save("Forberedelse", forberedelse)}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Lagre forberedelse
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ARBEIDSSITUASJON ── */}
        <TabsContent value="arbeidssituasjon" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trivsel og arbeidsmiljø</CardTitle>
              <p className="text-sm text-muted-foreground">
                AML § 4-2: arbeidsforhold som gir mulighet for faglig og personlig utvikling
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Generell trivsel (1–5)</Label>
                <div className="mt-2">
                  <ScoreSelector
                    value={arbeidssituasjon.trivselScore}
                    onChange={(v) =>
                      setArbeidssituasjon((p) => ({ ...p, trivselScore: v }))
                    }
                    disabled={isLocked || !canConduct}
                  />
                </div>
              </div>
              <div>
                <Label>Arbeidsmiljø (1–5)</Label>
                <div className="mt-2">
                  <ScoreSelector
                    value={arbeidssituasjon.arbeidsmiljoeScore}
                    onChange={(v) =>
                      setArbeidssituasjon((p) => ({ ...p, arbeidsmiljoeScore: v }))
                    }
                    disabled={isLocked || !canConduct}
                  />
                </div>
              </div>
              <div>
                <Label>Samarbeid med kolleger og leder (1–5)</Label>
                <div className="mt-2">
                  <ScoreSelector
                    value={arbeidssituasjon.samarbeidScore}
                    onChange={(v) =>
                      setArbeidssituasjon((p) => ({ ...p, samarbeidScore: v }))
                    }
                    disabled={isLocked || !canConduct}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Psykososialt arbeidsmiljø
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                AML § 4-3 (presisert 1. jan 2026): arbeidsgiver skal vurdere disse
                faktorene systematisk
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                {
                  key: "psykKravOgForventninger" as const,
                  label: "Krav og forventninger",
                  help: "§ 4-3(2)a: Opplever ansatt uklare eller motstridende krav i arbeidet?",
                },
                {
                  key: "psykEmosjonelleKrav" as const,
                  label: "Emosjonelle krav",
                  help: "§ 4-3(2)b: Emosjonelle belastninger i arbeid med mennesker",
                },
                {
                  key: "psykArbeidsmengde" as const,
                  label: "Arbeidsmengde og tidspress",
                  help: "§ 4-3(2)c: Er det ubalanse mellom arbeidsmengde og tid til rådighet?",
                },
                {
                  key: "psykStotteOgHjelp" as const,
                  label: "Støtte og hjelp",
                  help: "§ 4-3(2)d: Opplever ansatt tilstrekkelig støtte fra leder og kolleger?",
                },
              ].map(({ key, label, help }) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <p className="text-xs text-muted-foreground mb-2">{help}</p>
                  <PsykSelector
                    value={arbeidssituasjon[key]}
                    onChange={(v) =>
                      setArbeidssituasjon((p) => ({ ...p, [key]: v }))
                    }
                    disabled={isLocked || !canConduct}
                  />
                </div>
              ))}

              <div>
                <Label>Kommentar til psykososialt arbeidsmiljø</Label>
                <Textarea
                  className="mt-1.5"
                  rows={3}
                  disabled={isLocked || !canConduct}
                  value={arbeidssituasjon.psykKommentar}
                  onChange={(e) =>
                    setArbeidssituasjon((p) => ({ ...p, psykKommentar: e.target.value }))
                  }
                  placeholder="Utdyp vurderingene her..."
                />
              </div>

              {!isLocked && canConduct && (
                <Button
                  size="sm"
                  onClick={() => save("Arbeidssituasjon", arbeidssituasjon)}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Lagre arbeidssituasjon
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── MÅL ── */}
        <TabsContent value="mal" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mål og resultatoppfølging</CardTitle>
              <p className="text-sm text-muted-foreground">
                Gjennomgang av forrige periodes mål og fastsettelse av nye. AML § 4-2 (2).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Kommentar til måloppnåelse (forrige periode)</Label>
                <Textarea
                  className="mt-1.5"
                  rows={3}
                  disabled={isLocked || !canConduct}
                  value={malKompetensar.maloppnaelseKommentar}
                  onChange={(e) =>
                    setMalKompetensar((p) => ({ ...p, maloppnaelseKommentar: e.target.value }))
                  }
                  placeholder="Hvordan gikk det med målene fra forrige samtale?"
                />
              </div>

              {/* Mål-liste */}
              <div className="space-y-3">
                <Label>Mål for neste periode</Label>
                {goals.map((goal, idx) => (
                  <div key={idx} className="border rounded-md p-3 space-y-2 bg-muted/20">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Beskriv målet..."
                        value={goal.description}
                        disabled={isLocked || (!canConduct && !isEmployee)}
                        onChange={(e) => {
                          const copy = [...goals];
                          copy[idx] = { ...copy[idx], description: e.target.value };
                          setGoals(copy);
                        }}
                        className="flex-1"
                      />
                      {!isLocked && (canConduct || isEmployee) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setGoals(goals.filter((_, i) => i !== idx))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Select
                        value={goal.category}
                        disabled={isLocked || (!canConduct && !isEmployee)}
                        onValueChange={(v) => {
                          const copy = [...goals];
                          copy[idx] = { ...copy[idx], category: v as EmployeeReviewGoalCategory };
                          setGoals(copy);
                        }}
                      >
                        <SelectTrigger className="w-40 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(GOAL_CATEGORY_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={goal.status}
                        disabled={isLocked || !canConduct}
                        onValueChange={(v) => {
                          const copy = [...goals];
                          copy[idx] = { ...copy[idx], status: v as EmployeeReviewGoalStatus };
                          setGoals(copy);
                        }}
                      >
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(GOAL_STATUS_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        type="date"
                        className="w-36 h-8 text-xs"
                        value={goal.deadline}
                        disabled={isLocked || (!canConduct && !isEmployee)}
                        onChange={(e) => {
                          const copy = [...goals];
                          copy[idx] = { ...copy[idx], deadline: e.target.value };
                          setGoals(copy);
                        }}
                      />
                    </div>
                  </div>
                ))}

                {!isLocked && (canConduct || isEmployee) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setGoals([
                        ...goals,
                        { description: "", category: "FAGLIG", status: "IKKE_STARTET", deadline: "", note: "", overfortTilNeste: false },
                      ])
                    }
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Legg til mål
                  </Button>
                )}
              </div>

              {!isLocked && (canConduct || isEmployee) && (
                <Button size="sm" onClick={saveGoals} disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Lagre mål
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── KOMPETANSE ── */}
        <TabsContent value="kompetanse" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kompetanse og utvikling</CardTitle>
              <p className="text-sm text-muted-foreground">
                AML § 4-2 (2): arbeidsgiver skal legge til rette for faglig og personlig
                utvikling
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  key: "kompetanseKommentar" as const,
                  label: "Nåværende kompetanse og prestasjoner",
                  placeholder: "Styrker, kompetanseområder, resultater siste periode...",
                },
                {
                  key: "opplaeringsOnske" as const,
                  label: "Ønsker om kurs, opplæring eller sertifisering",
                  placeholder: "Kurs, konferanser, e-læring, mentoring...",
                },
                {
                  key: "karrierePlaner" as const,
                  label: "Karriereplaner og ambisjoner",
                  placeholder: "Ønsket utvikling, roller, ansvar fremover...",
                },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Textarea
                    className="mt-1.5"
                    rows={3}
                    disabled={isLocked || !canConduct}
                    value={malKompetensar[key]}
                    onChange={(e) =>
                      setMalKompetensar((p) => ({ ...p, [key]: e.target.value }))
                    }
                    placeholder={placeholder}
                  />
                </div>
              ))}

              {!isLocked && canConduct && (
                <Button
                  size="sm"
                  onClick={() => save("Kompetanse", malKompetensar)}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Lagre kompetanse
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TILBAKEMELDING ── */}
        <TabsContent value="tilbakemelding" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gjensidig tilbakemelding</CardTitle>
              <p className="text-sm text-muted-foreground">
                Tilrettelegging (AML § 4-2) og tilbakemelding begge veier
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tilretteleggingsbehov (AML § 4-2 (1))</Label>
                <Textarea
                  className="mt-1.5"
                  rows={3}
                  disabled={isLocked || !canConduct}
                  value={tilrettelegging.tilretteleggingBehov}
                  onChange={(e) =>
                    setTilrettelegging((p) => ({ ...p, tilretteleggingBehov: e.target.value }))
                  }
                  placeholder="Spesielle behov for tilrettelegging, tilpasning av arbeidsoppgaver..."
                />
              </div>
              <div>
                <Label>Arbeidstid og balanse</Label>
                <Textarea
                  className="mt-1.5"
                  rows={2}
                  disabled={isLocked || !canConduct}
                  value={tilrettelegging.arbeidstidKommentar}
                  onChange={(e) =>
                    setTilrettelegging((p) => ({ ...p, arbeidstidKommentar: e.target.value }))
                  }
                  placeholder="Kommentarer til arbeidstid, fleksibilitet, balanse arbeid/fritid..."
                />
              </div>
              <div>
                <Label>Lederens tilbakemelding til ansatt</Label>
                <Textarea
                  className="mt-1.5"
                  rows={4}
                  disabled={isLocked || !canConduct}
                  value={tilrettelegging.lederTilbakemeldingTilAnsatt}
                  onChange={(e) =>
                    setTilrettelegging((p) => ({
                      ...p,
                      lederTilbakemeldingTilAnsatt: e.target.value,
                    }))
                  }
                  placeholder="Ros, konstruktiv kritikk, forventninger fremover..."
                />
              </div>
              <div>
                <Label>Ansattens tilbakemelding til leder</Label>
                <Textarea
                  className="mt-1.5"
                  rows={4}
                  disabled={isLocked || (!isEmployee && !canConduct)}
                  value={tilrettelegging.ansattTilbakemeldingTilLeder}
                  onChange={(e) =>
                    setTilrettelegging((p) => ({
                      ...p,
                      ansattTilbakemeldingTilLeder: e.target.value,
                    }))
                  }
                  placeholder="Tilbakemelding til leder om lederstil, kommunikasjon, støtte..."
                />
              </div>
              <div>
                <Label>Oppsummering av samtalen</Label>
                <Textarea
                  className="mt-1.5"
                  rows={3}
                  disabled={isLocked || !canConduct}
                  value={tilrettelegging.oppsummeringKommentar}
                  onChange={(e) =>
                    setTilrettelegging((p) => ({ ...p, oppsummeringKommentar: e.target.value }))
                  }
                  placeholder="Overordnet oppsummering av samtalen og avtalte punkter..."
                />
              </div>

              {!isLocked && (canConduct || isEmployee) && (
                <Button
                  size="sm"
                  onClick={() => save("Tilbakemelding", tilrettelegging)}
                  disabled={isPending}
                >
                  {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Lagre tilbakemelding
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TILTAK ── */}
        <TabsContent value="tiltak" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tiltak og oppfølging</CardTitle>
              <p className="text-sm text-muted-foreground">
                IK-HMS § 5: avtalte tiltak skal dokumenteres med frist og ansvarlig
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {actions.map((action, idx) => (
                <div key={idx} className="border rounded-md p-3 space-y-2 bg-muted/20">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Beskriv tiltaket..."
                      value={action.description}
                      disabled={isLocked || !canConduct}
                      onChange={(e) => {
                        const copy = [...actions];
                        copy[idx] = { ...copy[idx], description: e.target.value };
                        setActions(copy);
                      }}
                      className="flex-1"
                    />
                    {!isLocked && canConduct && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setActions(actions.filter((_, i) => i !== idx))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Select
                      value={action.ansvarlig}
                      disabled={isLocked || !canConduct}
                      onValueChange={(v) => {
                        const copy = [...actions];
                        copy[idx] = { ...copy[idx], ansvarlig: v };
                        setActions(copy);
                      }}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue placeholder="Ansvarlig" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LEDER" className="text-xs">Leder</SelectItem>
                        <SelectItem value="ANSATT" className="text-xs">Ansatt</SelectItem>
                        <SelectItem value="BEGGE" className="text-xs">Begge</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      className="w-36 h-8 text-xs"
                      value={action.dueDate}
                      disabled={isLocked || !canConduct}
                      onChange={(e) => {
                        const copy = [...actions];
                        copy[idx] = { ...copy[idx], dueDate: e.target.value };
                        setActions(copy);
                      }}
                    />
                    <Badge
                      variant={action.completed ? "default" : "outline"}
                      className={`cursor-pointer text-xs ${action.completed ? "bg-green-100 text-green-800 border-green-200" : ""}`}
                      onClick={() => {
                        if (!isLocked && canConduct) {
                          const copy = [...actions];
                          copy[idx] = { ...copy[idx], completed: !copy[idx].completed };
                          setActions(copy);
                        }
                      }}
                    >
                      {action.completed ? "Fullført" : "Ikke fullført"}
                    </Badge>
                  </div>
                </div>
              ))}

              {!isLocked && canConduct && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setActions([
                      ...actions,
                      { description: "", ansvarlig: "", dueDate: "", completed: false, note: "" },
                    ])
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Legg til tiltak
                </Button>
              )}

              {!isLocked && canConduct && (
                <Button size="sm" onClick={saveActions} disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Lagre tiltak
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
