/**
 * HR-dokumentmaler — globale DocumentTemplate-entries tenants kan hente.
 *
 * Lovforankring:
 * - Arbeidsavtale: AML § 14-5 (skriftlighetskrav, 7 dager) og § 14-6 (minimumskrav innhold)
 * - Midlertidig ansettelse: AML § 14-9 (grunnlag)
 * - Sluttattest: AML § 15-15 (rett til attest)
 * - Jobbtilbud: Ikke lovpålagt, men samsvarer med § 14-6 for konsistens
 */

export interface HrDocumentTemplateEntry {
  name: string;
  category: "HR";
  description: string;
  bodyHtml: string;
  variables: string[];
  industryScope: string[];
  legalReference: string;
  defaultReviewIntervalMonths: number;
}

const SHARED_VARIABLES = [
  "bedriftsnavn",
  "orgNummer",
  "adresse",
  "dagligLeder",
  "ansattNavn",
  "ansattFodselsdato",
  "stillingstittel",
  "arbeidssted",
  "tiltredelsesdato",
  "lonn",
  "arbeidstid",
  "feriedager",
  "oppsigelsestid",
  "provetid",
] as const;

// AML § 14-6 etter 1. juli 2024: parter, arbeidssted, stilling, startdato,
// varighet/grunnlag ved midlertidig (§ 14-9), prøvetid, ferie, oppsigelse,
// lønn/tillegg, arbeidstid, vaktendringer/overtid, tariff, innleier,
// kompetanseutvikling, sosiale ytelser.
const arbeidsavtaleHtml = `<h2>Arbeidsavtale</h2>
<p><em>I henhold til arbeidsmiljøloven §§ 14-5 og 14-6</em></p>

<h3>1. Avtalens parter</h3>
<p><strong>Arbeidsgiver:</strong> {{bedriftsnavn}}, org.nr. {{orgNummer}}, {{adresse}}</p>
<p><strong>Arbeidstaker:</strong> {{ansattNavn}}, født {{ansattFodselsdato}}</p>

<h3>2. Stilling og arbeidssted</h3>
<p><strong>Stillingstittel:</strong> {{stillingstittel}}</p>
<p><strong>Arbeidssted:</strong> {{arbeidssted}}</p>
<p>Arbeidsgiver kan gjøre endringer i arbeidsoppgaver innenfor styringsretten.</p>

<h3>3. Tiltredelse</h3>
<p><strong>Tiltredelsesdato:</strong> {{tiltredelsesdato}}</p>
<p>Ansettelsen er fast med mindre annet er spesifisert i punkt 4.</p>

<h3>4. Varighet</h3>
<p>Ansettelsen er <strong>fast</strong>.</p>
<p><em>(Ved midlertidig ansettelse: angi grunnlag etter AML § 14-9 og forventet varighet/sluttdato)</em></p>

<h3>5. Prøvetid</h3>
<p>Det er avtalt prøvetid på {{provetid}}. I prøvetiden gjelder 14 dagers gjensidig oppsigelse jf. AML § 15-3 (7).</p>

<h3>6. Lønn og godtgjørelser</h3>
<p><strong>Bruttolønn:</strong> {{lonn}} kr per måned/år</p>
<p>Lønn utbetales den siste virkedag i måneden. Pensjonsordning følger lov om obligatorisk tjenestepensjon.</p>

<h3>7. Arbeidstid</h3>
<p><strong>Avtalt arbeidstid:</strong> {{arbeidstid}} timer per uke.</p>
<p>Arbeidstiden følger AML kapittel 10. Eventuell overtid kompenseres iht. AML § 10-6.</p>

<h3>8. Ferie</h3>
<p>Ferie og feriepenger følger ferieloven. Arbeidstaker har rett til {{feriedager}} feriedager per år.</p>

<h3>9. Oppsigelse</h3>
<p>Gjensidig oppsigelsesfrist er {{oppsigelsestid}} jf. AML § 15-3.</p>

<h3>10. Tariffavtale</h3>
<p><em>Eventuell tariffavtale som regulerer arbeidsforholdet angis her.</em></p>

<h3>11. Øvrige forhold</h3>
<ul>
  <li>Rett til kompetanseutvikling iht. bedriftens retningslinjer (AML § 14-6 (1) bokstav o)</li>
  <li>Sosiale ytelser: pensjon, forsikring og eventuelle andre ytelser iht. bedriftens ordninger (AML § 14-6 (1) bokstav p)</li>
</ul>

<h3>12. Underskrift</h3>
<table>
  <tr>
    <td style="width:50%"><p>____________________________</p><p>Arbeidsgiver: {{dagligLeder}}</p></td>
    <td style="width:50%"><p>____________________________</p><p>Arbeidstaker: {{ansattNavn}}</p></td>
  </tr>
  <tr>
    <td><p>Sted/dato: _________________</p></td>
    <td><p>Sted/dato: _________________</p></td>
  </tr>
</table>`;

