"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import {
  Calendar,
  CheckCircle2,
  Info,
  Loader2,
  PenLine,
  Save,
  Target,
  MessageSquare,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "@/server/actions/employee-review.actions";
import type {
  EmployeeReview,
  EmployeeReviewGoal,
  EmployeeReviewAction,
  PsykososialtNiva,
} from "@prisma/client";

type ReviewWithRelations = EmployeeReview & {
  employee: { id: string; name: string | null; email: string };
  reviewer: { id: string; name: string | null; email: string };
  goals: EmployeeReviewGoal[];
  actions: EmployeeReviewAction[];
};

const PSYK_LABELS: Record<PsykososialtNiva, { label: string; className: string }> = {
  FORSVARLIG: { label: "Fullt forsvarlig", className: "text-green-700 bg-green-50 border-green-200" },
  DELVIS_FORSVARLIG: { label: "Delvis forsvarlig – krever oppfølging", className: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  IKKE_FORSVARLIG: { label: "Ikke forsvarlig – tiltak påkrevd", className: "text-red-700 bg-red-50 border-red-200" },
};

const SCORE_LABELS: Record<number, string> = {
  1: "Svært misfornøyd",
  2: "Misfornøyd",
  3: "Nøytral",
  4: "Fornøyd",
  5: "Svært fornøyd",
};

const GOAL_CATEGORY_LABELS: Record<string, string> = {
  FAGLIG: "Faglig utvikling",
  PERSONLIG: "Personlig utvikling",
  VIRKSOMHET: "Virksomhetsmål",
};

const GOAL_STATUS_LABELS: Record<string, string> = {
  IKKE_STARTET: "Ikke startet",
  PAGAENDE: "Pågående",
  OPPNADD: "Oppnådd",
  IKKE_OPPNADD: "Ikke oppnådd",
};

function ReadOnlyField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm whitespace-pre-wrap bg-muted/40 rounded-md p-3">{value}</p>
    </div>
  );
}

function ScoreDisplay({ label, value }: { label: string; value: number | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-medium ${
                n === value
                  ? "bg-primary text-primary-foreground"
                  : n < value
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {n}
            </div>
          ))}
        </div>
        <span className="text-xs text-muted-foreground w-28 text-right">
          {SCORE_LABELS[value]}
        </span>
      </div>
    </div>
  );
}

