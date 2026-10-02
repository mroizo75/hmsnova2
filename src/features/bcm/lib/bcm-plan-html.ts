import { resolveBcmLegalModules } from "@/features/bcm/lib/bcm-compliance";
import type { ValidatedBcmWizardDraft } from "@/features/bcm/schemas/bcm-wizard.schema";

export function escapeBcmHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function paragraphs(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeBcmHtml(line)}</p>`)
    .join("");
}

function list(items: readonly string[]): string {
  return `<ul>${items.map((item) => `<li>${escapeBcmHtml(item)}</li>`).join("")}</ul>`;
}

function optionalSection(title: string, value: string, legalBasis?: string): string {
  if (!value.trim()) return "";
  const basis = legalBasis ? `<p><em>${escapeBcmHtml(legalBasis)}</em></p>` : "";
  return `<h2>${escapeBcmHtml(title)}</h2>${basis}${paragraphs(value)}`;
}

export function generateBcmPlanHtml(data: ValidatedBcmWizardDraft): string {
  const modules = resolveBcmLegalModules(data);
  const teamRows = data.crisisTeam
    .map(
      (member) =>
        `<tr><td>${escapeBcmHtml(member.name)}</td><td>${escapeBcmHtml(member.role)}</td><td>${escapeBcmHtml(member.phone)}</td><td>${escapeBcmHtml(member.email)}</td><td>${escapeBcmHtml(member.substitute)}</td></tr>`,
    )
    .join("");

  return `
<h1>Beredskapsplan</h1>
<p><strong>Status:</strong> Kontrollert utkast – må godkjennes i dokumentflyten</p>
<p><strong>Opprettet:</strong> ${new Date().toLocaleDateString("nb-NO")}</p>
<p><strong>Neste systematiske gjennomgang:</strong> ${escapeBcmHtml(data.nextReviewDate)}</p>
<p>Planen skal også gjennomgås ved relevante endringer og etter hendelser eller øvelser.</p>

<h2>1. Virksomhet og omfang</h2>
${paragraphs(data.organizationScope)}
<h3>Lokasjoner og arbeidsformer</h3>
${paragraphs(data.locationsAndWork)}

<h2>2. Rettslig og risikobasert grunnlag</h2>
${modules
  .map(
    (module) =>
      `<h3>${escapeBcmHtml(module.title)}</h3><p><strong>Grunnlag:</strong> ${escapeBcmHtml(module.legalBasis)}</p><p>${escapeBcmHtml(module.reason)}</p>`,
  )
  .join("")}
<p><strong>Risikounderlag:</strong></p>
${paragraphs(data.riskAssessmentReference)}
<p><strong>Medvirkning:</strong></p>
${paragraphs(data.employeeParticipation)}
${optionalSection("Vurdering av særregulerte aktiviteter", data.specialistAssessment)}

<h2>3. Kritiske prosesser og scenarioer</h2>
<h3>Kritiske prosesser</h3>
${list(data.criticalProcesses)}
<h3>Risikoscenarier</h3>
${list(data.riskScenarios)}

<h2>4. Ansvar og kontakt</h2>
<table>
<thead><tr><th>Navn</th><th>Rolle/fullmakt</th><th>Telefon</th><th>E-post</th><th>Stedfortreder</th></tr></thead>
<tbody>${teamRows}</tbody>
</table>
<h3>Varslingsrekkefølge</h3>
${paragraphs(data.alertingPlan)}

<h2>5. Umiddelbar innsats</h2>
${paragraphs(data.emergencyActions)}
${optionalSection(
  "Evakuering og redning ved brann",
  data.evacuationPlan,
  "Forskrift om brannforebygging § 12",
)}
${optionalSection(
  "Kjemikalienødsituasjoner",
  data.chemicalEmergencyPlan,
  "Forskrift om utførelse av arbeid § 3-15",
)}
${optionalSection(
  "Beredskap ved farlig stoff",
  data.dangerousSubstancePlan,
  "Forskrift om håndtering av farlig stoff § 19",
)}

<h2>6. Førstehjelp og beredskapsressurser</h2>
${paragraphs(data.firstAidAndResources)}

<h2>7. Gjenoppretting og sikker normalisering</h2>
<p><em>Risikobasert kontinuitetsplanlegging. ISO 22301 er en frivillig standard eller et avtalekrav.</em></p>
${paragraphs(data.recoveryPlan)}

<h2>8. Krisekommunikasjon</h2>
${paragraphs(data.communicationPlan)}

<h2>9. Opplæring, øvelser og forbedring</h2>
<h3>Opplæring og informasjon</h3>
${paragraphs(data.trainingPlan)}
<h3>Øvelser og oppfølging</h3>
${paragraphs(data.exercisePlan)}

<h2>10. Verifisering</h2>
<p>Ansvarlig bruker har ved opprettelsen bekreftet at virksomhetsopplysninger, risikogrunnlag,
kontaktdata, fysiske beredskapstiltak, medvirkning, opplæringsplan og aktuelle særkrav er kontrollert.
Bekreftelsene erstatter ikke fysisk kontroll, myndighetsavklaring eller fagkyndig vurdering.</p>
`.trim();
}
