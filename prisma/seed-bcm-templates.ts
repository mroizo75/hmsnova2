import { PrismaClient } from "@prisma/client";
import {
  BCM_FORM_FIELD_LABELS,
  BCM_PROCESS_OPTIONS,
  BCM_RISK_OPTIONS,
} from "../src/features/bcm/lib/bcm-wizard.constants";

/**
 * Seed BCM (Business Continuity Management) document templates and form templates.
 * ISO 22301 — Beredskaps- og kontinuitetsstyring.
 */
export const BCM_DOCUMENT_TEMPLATES = [
  {
    name: "Krisehåndbok",
    category: "BCM",
    description:
      "Komplett krisehåndbok med varslingsmatrise, eskaleringsplan, roller og ansvar, samt mediehåndtering ved alvorlige hendelser.",
    defaultReviewIntervalMonths: 12,
    isGlobal: true,
  },
  {
    name: "Varslingsliste kriseteam",
    category: "BCM",
    description:
      "Kontaktliste over kriseteammedlemmer med mobilnummer, stedfortreder, rolle og tilgjengelighet (døgnvakt).",
    defaultReviewIntervalMonths: 6,
    isGlobal: true,
  },
  {
    name: "BIA — Business Impact Analysis",
    category: "BCM",
    description:
      "Analyse av kritiske prosesser med RTO (Recovery Time Objective), RPO (Recovery Point Objective) og konsekvensgradering ved driftsavbrudd.",
    defaultReviewIntervalMonths: 12,
    isGlobal: true,
  },
  {
    name: "Øvelsesrapport (BCM)",
    category: "BCM",
    description:
      "Dokumentasjonsmal for gjennomført beredskapsøvelse: mål, scenario, deltakere, observasjoner, forbedringstiltak og ansvarlig.",
    defaultReviewIntervalMonths: 12,
    isGlobal: true,
  },
  {
    name: "Gjenopprettingsplan",
    category: "BCM",
    description:
      "Plan for gjenoppretting av kritiske prosesser etter driftsavbrudd, inkludert tiltaksliste, tidsfrister og ansvarlige.",
    defaultReviewIntervalMonths: 12,
    isGlobal: true,
  },
];