export function AnsattSamtaleView({
  review: initialReview,
  currentUserId,
}: {
  review: ReviewWithRelations;
  currentUserId: string;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isLocked = initialReview.status === "SIGNERT" || initialReview.status === "AVBRUTT";
  const canFillPrep = !isLocked;
  const canSign = initialReview.status === "GJENNOMFORT" && !initialReview.signertAvAnsatt;
  const contentVisible =
    initialReview.status === "GJENNOMFORT" || initialReview.status === "SIGNERT";

  const [forberedelse, setForberedelse] = useState({
    ansattForberedelse: initialReview.ansattForberedelse ?? "",
    ansattMedvirkning: initialReview.ansattMedvirkning ?? "",
  });

  const [tilbakemeldingTilLeder, setTilbakemeldingTilLeder] = useState(
    initialReview.ansattTilbakemeldingTilLeder ?? ""
  );

  function saveForberedelse() {
    startTransition(async () => {
      const result = await updateEmployeeReview(initialReview.id, forberedelse);
      if (result.success) {
        toast({ title: "Forberedelse lagret" });
        router.refresh();
      } else {
        toast({ title: "Feil", description: result.error, variant: "destructive" });
      }
    });
  }

  function saveTilbakemelding() {
    startTransition(async () => {
      const result = await updateEmployeeReview(initialReview.id, {
        ansattTilbakemeldingTilLeder: tilbakemeldingTilLeder,
      });
      if (result.success) {
        toast({ title: "Tilbakemelding lagret" });
        router.refresh();
      } else {
        toast({ title: "Feil", description: result.error, variant: "destructive" });
      }
    });
  }

  function handleSign() {
    startTransition(async () => {
      const result = await signEmployeeReview(initialReview.id, "ANSATT");
      if (result.success) {
        toast({ title: "Samtalen er signert av deg" });
        router.refresh();
      } else {
        toast({ title: "Feil", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Topptekst */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Medarbeidersamtale</h2>
            <EmployeeReviewStatusBadge status={initialReview.status} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(initialReview.scheduledDate), "d. MMMM yyyy", { locale: nb })}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              Leder: {initialReview.reviewer.name ?? initialReview.reviewer.email}
            </span>
            {initialReview.nextReviewDate && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Neste samtale:{" "}
                {format(new Date(initialReview.nextReviewDate), "d. MMMM yyyy", { locale: nb })}
              </span>
            )}
          </div>

          {/* Signeringstatus */}
          <div className="grid grid-cols-2 gap-2 text-sm pt-1">
            <div className="flex items-center gap-2">
              {initialReview.signertAvAnsatt ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40" />
              )}
              <span className="text-muted-foreground">
                Du:{" "}
                {initialReview.signertAvAnsatt && initialReview.ansattSignertAt
                  ? format(new Date(initialReview.ansattSignertAt), "d. MMM yyyy", { locale: nb })
                  : "Ikke signert"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {initialReview.signertAvLeder ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40" />
              )}
              <span className="text-muted-foreground">
                Leder:{" "}
                {initialReview.signertAvLeder && initialReview.lederSignertAt
                  ? format(new Date(initialReview.lederSignertAt), "d. MMM yyyy", { locale: nb })
                  : "Ikke signert"}
              </span>
            </div>
          </div>

          {/* Signer-knapp */}
          {canSign && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" className="mt-1">
                  <PenLine className="h-4 w-4 mr-2" />
                  Signer samtalen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Bekreft signering</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ved å signere bekrefter du at du har lest og deltatt i denne
                    medarbeidersamtalen. Innholdet vil ikke kunne endres etterpå.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSign} disabled={isPending}>
                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Ja, signer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>

      {/* Faner */}
      <Tabs defaultValue="forberedelse">
        <TabsList className="w-full">
          <TabsTrigger value="forberedelse" className="flex-1">
            Min forberedelse
          </TabsTrigger>
          {contentVisible && (
            <>
              <TabsTrigger value="innhold" className="flex-1">
                Innhold
              </TabsTrigger>
              <TabsTrigger value="avtaler" className="flex-1">
                Mål og tiltak
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* ── FORBEREDELSE ── */}
        <TabsContent value="forberedelse" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                Din forberedelse til samtalen
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Fyll inn dette før samtalen. Det hjelper lederen å forberede seg og sikrer
                at du får tatt opp det som er viktig for deg (AML § 4-2).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Hva vil du ta opp i samtalen?</Label>
                <Textarea
                  className="mt-1.5"
                  rows={4}
                  disabled={isLocked}
                  value={forberedelse.ansattForberedelse}
                  onChange={(e) =>
                    setForberedelse((p) => ({ ...p, ansattForberedelse: e.target.value }))
                  }
                  placeholder="Temaer, spørsmål eller situasjoner du ønsker å diskutere..."
                />
              </div>
              <div>
                <Label>Din vurdering av arbeidssituasjonen</Label>
                <Textarea
                  className="mt-1.5"
                  rows={4}
                  disabled={isLocked}
                  value={forberedelse.ansattMedvirkning}
                  onChange={(e) =>
                    setForberedelse((p) => ({ ...p, ansattMedvirkning: e.target.value }))
                  }
                  placeholder="Hva fungerer bra? Hva kan bli bedre? Har du noen bekymringer?"
                />
              </div>

              {!isLocked && (
                <Button size="sm" onClick={saveForberedelse} disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Lagre forberedelse
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Tilbakemelding til leder — synlig alltid (kan fylles ut etter samtalen) */}
          {contentVisible && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Din tilbakemelding til leder
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Gi tilbakemelding til lederen din på lederstil, kommunikasjon og støtte.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  rows={4}
                  disabled={isLocked}
                  value={tilbakemeldingTilLeder}
                  onChange={(e) => setTilbakemeldingTilLeder(e.target.value)}
                  placeholder="Tilbakemelding på lederstil, kommunikasjon, støtte og oppfølging..."
                />
                {!isLocked && (
                  <Button size="sm" onClick={saveTilbakemelding} disabled={isPending}>
                    {isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Lagre tilbakemelding
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── INNHOLD (kun etter gjennomføring) ── */}
        {contentVisible && (
          <TabsContent value="innhold" className="pt-4 space-y-4">
            {/* Trivsel */}
            {(initialReview.trivselScore ||
              initialReview.arbeidsmiljoeScore ||
              initialReview.samarbeidScore) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Trivsel og arbeidsmiljø</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScoreDisplay label="Generell trivsel" value={initialReview.trivselScore} />
                  <ScoreDisplay label="Arbeidsmiljø" value={initialReview.arbeidsmiljoeScore} />
                  <ScoreDisplay label="Samarbeid" value={initialReview.samarbeidScore} />
                </CardContent>
              </Card>
            )}

            {/* Psykososialt */}
            {(initialReview.psykKravOgForventninger ||
              initialReview.psykEmosjonelleKrav ||
              initialReview.psykArbeidsmengde ||
              initialReview.psykStotteOgHjelp) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Psykososialt arbeidsmiljø</CardTitle>
                  <p className="text-xs text-muted-foreground">AML § 4-3 (2026)</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(
                    [
                      { key: "psykKravOgForventninger", label: "Krav og forventninger" },
                      { key: "psykEmosjonelleKrav", label: "Emosjonelle krav" },
                      { key: "psykArbeidsmengde", label: "Arbeidsmengde og tidspress" },
                      { key: "psykStotteOgHjelp", label: "Støtte og hjelp" },
                    ] as const
                  ).map(({ key, label }) => {
                    const niva = initialReview[key];
                    if (!niva) return null;
                    const cfg = PSYK_LABELS[niva];
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between px-3 py-2 rounded-md border text-sm ${cfg.className}`}
                      >
                        <span className="text-muted-foreground text-foreground">{label}</span>
                        <span className="font-medium">{cfg.label}</span>
                      </div>
                    );
                  })}
                  {initialReview.psykKommentar && (
                    <p className="text-sm text-muted-foreground pt-1">
                      {initialReview.psykKommentar}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Kompetanse og utvikling */}
            {(initialReview.kompetanseKommentar ||
              initialReview.opplaeringsOnske ||
              initialReview.karrierePlaner) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Kompetanse og utvikling</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ReadOnlyField label="Kompetanse" value={initialReview.kompetanseKommentar} />
                  <ReadOnlyField label="Ønsker om opplæring" value={initialReview.opplaeringsOnske} />
                  <ReadOnlyField label="Karriereplaner" value={initialReview.karrierePlaner} />
                </CardContent>
              </Card>
            )}

            {/* Tilrettelegging og tilbakemelding */}
            {(initialReview.tilretteleggingBehov ||
              initialReview.arbeidstidKommentar ||
              initialReview.lederTilbakemeldingTilAnsatt ||
              initialReview.oppsummeringKommentar) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tilrettelegging og tilbakemelding</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ReadOnlyField
                    label="Tilretteleggingsbehov"
                    value={initialReview.tilretteleggingBehov}
                  />
                  <ReadOnlyField
                    label="Arbeidstid og balanse"
                    value={initialReview.arbeidstidKommentar}
                  />
                  <ReadOnlyField
                    label="Lederens tilbakemelding til deg"
                    value={initialReview.lederTilbakemeldingTilAnsatt}
                  />
                  <ReadOnlyField
                    label="Oppsummering"
                    value={initialReview.oppsummeringKommentar}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* ── MÅL OG TILTAK ── */}
        {contentVisible && (
          <TabsContent value="avtaler" className="pt-4 space-y-4">
            {/* Mål */}
            {initialReview.goals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Avtalte mål
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {initialReview.goals.map((goal) => (
                    <div
                      key={goal.id}
                      className="flex items-start gap-3 p-3 rounded-md border bg-muted/20"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{goal.description}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {GOAL_CATEGORY_LABELS[goal.category] ?? goal.category}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              goal.status === "OPPNADD"
                                ? "bg-green-50 border-green-200 text-green-700"
                                : goal.status === "PAGAENDE"
                                ? "bg-blue-50 border-blue-200 text-blue-700"
                                : ""
                            }`}
                          >
                            {GOAL_STATUS_LABELS[goal.status] ?? goal.status}
                          </Badge>
                          {goal.deadline && (
                            <span className="text-xs text-muted-foreground">
                              Frist:{" "}
                              {format(new Date(goal.deadline), "d. MMM yyyy", { locale: nb })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Tiltak */}
            {initialReview.actions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Avtalte tiltak
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {initialReview.actions.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-start gap-3 p-3 rounded-md border bg-muted/20"
                    >
                      <div
                        className={`mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 ${
                          action.completed
                            ? "bg-green-500 border-green-500"
                            : "border-muted-foreground/40"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${action.completed ? "line-through text-muted-foreground" : ""}`}>
                          {action.description}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                          {action.ansvarlig && (
                            <span>
                              Ansvarlig:{" "}
                              {action.ansvarlig === "LEDER"
                                ? "Leder"
                                : action.ansvarlig === "ANSATT"
                                ? "Deg"
                                : "Begge"}
                            </span>
                          )}
                          {action.dueDate && (
                            <span>
                              Frist:{" "}
                              {format(new Date(action.dueDate), "d. MMM yyyy", { locale: nb })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {initialReview.goals.length === 0 && initialReview.actions.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Ingen mål eller tiltak er registrert ennå.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