const jobbtilbudHtml = `<h2>Jobbtilbud</h2>

<p>Til: <strong>{{ansattNavn}}</strong></p>
<p>Fra: <strong>{{bedriftsnavn}}</strong>, org.nr. {{orgNummer}}</p>

<h3>Vi har gleden av å tilby deg stilling som:</h3>
<p><strong>{{stillingstittel}}</strong></p>

<h3>Hovedvilkår</h3>
<table>
  <tr><td><strong>Arbeidssted:</strong></td><td>{{arbeidssted}}</td></tr>
  <tr><td><strong>Tiltredelsesdato:</strong></td><td>{{tiltredelsesdato}}</td></tr>
  <tr><td><strong>Bruttolønn:</strong></td><td>{{lonn}} kr per måned/år</td></tr>
  <tr><td><strong>Arbeidstid:</strong></td><td>{{arbeidstid}} timer per uke</td></tr>
  <tr><td><strong>Prøvetid:</strong></td><td>{{provetid}}</td></tr>
  <tr><td><strong>Ferie:</strong></td><td>{{feriedager}} dager</td></tr>
  <tr><td><strong>Oppsigelsestid:</strong></td><td>{{oppsigelsestid}}</td></tr>
</table>

<p>Tilbudet er gyldig i 14 dager fra mottaksdato. Fullstendig arbeidsavtale iht. AML § 14-6 vil bli utarbeidet ved aksept.</p>

<h3>Aksept</h3>
<p>Jeg aksepterer tilbudet om stilling som {{stillingstittel}} hos {{bedriftsnavn}}.</p>

<table>
  <tr>
    <td style="width:50%"><p>____________________________</p><p>{{ansattNavn}}</p></td>
    <td style="width:50%"><p>Dato: _________________</p></td>
  </tr>
</table>`;

const midlertidigHtml = `<h2>Arbeidsavtale — midlertidig ansettelse</h2>
<p><em>I henhold til AML §§ 14-5, 14-6 og 14-9</em></p>

<h3>1. Avtalens parter</h3>
<p><strong>Arbeidsgiver:</strong> {{bedriftsnavn}}, org.nr. {{orgNummer}}, {{adresse}}</p>
<p><strong>Arbeidstaker:</strong> {{ansattNavn}}, født {{ansattFodselsdato}}</p>

<h3>2. Stilling og arbeidssted</h3>
<p><strong>Stillingstittel:</strong> {{stillingstittel}}</p>
<p><strong>Arbeidssted:</strong> {{arbeidssted}}</p>

<h3>3. Ansettelsens varighet og grunnlag (AML § 14-9)</h3>
<p><strong>Fra:</strong> {{tiltredelsesdato}}</p>
<p><strong>Til:</strong> <em>[Angi sluttdato eller betingelse]</em></p>
<p><strong>Grunnlag for midlertidig ansettelse (kryss av):</strong></p>
<ul>
  <li>☐ Arbeidet er av midlertidig karakter, jf. § 14-9 (2) bokstav a</li>
  <li>☐ Vikariat for [navn/stilling], jf. § 14-9 (2) bokstav b</li>
  <li>☐ Praksisarbeid, jf. § 14-9 (2) bokstav c</li>
  <li>☐ Deltaker i arbeidsmarkedstiltak, jf. § 14-9 (2) bokstav d</li>
</ul>
<p><em>Merk: Etter mer enn 3 år sammenhengende midlertidig ansettelse har arbeidstaker rett til fast ansettelse jf. AML § 14-9 (7).</em></p>

<h3>4. Prøvetid</h3>
<p>{{provetid}} — gjelder bare dersom midlertidigheten varer lenge nok.</p>

<h3>5. Lønn</h3>
<p><strong>Bruttolønn:</strong> {{lonn}} kr per måned/år</p>

<h3>6. Arbeidstid</h3>
<p>{{arbeidstid}} timer per uke.</p>

<h3>7. Ferie og oppsigelse</h3>
<p>Ferie: {{feriedager}} dager. Oppsigelse: {{oppsigelsestid}}.</p>

<h3>8. Underskrift</h3>
<table>
  <tr>
    <td style="width:50%"><p>____________________________</p><p>Arbeidsgiver: {{dagligLeder}}</p></td>
    <td style="width:50%"><p>____________________________</p><p>Arbeidstaker: {{ansattNavn}}</p></td>
  </tr>
</table>`;