export const BCM_WIZARD_FORM_TEMPLATE = {
  title: "Beredskapsplan — veiviser",
  description:
    "Steg-for-steg opprettelse av beredskapsplan for din virksomhet. Dekker kritiske prosesser, kriseteam, risikoscenarier og gjenopprettingstiltak.",
  category: "BCM",
  isGlobal: true,
  isActive: true,
  requiresSignature: false,
  requiresApproval: true,
  allowTenantDeletion: false,
  fields: [
    {
      fieldType: "TEXTAREA",
      label: BCM_FORM_FIELD_LABELS.organization,
      description: "Virksomhetens omfang, lokasjoner, arbeidsformer og hvem planen gjelder for.",
      isRequired: true,
      order: 1,
      options: null,
    },
    {
      fieldType: "TEXTAREA",
      label: BCM_FORM_FIELD_LABELS.legalScreening,
      description: "Bekreftede forhold som aktiverer generelle og særskilte beredskapskrav.",
      isRequired: true,
      order: 2,
      options: null,
    },
    {
      fieldType: "TEXTAREA",
      label: BCM_FORM_FIELD_LABELS.riskBasis,
      description: "Referanse til risikovurdering og dokumentasjon av arbeidstakermedvirkning.",
      isRequired: true,
      order: 3,
      options: null,
    },
    {
      fieldType: "SELECT",
      label: BCM_FORM_FIELD_LABELS.criticalProcesses,
      description: "Prosesser som er avgjørende for virksomhetens drift.",
      isRequired: true,
      order: 4,
      options: JSON.stringify(BCM_PROCESS_OPTIONS),
    },
    {
      fieldType: "TEXTAREA",
      label: BCM_FORM_FIELD_LABELS.crisisTeam,
      description: "Beredskapsroller med navn, fullmakt, kontaktdata og stedfortreder.",
      isRequired: true,
      order: 5,
      options: null,
    },
    {
      fieldType: "SELECT",
      label: BCM_FORM_FIELD_LABELS.riskScenarios,
      description: "Scenarioer fra virksomhetens risikovurdering.",
      isRequired: true,
      order: 6,
      options: JSON.stringify(BCM_RISK_OPTIONS),
    },
    {
      fieldType: "TEXTAREA",
      label: BCM_FORM_FIELD_LABELS.responsePlans,
      description: "Varslingsrekkefølge, umiddelbare handlinger og aktiverte særplaner.",
      isRequired: true,
      order: 7,
      options: null,
    },
    {
      fieldType: "TEXTAREA",
      label: BCM_FORM_FIELD_LABELS.resources,
      description: "Førstehjelp, utstyr, samband og andre beredskapsressurser.",
      isRequired: true,
      order: 8,
      options: null,
    },
    {
      fieldType: "TEXTAREA",
      label: BCM_FORM_FIELD_LABELS.recoveryPlan,
      description: "Prioritert gjenoppretting og kriterier for sikker normalisering.",
      isRequired: true,
      order: 9,
      options: null,
    },
    {
      fieldType: "TEXTAREA",
      label: BCM_FORM_FIELD_LABELS.communicationPlan,
      description: "Målgrupper, kanaler, talsperson og reservekommunikasjon.",
      isRequired: true,
      order: 10,
      options: null,
    },
    {
      fieldType: "TEXTAREA",
      label: BCM_FORM_FIELD_LABELS.trainingAndExercises,
      description: "Opplæring, øvelser, evaluering og forbedring.",
      isRequired: true,
      order: 11,
      options: null,
    },
    {
      fieldType: "TEXTAREA",
      label: BCM_FORM_FIELD_LABELS.confirmations,
      description: "Kundens eksplisitte bekreftelser av faktiske forhold.",
      isRequired: true,
      order: 12,
      options: null,
    },
    {
      fieldType: "DATE",
      label: BCM_FORM_FIELD_LABELS.nextReview,
      description: "Neste systematiske gjennomgang. Planen gjennomgås også ved relevante endringer.",
      isRequired: true,
      order: 13,
      options: null,
    },
  ],
};

export async function seedBcmTemplates(prisma: PrismaClient): Promise<void> {
  console.log("🌱 Seeder BCM-maler...");

  let docCreated = 0;
  let docSkipped = 0;

  for (const template of BCM_DOCUMENT_TEMPLATES) {
    const existing = await prisma.documentTemplate.findFirst({
      where: { name: template.name, isGlobal: true, category: "BCM" },
    });
    if (existing) {
      docSkipped++;
      continue;
    }
    await prisma.documentTemplate.create({ data: template });
    docCreated++;
  }

  const existingForm = await prisma.formTemplate.findFirst({
    where: { title: BCM_WIZARD_FORM_TEMPLATE.title, isGlobal: true, category: "BCM" },
  });

  const { fields, ...formData } = BCM_WIZARD_FORM_TEMPLATE;
  const form = existingForm
    ? await prisma.formTemplate.update({
        where: { id: existingForm.id },
        data: formData as any,
      })
    : await prisma.formTemplate.create({
        data: { ...formData, createdBy: "system" } as any,
      });

  for (const field of fields) {
    const existingField = await prisma.formField.findFirst({
      where: { formTemplateId: form.id, label: field.label },
    });
    if (existingField) {
      await prisma.formField.update({
        where: { id: existingField.id },
        data: field as any,
      });
    } else {
      await prisma.formField.create({
        data: { ...field, formTemplateId: form.id } as any,
      });
    }
  }
  const formCreated = existingForm ? 0 : 1;

  console.log(
    `✅ BCM-maler: ${docCreated} dokumentmaler opprettet (${docSkipped} eksisterte), ${formCreated} skjemamal opprettet`,
  );
}
