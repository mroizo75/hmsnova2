"use client";

import { Button } from "@/components/ui/button";
import {
  BERUSELSE,
  HENDELSE_ACTION,
  HENDELSE_TYPE,
  SKJENKE_KRAV,
  aktuelleRutiner,
  evaluateSkjenkingInternkontroll,
  skjenkeProfil,
} from "@/features/skjenking/lib/internkontroll";
import type {
  AlcoholTrainingStatus,
  SkjenkeBevillingView,
  SkjenkeGjennomgangView,
  SkjenkeHendelseView,
  SkjenkeRutineView,
} from "./skjenking-types";
import { toDateInput } from "./skjenking-types";

interface Props {
  bevilling: SkjenkeBevillingView | null;
  hendelser: SkjenkeHendelseView[];
  rutiner: SkjenkeRutineView[];
  gjennomganger: SkjenkeGjennomgangView[];
  alcoholTraining: AlcoholTrainingStatus;
}

function line(label: string, value: string | null | undefined) {
  return (
    <div className="grid gap-1 border-t py-2 sm:grid-cols-[220px_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

export function SkjenkingKontroll({ bevilling, hendelser, rutiner, gjennomganger, alcoholTraining }: Props) {
  const coverage = evaluateSkjenkingInternkontroll({
    bevilling,
    rutiner,
    apneHendelser: hendelser.filter((item) => item.status === "APEN").length,
    gjennomganger,
    opplaering: {
      total: alcoholTraining.users.length,
      fullfort: alcoholTraining.users.filter((user) => user.completed).length,
    },
  });
  const maler = aktuelleRutiner(skjenkeProfil(bevilling));

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Samlet dokumentasjon til kontrollmyndigheten, jf. alkoholforskriften § 8-3.
        </p>
        <Button variant="outline" onClick={() => window.print()}>Skriv ut</Button>
      </div>

      <section>
        <h2 className="text-lg font-semibold">1. Krav som gjelder virksomheten</h2>
        <dl className="mt-2">
          {line("Bevilling", bevilling?.bevillingsnummer)}
          {line("Kommune", bevilling?.kommune)}
          {line("Type", bevilling?.bevillingstype)}
          {line("Gyldig", `${toDateInput(bevilling?.gyldigFra) || "—"} – ${toDateInput(bevilling?.gyldigTil) || "—"}`)}
          {line("Tider og vilkår", bevilling?.skjenketider)}
          {line("Særvilkår", bevilling?.sarvilkar)}
          {line("Alkoholfrie alternativer", bevilling?.alkoholfrittUtvalg)}
        </dl>
        <ul className="mt-3 space-y-2 text-sm">
          {SKJENKE_KRAV.map((krav) => (
            <li key={krav.id}>
              <span className="font-medium">{krav.ref}. </span>
              {krav.text}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">2. og 3. Kompetanse og organisering</h2>
        <dl className="mt-2">
          {line("Styrer", `${bevilling?.styrer ?? "—"} (kunnskapsprøve ${toDateInput(bevilling?.styrerProveDato) || "mangler"})`)}
          {line("Stedfortreder", `${bevilling?.stedfortreder ?? "—"} (kunnskapsprøve ${toDateInput(bevilling?.stedfortrederProveDato) || "mangler"})`)}
          {line("Alderskontroll", bevilling?.alderskontrollAnsvar)}
          {line("Skjenkestopp", bevilling?.beruselseAnsvar)}
          {line("Bortvisning", bevilling?.bortvisningAnsvar)}
          {line("Opplæring", bevilling?.opplaeringAnsvar)}
        </dl>
        <p className="mt-2 text-sm">
          {alcoholTraining.users.filter((user) => user.completed).length} av {alcoholTraining.users.length} ansatte har gyldig kurs i {alcoholTraining.title}.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">4. og 5. Rutiner</h2>
        {maler.map((mal) => {
          const saved = rutiner.find((row) => row.nokkel === mal.nokkel);
          return (
            <article key={mal.nokkel}>
              <h3 className="text-sm font-semibold">{mal.tittel}</h3>
              <p className="text-xs text-muted-foreground">{mal.lovhjemmel}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{saved?.aktiv === false ? "Deaktivert." : saved?.innhold ?? mal.innhold}</p>
            </article>
          );
        })}
        {bevilling?.internregler && (
          <article>
            <h3 className="text-sm font-semibold">Stedets tillegg</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm">{bevilling.internregler}</p>
          </article>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Hendelser</h2>
        {hendelser.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Ingen hendelser.</p>}
        <ul className="mt-2 space-y-2 text-sm">
          {hendelser.slice(0, 30).map((item) => (
            <li key={item.id}>
              {new Date(item.occurredAt).toLocaleString("nb-NO")} · {HENDELSE_TYPE[item.type as keyof typeof HENDELSE_TYPE] ?? item.type} · {HENDELSE_ACTION[item.action as keyof typeof HENDELSE_ACTION] ?? item.action}
              {item.beruselsesgrad ? ` · ${BERUSELSE[item.beruselsesgrad as keyof typeof BERUSELSE] ?? item.beruselsesgrad}` : ""}
              {item.status === "APEN" ? " · åpen" : ""}
              {item.korrigerendeTiltak ? ` · tiltak: ${item.korrigerendeTiltak}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">6. Gjennomgang</h2>
        {gjennomganger.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Ingen gjennomgang.</p>}
        {gjennomganger.map((item) => (
          <article key={item.id} className="mt-2 text-sm">
            <p className="font-medium">{new Date(item.gjennomfortAt).toLocaleDateString("nb-NO")} · {item.gjennomfortAv}</p>
            <p className="whitespace-pre-wrap">{item.funn}</p>
          </article>
        ))}
      </section>

      <p className="text-sm text-muted-foreground">
        Status: {coverage.complete ? "kravene i § 8-3 er dokumentert" : "internkontrollen er ikke komplett"}.
      </p>
    </div>
  );
}