// AML § 15-15: Arbeidstaker som fratrer har krav på attest.
// Attesten skal inneholde: arbeidstakers navn, fødselsdato,
// hva arbeidet har bestått i, og arbeidsforholdets varighet.
const sluttattestHtml = `<h2>Sluttattest</h2>
<p><em>I henhold til arbeidsmiljøloven § 15-15</em></p>

<p>Det bekreftes herved at:</p>

<p><strong>{{ansattNavn}}</strong>, født {{ansattFodselsdato}}</p>

<p>har vært ansatt hos <strong>{{bedriftsnavn}}</strong>, org.nr. {{orgNummer}}, {{adresse}}</p>

<table>
  <tr><td><strong>Stilling:</strong></td><td>{{stillingstittel}}</td></tr>
  <tr><td><strong>Ansatt fra:</strong></td><td>{{tiltredelsesdato}}</td></tr>
  <tr><td><strong>Siste arbeidsdag:</strong></td><td><em>[Angi dato]</em></td></tr>
</table>

<h3>Arbeidsoppgaver</h3>
<p><em>[Beskriv hovedoppgaver og ansvarsområder]</em></p>

<p>Denne attesten er utstedt i henhold til arbeidsmiljøloven § 15-15.</p>

<table>
  <tr>
    <td style="width:50%">
      <p>____________________________</p>
      <p>{{dagligLeder}}</p>
      <p>{{bedriftsnavn}}</p>
    </td>
    <td style="width:50%">
      <p>Sted/dato: _________________</p>
    </td>
  </tr>
</table>`;

export function getHrDocumentTemplateLibrary(): HrDocumentTemplateEntry[] {
  return [
    {
      name: "Arbeidsavtale (fast)",
      category: "HR",
      description:
        "Standard arbeidsavtale for fast ansettelse iht. AML §§ 14-5 og 14-6. Inneholder alle lovpålagte minimumskrav etter endringene 1. juli 2024.",
      bodyHtml: arbeidsavtaleHtml,
      variables: [...SHARED_VARIABLES],
      industryScope: ["all"],
      legalReference: "AML § 14-5, § 14-6",
      defaultReviewIntervalMonths: 12,
    },
    {
      name: "Jobbtilbud",
      category: "HR",
      description:
        "Formelt jobbtilbud med hovedvilkår. Ikke lovpålagt, men sikrer konsistens med fremtidig arbeidsavtale (AML § 14-6).",
      bodyHtml: jobbtilbudHtml,
      variables: [...SHARED_VARIABLES],
      industryScope: ["all"],
      legalReference: "Jf. AML § 14-6 (konsistens)",
      defaultReviewIntervalMonths: 12,
    },
    {
      name: "Arbeidsavtale (midlertidig)",
      category: "HR",
      description:
        "Arbeidsavtale for midlertidig ansettelse. Krever grunnlag etter AML § 14-9 og inneholder alle krav fra § 14-6.",
      bodyHtml: midlertidigHtml,
      variables: [...SHARED_VARIABLES],
      industryScope: ["all"],
      legalReference: "AML § 14-5, § 14-6, § 14-9",
      defaultReviewIntervalMonths: 12,
    },
    {
      name: "Sluttattest",
      category: "HR",
      description:
        "Sluttattest ved fratreden iht. AML § 15-15. Inneholder arbeidstakers navn, fødselsdato, hva arbeidet har bestått i, og arbeidsforholdets varighet.",
      bodyHtml: sluttattestHtml,
      variables: [...SHARED_VARIABLES],
      industryScope: ["all"],
      legalReference: "AML § 15-15",
      defaultReviewIntervalMonths: 12,
    },
  ];
}
