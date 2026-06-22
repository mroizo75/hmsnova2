import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { AlertCircle, ArrowLeft, BookOpen, Settings2, RefreshCw, FileText } from "lucide-react";
import { RoutineStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateNextReviewDate, dateFromYmdInput } from "@/lib/document-utils";
import { helpContent } from "@/lib/help-content";
import {
  CUSTOM_SENTINEL,
  getRoutineCategoryPresets,
  resolveRoutineCategoryFromForm,
  routineCategoryToPresetAndCustom,
} from "@/lib/routine-categories";
import {
  mergeRoutineContentFromForm,
  stringArrayToMultiline,
  toStructuredRoutineContent,
} from "@/lib/routine-content-model";
import {
  assignRoutineResponsible,
  getRoutineById,
  updateRoutine,
} from "@/server/actions/routine.actions";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const LIST_HELPER = "Skriv ett punkt per linje. Tomme linjer ignoreres.";

function formatNbDate(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    ACTIVE: "Gjeldende",
    DRAFT: "Kladd",
    NEEDS_REVIEW: "Krever revisjon",
    ARCHIVED: "Arkivert",
  };
  return map[s] ?? s;
}

function statusVariant(s: string): "default" | "destructive" | "secondary" | "outline" {
  switch (s) {
    case "ACTIVE":
      return "default";
    case "NEEDS_REVIEW":
      return "destructive";
    case "DRAFT":
      return "secondary";
    default:
      return "outline";
  }
}

export default async function EditRoutinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const { id } = await params;
  const result = await getRoutineById(id);
  if (!result.success) {
    redirect("/dashboard/rutiner");
  }
  const routine = result.data;

  const users = await prisma.userTenant.findMany({
    where: { tenantId: session.user.tenantId },
    select: {
      userId: true,
      role: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: [{ role: "asc" }],
  });

  const categoryPresets = getRoutineCategoryPresets();
  const { preset: categoryPreset, custom: categoryCustomDefault } = routineCategoryToPresetAndCustom(
    routine.category
  );

  const todayYmd = new Date().toISOString().slice(0, 10);

  async function onSave(formData: FormData) {
    "use server";

    const sessionInner = await getServerSession(authOptions);
    if (!sessionInner?.user?.tenantId) return;

    const existingRow = await prisma.routine.findFirst({
      where: { id, tenantId: sessionInner.user.tenantId },
      select: {
        content: true,
        nextReviewAt: true,
        lastReviewedAt: true,
        reviewIntervalMonths: true,
        status: true,
      },
    });

    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const categoryPresetRaw = String(formData.get("categoryPreset") || "").trim();
    const categoryCustomRaw = String(formData.get("categoryCustom") || "").trim();
    const category = resolveRoutineCategoryFromForm(categoryPresetRaw, categoryCustomRaw);
    const legalReference = String(formData.get("legalReference") || "").trim();
    const reviewIntervalRaw = String(formData.get("reviewIntervalMonths") || "").trim();
    const nextReviewAtRaw = String(formData.get("nextReviewAt") || "").trim();
    const responsibleId = String(formData.get("responsibleId") || "").trim();
    const registerReview = formData.get("registerReview") === "on";

    const content = mergeRoutineContentFromForm(formData, existingRow?.content ?? null);

    const interval = Math.max(
      1,
      Number.isFinite(Number(reviewIntervalRaw)) && Number(reviewIntervalRaw) > 0
        ? Number(reviewIntervalRaw)
        : existingRow?.reviewIntervalMonths ?? 12
    );

    let nextReviewAt: Date | null | undefined;
    let lastReviewedAt: Date | null | undefined;
    let status: RoutineStatus | undefined;

    if (registerReview) {
      let reviewedAt = dateFromYmdInput(String(formData.get("reviewedOn") ?? ""));
      if (!reviewedAt) {
        reviewedAt = dateFromYmdInput(new Date().toISOString().slice(0, 10));
      }
      if (reviewedAt) {
        lastReviewedAt = reviewedAt;
        nextReviewAt = calculateNextReviewDate(reviewedAt, interval);
        status = RoutineStatus.ACTIVE;
      }
    } else {
      lastReviewedAt = undefined;
      status = undefined;
      const manual = dateFromYmdInput(nextReviewAtRaw);
      nextReviewAt = manual !== null ? manual : existingRow?.nextReviewAt ?? null;
    }

    const updateResult = await updateRoutine({
      id,
      title,
      description: description || null,
      category,
      legalReference: legalReference || null,
      content,
      reviewIntervalMonths: interval,
      ...(nextReviewAt !== undefined ? { nextReviewAt } : {}),
      ...(lastReviewedAt !== undefined ? { lastReviewedAt } : {}),
      ...(status !== undefined ? { status } : {}),
    });

    if (updateResult.success && responsibleId) {
      await assignRoutineResponsible(id, responsibleId);
    }

    revalidatePath(`/dashboard/rutiner/${id}`);
    revalidatePath("/dashboard/rutiner");
    redirect(`/dashboard/rutiner/${id}`);
  }

  const c = toStructuredRoutineContent(routine.content);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/rutiner/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold sm:text-3xl">Rediger rutine</h1>
              <PageHelpDialog content={helpContent.routines} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground truncate max-w-xs">{routine.title}</span>
              <Badge variant={statusVariant(routine.status)} className="text-xs">
                {statusLabel(routine.status)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Informasjon om egendefinert versjon */}
      {routine.templateId && (
        <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 px-4 py-3 flex items-start gap-3 text-sm">
          <BookOpen className="h-4 w-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="text-blue-900 dark:text-blue-100">
            <span className="font-semibold">Egendefinert versjon:</span> Endringene du gjør her lagres kun som{" "}
            <em>din bedrifts versjon</em> av rutinen. Den originale malen påvirkes ikke.
          </div>
        </div>
      )}

      {/* Revisjon-varsel */}
      {routine.status === RoutineStatus.NEEDS_REVIEW && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30">
          <AlertCircle className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          <AlertTitle className="text-amber-900 dark:text-amber-100">Denne rutinen krever revisjon</AlertTitle>
          <AlertDescription className="text-amber-900/80 dark:text-amber-100/90">
            Huk av «Registrer gjennomført revisjon» i revisjonsseksjonen under, og lagre. Da oppdateres
            status til gjeldende og neste frist beregnes automatisk.
          </AlertDescription>
        </Alert>
      )}

      <form action={onSave} className="space-y-6">
        {/* ── Seksjon 1: Grunnopplysninger ────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Grunnopplysninger</CardTitle>
                <CardDescription>Tittel, kategori, ansvarlig og lovreferanse.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Tittel</Label>
              <Input id="title" name="title" defaultValue={routine.title} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Kort beskrivelse</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={routine.description || ""}
                rows={2}
                placeholder="Beskriv hva denne rutinen handler om med noen få setninger."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="categoryPreset">Kategori</Label>
                <select
                  id="categoryPreset"
                  name="categoryPreset"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  defaultValue={categoryPreset}
                >
                  <option value="">Velg kategori</option>
                  {categoryPresets.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                  <option value={CUSTOM_SENTINEL}>Annet (skriv inn egen)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryCustom">Egen kategori</Label>
                <Input
                  id="categoryCustom"
                  name="categoryCustom"
                  defaultValue={categoryCustomDefault}
                  placeholder="Kun ved «Annet»"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="responsibleId">Ansvarlig person</Label>
                <select
                  id="responsibleId"
                  name="responsibleId"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  defaultValue={routine.responsibleId || ""}
                >
                  <option value="">Velg ansvarlig</option>
                  {users.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.user.name || member.user.email} ({member.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="legalReference">Lovreferanse</Label>
                <Input
                  id="legalReference"
                  name="legalReference"
                  defaultValue={routine.legalReference || ""}
                  placeholder="F.eks. IK-HMS, AML, ISO 45001"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Seksjon 2: Revisjon ────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Revisjon og frister</CardTitle>
                <CardDescription>
                  Hold rutinen oppdatert. Registrer gjennomført revisjon for å oppdatere status og beregne neste frist
                  automatisk.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span>
                <span className="font-medium">Sist revidert:</span>{" "}
                {routine.lastReviewedAt ? (
                  formatNbDate(routine.lastReviewedAt)
                ) : (
                  <span className="text-muted-foreground">Ikke registrert</span>
                )}
              </span>
              <span>
                <span className="font-medium">Neste frist:</span>{" "}
                {routine.nextReviewAt ? (
                  formatNbDate(routine.nextReviewAt)
                ) : (
                  <span className="text-muted-foreground">Ikke satt</span>
                )}
              </span>
            </div>

            <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="registerReview"
                  name="registerReview"
                  className="mt-1 h-4 w-4 rounded border-input accent-primary"
                />
                <div className="space-y-1">
                  <Label htmlFor="registerReview" className="cursor-pointer text-base font-semibold">
                    Registrer gjennomført revisjon
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Huk av for å bekrefte at rutinen er gjennomgått. Status settes til «Gjeldende» og neste frist
                    beregnes fra revisjonsdatoen + intervallet under.
                  </p>
                </div>
              </div>

              <div className="ml-7 max-w-xs space-y-2">
                <Label htmlFor="reviewedOn" className="text-sm">
                  Revisjon gjennomført (dato)
                </Label>
                <Input id="reviewedOn" name="reviewedOn" type="date" defaultValue={todayYmd} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reviewIntervalMonths">Revisjonsintervall (måneder)</Label>
                <Input
                  id="reviewIntervalMonths"
                  name="reviewIntervalMonths"
                  type="number"
                  min={1}
                  defaultValue={routine.reviewIntervalMonths}
                />
                <p className="text-xs text-muted-foreground">
                  Hvor mange måneder mellom hver revisjon. Standard er 12.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextReviewAt">Neste revisjon (manuelt valg)</Label>
                <Input
                  id="nextReviewAt"
                  name="nextReviewAt"
                  type="date"
                  defaultValue={
                    routine.nextReviewAt ? new Date(routine.nextReviewAt).toISOString().slice(0, 10) : ""
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Overstyrer automatisk beregning. La stå tom for å beholde eksisterende dato.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Seksjon 3: Rutineinnhold ───────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Rutineinnhold</CardTitle>
                <CardDescription>
                  Teksten som ansatte ser når de åpner rutinen. Fyll ut seksjonene som er relevante.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="content_formaal">Formål</Label>
              <Textarea
                id="content_formaal"
                name="content_formaal"
                rows={3}
                defaultValue={c.formaal}
                placeholder="Hva er hensikten med denne rutinen?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content_omfang">Omfang</Label>
              <Textarea
                id="content_omfang"
                name="content_omfang"
                rows={3}
                defaultValue={c.omfang}
                placeholder="Hvem og hva gjelder rutinen for?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content_ansvar">Ansvar</Label>
              <p className="text-xs text-muted-foreground">{LIST_HELPER}</p>
              <Textarea
                id="content_ansvar"
                name="content_ansvar"
                rows={5}
                defaultValue={stringArrayToMultiline(c.ansvar)}
                placeholder="Leder har ansvar for ...&#10;Ansatte skal ..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content_gjennomforing">Gjennomføring</Label>
              <p className="text-xs text-muted-foreground">{LIST_HELPER}</p>
              <Textarea
                id="content_gjennomforing"
                name="content_gjennomforing"
                rows={6}
                defaultValue={stringArrayToMultiline(c.gjennomforing)}
                placeholder="Steg 1: ...&#10;Steg 2: ..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content_dokumentasjon">Dokumentasjon</Label>
              <p className="text-xs text-muted-foreground">{LIST_HELPER}</p>
              <Textarea
                id="content_dokumentasjon"
                name="content_dokumentasjon"
                rows={4}
                defaultValue={stringArrayToMultiline(c.dokumentasjon)}
                placeholder="Hvilke skjema eller logger skal føres?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content_avvikOppfolging">Avvik og oppfølging</Label>
              <p className="text-xs text-muted-foreground">{LIST_HELPER}</p>
              <Textarea
                id="content_avvikOppfolging"
                name="content_avvikOppfolging"
                rows={4}
                defaultValue={stringArrayToMultiline(c.avvikOppfolging)}
                placeholder="Hva gjøres ved avvik fra rutinen?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content_revisjon">Revisjon (tekst i rutinen)</Label>
              <Textarea
                id="content_revisjon"
                name="content_revisjon"
                rows={3}
                defaultValue={c.revisjon}
                placeholder="Når og hvordan revideres rutinen?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content_kilder">Kilder</Label>
              <p className="text-xs text-muted-foreground">{LIST_HELPER}</p>
              <Textarea
                id="content_kilder"
                name="content_kilder"
                rows={4}
                defaultValue={stringArrayToMultiline(c.kilder)}
                placeholder="Lover, forskrifter eller standarder"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Lagre-knapper ──────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
          <Button type="submit" size="lg">
            Lagre endringer
          </Button>
          <Link href={`/dashboard/rutiner/${id}`}>
            <Button type="button" variant="outline" size="lg">
              Avbryt
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
