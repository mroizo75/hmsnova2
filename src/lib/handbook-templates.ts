/**
 * Bransjemaler for HMS-hånboken.
 *
 * Struktur:
 * - UNIVERSAL_CONTENT: Innhold som gjelder alle bransjer (grunnmal)
 * - INDUSTRY_OVERRIDES: Bransjespesifikke tillegg/overstyringer per seksjon
 *
 * Variabler som erstattes ved import:
 * {{bedriftsnavn}}, {{orgNummer}}, {{dagligLeder}}, {{hmsAnsvarlig}},
 * {{verneombud}}, {{brannvernleder}}, {{adresse}}, {{bransje}}
 */

export type HandbookTemplateSectionContent = {
  sectionKey: string;
  content: string;
};

export type HandbookTemplateDefinition = {
  id: string;
  name: string;
  description: string;
  industry: string;
  sections: HandbookTemplateSectionContent[];
};

export const TEMPLATE_VARIABLES = [
  "bedriftsnavn",
  "orgNummer",
  "dagligLeder",
  "hmsAnsvarlig",
  "verneombud",
  "brannvernleder",
  "adresse",
  "bransje",
] as const;

export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

// ── Universalt innhold (gjelder alle bransjer) ───────────────────────────

const UNIVERSAL_CONTENT: Record<string, string> = {
  s1: `<h3>HMS-policy</h3>
<p>{{bedriftsnavn}} skal drive sin virksomhet slik at hensynet til ansattes helse, miljø og sikkerhet ivaretas på en systematisk og dokumentert måte. Alle ansatte har rett til et fullt forsvarlig arbeidsmiljø, jf. AML § 4-1.</p>
<p><strong>Vår forpliktelse:</strong></p>
<ul>
  <li>Alle arbeidsoppgaver skal utføres uten risiko for skade på mennesker, miljø eller materiell</li>
  <li>HMS-arbeidet skal være en integrert del av all virksomhet</li>
  <li>Alle ansatte skal ha nødvendig kompetanse og opplæring</li>
  <li>Vi skal kontinuerlig forbedre våre HMS-rutiner basert på erfaringer og ny kunnskap</li>
</ul>
<h3>HMS-mål for inneværende år</h3>
<p>Følgende konkrete og målbare HMS-mål er fastsatt for {{bedriftsnavn}}:</p>
<ol>
  <li><strong>Null alvorlige arbeidsulykker</strong> — ingen hendelser som medfører fravær utover skadedagen</li>
  <li><strong>Sykefravær under 5 %</strong> — totalt sykefravær målt per kvartal</li>
  <li><strong>100 % gjennomført lovpålagt opplæring</strong> — alle ansatte skal ha fullført påkrevd HMS-opplæring</li>
  <li><strong>Minimum 2 vernerunder per år</strong> — dokumenterte vernerunder med oppfølging av funn</li>
  <li><strong>Alle avvik lukket innen fristen</strong> — gjennomsnittlig lukketid under 14 dager</li>
</ol>
<p>Målene gjennomgås og evalueres i ledelsens gjennomgang minimum årlig.</p>`,

  s2: `<h3>Daglig leder</h3>
<p><strong>{{dagligLeder}}</strong> har det overordnede ansvaret for HMS i {{bedriftsnavn}}, jf. AML § 3-1. Dette innebærer ansvar for at:</p>
<ul>
  <li>Internkontrollsystemet er etablert, dokumentert og vedlikeholdt</li>
  <li>Tilstrekkelige ressurser er avsatt til HMS-arbeidet</li>
  <li>HMS-mål fastsettes og følges opp</li>
</ul>
<h3>HMS-ansvarlig</h3>
<p><strong>{{hmsAnsvarlig}}</strong> er utpekt som HMS-ansvarlig og koordinerer det daglige HMS-arbeidet. Oppgavene inkluderer:</p>
<ul>
  <li>Holde HMS-håndboken oppdatert</li>
  <li>Koordinere risikovurderinger, vernerunder og opplæring</li>
  <li>Følge opp avvik og hendelser</li>
  <li>Rapportere HMS-status til ledelsen</li>
</ul>
<h3>Verneombud</h3>
<p><strong>{{verneombud}}</strong> er valgt som verneombud, jf. AML § 6-1. Verneombudet skal ivareta arbeidstakernes interesser i saker som angår arbeidsmiljøet, og har rett til å stanse farlig arbeid (AML § 6-3).</p>
<h3>Brannvernleder</h3>
<p><strong>{{brannvernleder}}</strong> er utpekt som brannvernleder og har ansvar for at brannverntiltak gjennomføres i henhold til forskrift om brannforebygging.</p>
<h3>Organisasjonskart</h3>
<p><em>Se organisasjonskart i systemet for fullstendig oversikt over ansvarsfordeling.</em></p>`,

  s2b: `<h3>Ansattes medvirkning</h3>
<p>{{bedriftsnavn}} legger til rette for at ansatte aktivt medvirker i HMS-arbeidet, jf. IK-HMS § 5 nr. 3. Medvirkning skjer gjennom:</p>
<ul>
  <li><strong>Verneombudet</strong> — representerer ansatte i HMS-spørsmål og deltar i vernerunder, risikovurderinger og ledelsens gjennomgang</li>
  <li><strong>Avviks- og RUH-rapportering</strong> — alle ansatte oppfordres til å melde avvik og uønskede hendelser via HMS Nova</li>
  <li><strong>Medarbeiderundersøkelser</strong> — årlige undersøkelser for å kartlegge arbeidsmiljøet</li>
  <li><strong>Informasjonsmøter</strong> — jevnlige møter der HMS-saker tas opp</li>
</ul>
<h3>Arbeidsmiljøutvalg (AMU)</h3>
<p>Virksomheter med 50 eller flere ansatte skal ha et arbeidsmiljøutvalg, jf. AML § 7-1. Virksomheter med 20-49 ansatte skal ha AMU dersom en av partene krever det.</p>
<p>AMU skal behandle spørsmål om bedriftshelsetjeneste, vernetjeneste, opplæring, arbeidsmiljøkartlegginger og årlige HMS-rapporter.</p>`,

  s2c: `<h3>Gjeldende HMS-lovgivning</h3>
<p>Følgende lover og forskrifter er av særlig viktighet for {{bedriftsnavn}} innen {{bransje}}:</p>
<h4>Grunnleggende HMS-lovgivning</h4>
<ul>
  <li><strong>Arbeidsmiljøloven (AML)</strong> — Lov om arbeidsmiljø, arbeidstid og stillingsvern</li>
  <li><strong>Internkontrollforskriften (IK-HMS)</strong> — Forskrift om systematisk HMS-arbeid i virksomheter</li>
  <li><strong>Arbeidsplassforskriften</strong> — Krav til utforming og innredning av arbeidsplasser</li>
  <li><strong>Forskrift om organisering, ledelse og medvirkning</strong></li>
  <li><strong>Forskrift om utførelse av arbeid</strong></li>
</ul>
<h4>Brann og beredskap</h4>
<ul>
  <li><strong>Brann- og eksplosjonsvernloven</strong></li>
  <li><strong>Forskrift om brannforebygging</strong></li>
</ul>
<h4>Personvern</h4>
<ul>
  <li><strong>Personopplysningsloven / GDPR</strong> — Behandling av personopplysninger i HMS-arbeidet</li>
</ul>
<p><em>Listen oppdateres ved behov og gjennomgås minimum årlig. Bransjespesifikke forskrifter er lagt til under.</em></p>`,

  s3: `<h3>Risikovurderingsprosessen</h3>
<p>{{bedriftsnavn}} gjennomfører systematiske risikovurderinger for å identifisere farer og vurdere risiko, jf. IK-HMS § 5 nr. 6.</p>
<h4>Metode</h4>
<p>Vi benytter en risikomatrise der sannsynlighet (1-5) og konsekvens (1-5) vurderes for hver identifisert fare. Risikoverdi = sannsynlighet × konsekvens.</p>
<table>
  <tr><th>Risikoverdi</th><th>Nivå</th><th>Tiltak</th></tr>
  <tr><td>1-4</td><td>Lav (grønn)</td><td>Overvåk, ingen umiddelbare tiltak nødvendig</td></tr>
  <tr><td>5-9</td><td>Middels (gul)</td><td>Tiltak bør iverksettes innen rimelig tid</td></tr>
  <tr><td>10-15</td><td>Høy (oransje)</td><td>Tiltak skal iverksettes snarest</td></tr>
  <tr><td>16-25</td><td>Kritisk (rød)</td><td>Arbeidet stanses inntil risikoen er redusert</td></tr>
</table>
<h4>Tiltakshierarki</h4>
<ol>
  <li>Eliminere faren</li>
  <li>Substituere med noe mindre farlig</li>
  <li>Tekniske tiltak (vern, barrierer)</li>
  <li>Administrative tiltak (rutiner, opplæring)</li>
  <li>Personlig verneutstyr (siste utvei)</li>
</ol>
<h4>Gjennomføring</h4>
<p>Risikovurderinger gjennomføres ved:</p>
<ul>
  <li>Oppstart av nye aktiviteter eller prosesser</li>
  <li>Endringer i arbeidsmetoder, utstyr eller lokaler</li>
  <li>Etter alvorlige hendelser eller nestenulykker</li>
  <li>Minimum årlig gjennomgang av eksisterende vurderinger</li>
</ul>
<p><em>Alle risikovurderinger registreres og følges opp i HMS Nova → Risikostyring.</em></p>`,

  s4: `<h3>Avvikshåndtering</h3>
<p>Avvik er ethvert brudd på krav fastsatt i HMS-lovgivningen, interne rutiner eller standarder. Alle ansatte har plikt til å melde avvik, jf. AML § 2-3.</p>
<h4>Avviksprosess</h4>
<ol>
  <li><strong>Registrering</strong> — Avviket meldes i HMS Nova av den som oppdager det</li>
  <li><strong>Umiddelbar handling</strong> — Fare sikres/fjernes. Ved akutt fare stanses arbeidet</li>
  <li><strong>Behandling</strong> — HMS-ansvarlig vurderer alvorlighetsgrad (1-5) og tildeler ansvarlig</li>
  <li><strong>Årsaksanalyse</strong> — Rotårsak identifiseres for å hindre gjentakelse</li>
  <li><strong>Korrigerende tiltak</strong> — Tiltak iverksettes med ansvarlig og frist</li>
  <li><strong>Effektivitetsvurdering</strong> — Verifiser at tiltaket faktisk virker</li>
  <li><strong>Lukking</strong> — Avviket lukkes når tiltak er verifisert</li>
</ol>
<h4>Meldeplikt til Arbeidstilsynet og politi</h4>
<p>Ved <strong>alvorlig personskade eller dødsfall</strong> skal Arbeidstilsynet og politiet varsles <strong>umiddelbart</strong> (muntlig), jf. AML § 5-2. Skriftlig bekreftelse sendes senest påfølgende dag.</p>
<p>Alvorlige hendelser inkluderer:</p>
<ul>
  <li>Dødsfall</li>
  <li>Alvorlig personskade (brudd, amputasjoner, øyeskader, etc.)</li>
  <li>Hendelser som kunne medført alvorlig skade (nestenulykker av alvorlig karakter)</li>
</ul>
<h4>RUH — Rapportering av uønskede hendelser</h4>
<p>Ansatte oppfordres til å melde alle uønskede hendelser og nestenulykker, også de uten personskade. RUH-data brukes til trendanalyse og forebygging.</p>
<p><em>Alle avvik og RUH registreres og følges opp i HMS Nova → Avvik & hendelser.</em></p>`,

  s5: `<h3>Kompetansekrav</h3>
<p>{{bedriftsnavn}} skal sørge for at alle ansatte har tilstrekkelig kompetanse til å utføre arbeidet sikkert, jf. AML § 3-2 og IK-HMS § 5 nr. 2.</p>
<h4>Obligatorisk HMS-opplæring</h4>
<ul>
  <li><strong>Grunnleggende HMS-opplæring</strong> — Alle nyansatte skal gjennomføre HMS-introduksjon før selvstendig arbeid</li>
  <li><strong>HMS for ledere</strong> — Alle med personalansvar skal gjennomføre HMS-kurs (40 timer), jf. AML § 3-5</li>
  <li><strong>Brannvernopplæring</strong> — Alle ansatte skal kjenne rømningsveier, slokkeutstyr og evakueringsprosedyre</li>
  <li><strong>Førstehjelp</strong> — Tilstrekkelig antall ansatte skal ha førstehjelpsopplæring</li>
</ul>
<h4>Opplæring ved endringer</h4>
<p>Opplæring gjennomføres ved:</p>
<ul>
  <li>Nyansettelse eller omplassering</li>
  <li>Nye arbeidsmetoder, rutiner eller utstyr</li>
  <li>Endring i regelverk</li>
</ul>
<h4>Dokumentasjon</h4>
<p>All gjennomført opplæring dokumenteres med deltakerliste, innhold og dato. Kompetansebevis og sertifikater lagres digitalt.</p>
<p><em>Kompetanseoversikt og opplæringsplan administreres i HMS Nova → Kompetanse.</em></p>`,

  s6: `<h3>Sikker jobbanalyse (SJA)</h3>
<p>SJA gjennomføres før arbeid med vesentlig risiko. Analysen identifiserer farer, vurderer risiko og fastlegger nødvendige tiltak og barrierer.</p>
<h4>Når skal SJA gjennomføres?</h4>
<ul>
  <li>Arbeid som ikke dekkes av eksisterende rutiner/prosedyrer</li>
  <li>Arbeid med særlig høy risiko</li>
  <li>Arbeid i ukjente eller endrede omgivelser</li>
  <li>Arbeid med farlige stoffer eller utstyr</li>
</ul>
<h4>Daglige kontroller</h4>
<p>Daglige sjekker gjennomføres på arbeidsutstyr og arbeidsområder i henhold til bransjens krav og interne prosedyrer.</p>
<p><em>SJA registreres og arkiveres i HMS Nova → SJA.</em></p>`,

  s7: `<h3>Brannvernorganisering</h3>
<p>{{bedriftsnavn}} har etablert brannvernorganisering i henhold til brann- og eksplosjonsvernloven og forskrift om brannforebygging.</p>
<h4>Brannvernleder</h4>
<p>{{brannvernleder}} er utpekt som brannvernleder og har ansvar for:</p>
<ul>
  <li>Vedlikehold av slokkeutstyr og brannvarslingsanlegg</li>
  <li>Gjennomføring av brannøvelser (minimum årlig)</li>
  <li>Oppdatering av evakueringsplan og rømningsskilt</li>
  <li>Kontakt med brannvesenet</li>
</ul>
<h4>Evakueringsplan</h4>
<p>Evakueringsplan er oppslått synlig på alle etasjer/avdelinger. Planen viser rømningsveier, samlingsplass og ansvarlige for evakuering.</p>
<h4>Brannøvelser</h4>
<p>Brannøvelser gjennomføres minimum 1 gang per år. Resultat og forbedringsområder dokumenteres.</p>
<h4>Slokkeutstyr</h4>
<p>Brannslokkere kontrolleres årlig av godkjent firma. Brannslanger og sprinkleranlegg kontrolleres etter gjeldende forskrift.</p>
<p><em>Brannøvelser og kontroller registreres i HMS Nova → Brannvern.</em></p>`,

  s8: `<h3>Vernerunder</h3>
<p>Vernerunder gjennomføres systematisk for å avdekke farer og mangler i arbeidsmiljøet, jf. AML § 6-2.</p>
<h4>Frekvens og gjennomføring</h4>
<ul>
  <li>Vernerunder gjennomføres minimum <strong>2 ganger per år</strong> (oftere ved behov)</li>
  <li>Verneombudet <strong>skal delta</strong> på alle vernerunder</li>
  <li>Ledelsen eller HMS-ansvarlig gjennomfører runden med sjekkliste tilpasset arbeidsstedet</li>
</ul>
<h4>Sjekkliste</h4>
<p>Sjekklisten dekker som minimum:</p>
<ul>
  <li>Orden og renhold</li>
  <li>Belysning og ventilasjon</li>
  <li>Ergonomi og arbeidsstasjoner</li>
  <li>Maskiner og utstyr</li>
  <li>Brannvern og rømningsveier</li>
  <li>Førstehjelpsutstyr</li>
  <li>Merking og skilting</li>
  <li>Personlig verneutstyr</li>
</ul>
<h4>Oppfølging</h4>
<p>Funn fra vernerunder registreres som avvik i HMS Nova med ansvarlig og frist. Vernerunderappen trekkes ut som statistikk i ledelsens gjennomgang.</p>
<p><em>Vernerunder planlegges og gjennomføres via HMS Nova → Vernerunder.</em></p>`,

  s9: `<h3>Ledelsens gjennomgang</h3>
<p>Ledelsens gjennomgang gjennomføres for å evaluere og forbedre internkontrollen, jf. IK-HMS § 5 nr. 8.</p>
<h4>Frekvens</h4>
<p>Minimum <strong>1 gang per år</strong>, fortrinnsvis i Q1 med gjennomgang av foregående år.</p>
<h4>Deltakere</h4>
<ul>
  <li>Daglig leder</li>
  <li>HMS-ansvarlig</li>
  <li>Verneombud</li>
  <li>Eventuelt avdelingsledere og BHT-representant</li>
</ul>
<h4>Agenda</h4>
<ol>
  <li>Status på HMS-mål og KPI-er</li>
  <li>Gjennomgang av avvik, hendelser og trender</li>
  <li>Resultater fra risikovurderinger og vernerunder</li>
  <li>Status på opplæring og kompetanse</li>
  <li>Sykefravær og arbeidsmiljøundersøkelser</li>
  <li>Status på tiltak fra forrige gjennomgang</li>
  <li>Behov for endringer i HMS-mål, rutiner eller organisering</li>
  <li>Budsjett og ressursbehov for kommende periode</li>
</ol>
<h4>Beslutninger</h4>
<p>Referat med beslutninger og nye tiltak utarbeides og distribueres til alle deltakere. Tiltak legges inn i HMS Nova med ansvarlig og frist.</p>`,

  s10: `<h3>Dokumentstyring</h3>
<p>All HMS-dokumentasjon i {{bedriftsnavn}} styres gjennom HMS Nova, som sikrer versjonskontroll, tilgangsstyring og sporbarhet.</p>
<h4>Styrende dokumenter</h4>
<ul>
  <li><strong>HMS-håndboken</strong> — overordnet styringsdokument med versjonskontroll og signering</li>
  <li><strong>Rutiner og instrukser</strong> — operative prosedyrer med lesebekreftelse</li>
  <li><strong>Risikovurderinger</strong> — daterte og oppdaterte vurderinger med tiltaksplan</li>
  <li><strong>Sjekklister</strong> — for vernerunder, SJA og daglige kontroller</li>
</ul>
<h4>Arkivering og oppbevaring</h4>
<p>Digitale dokumenter lagres i HMS Nova med automatisk versjonering. Fysiske dokumenter som sertifikater og kursbevis skannes og lagres digitalt.</p>
<h4>Tilgangsstyring</h4>
<p>Tilgang til HMS-dokumenter styres basert på rolle. Alle ansatte har lesetilgang til gjeldende hånbok og rutiner. Redigeringsrettigheter er begrenset til HMS-ansvarlig og ledelse.</p>
<p><em>Dokumenter administreres i HMS Nova → Dokumenter.</em></p>`,

  s11: `<h3>Fysisk arbeidsmiljø</h3>
<p>Kartlegging av fysisk arbeidsmiljø gjennomføres som del av risikovurderinger og vernerunder. Følgende forhold vurderes:</p>
<ul>
  <li>Ergonomi og arbeidsstasjoner</li>
  <li>Støy og vibrasjoner</li>
  <li>Belysning</li>
  <li>Inneklima og ventilasjon</li>
  <li>Tungt eller ensformig arbeid</li>
</ul>
<h3>Psykososialt arbeidsmiljø</h3>
<p>{{bedriftsnavn}} skal ha et arbeidsmiljø som fremmer trivsel og forebygger psykiske belastninger, jf. AML § 4-3. Dette inkluderer:</p>
<ul>
  <li><strong>Arbeidsmiljøundersøkelser</strong> — gjennomføres regelmessig for å kartlegge trivsel, stress og relasjoner</li>
  <li><strong>Medarbeidersamtaler</strong> — årlige samtaler med fokus på utvikling og arbeidsmiljø</li>
  <li><strong>Forebygging av trakassering</strong> — nulltoleranse for mobbing, trakassering og diskriminering</li>
  <li><strong>Oppfølging av sykefravær</strong> — dialogmøter og tilrettelegging iht. folketrygdloven</li>
</ul>
<p><em>Psykososialt arbeidsmiljø følges opp via HMS Nova → Arbeidsmiljø.</em></p>`,

  s11b: `<h3>Varslingsrutine</h3>
<p>Alle ansatte i {{bedriftsnavn}} har rett til å varsle om kritikkverdige forhold i virksomheten, jf. AML § 2 A-1. Kritikkverdige forhold inkluderer brudd på lovregler, interne regler, etiske retningslinjer eller alminnelig oppfatning av hva som er forsvarlig.</p>
<h4>Intern varslingskanal</h4>
<p>Varsling kan gjøres til:</p>
<ol>
  <li><strong>Nærmeste leder</strong> (muntlig eller skriftlig)</li>
  <li><strong>HMS-ansvarlig</strong> ({{hmsAnsvarlig}})</li>
  <li><strong>Verneombudet</strong> ({{verneombud}})</li>
  <li><strong>Daglig leder</strong> ({{dagligLeder}})</li>
</ol>
<p>Varsling kan også gjøres anonymt via HMS Nova. Varslerens identitet behandles konfidensielt og gjøres bare tilgjengelig for personer som har et dokumentert behov for opplysningen. Absolutt anonymitet kan ikke garanteres dersom lov, domstolsbehandling eller hensynet til forsvarlig kontradiksjon krever utlevering.</p>
<h4>Behandling av varsler</h4>
<ul>
  <li>Alle varsler skal behandles innen rimelig tid</li>
  <li>Varslerens identitet skal beskyttes</li>
  <li>Varsler dokumenteres med mottatt dato, tiltak og resultat</li>
</ul>
<h4>Vern av varslere</h4>
<p>Gjengjeldelse mot varslere er forbudt, jf. AML § 2 A-4. Arbeidsgiver har bevisbyrden for at eventuelle negative reaksjoner ikke skyldes varslingen.</p>
<h4>Ekstern varsling</h4>
<p>Ansatte kan også varsle eksternt til Arbeidstilsynet eller andre offentlige myndigheter dersom intern varsling ikke fører frem eller er uhensiktsmessig.</p>`,

  s12: `<h3>Ytre miljø</h3>
<p>{{bedriftsnavn}} skal drive virksomheten med minst mulig belastning på det ytre miljøet.</p>
<h4>Avfallshåndtering</h4>
<ul>
  <li>Avfall sorteres i henhold til kommunens avfallsordning</li>
  <li>Farlig avfall håndteres etter avfallsforskriften og leveres til godkjent mottak</li>
  <li>Avfallslogg føres med type, mengde og leveringssted</li>
</ul>
<h4>Kjemikaliehåndtering</h4>
<p>Alle kjemikalier som brukes i virksomheten skal:</p>
<ul>
  <li>Være registrert i stoffkartoteket med oppdatert sikkerhetsdatablad (SDS)</li>
  <li>Oppbevares forsvarlig med riktig merking</li>
  <li>Substitueres med mindre farlige alternativer der dette er mulig</li>
</ul>
<h4>Miljøberedskap</h4>
<p>Beredskapsplan for miljøhendelser (utslipp, lekkasjer) er utarbeidet og kjent for relevante ansatte.</p>
<p><em>Stoffkartotek administreres i HMS Nova → Kjemikalier.</em></p>`,

  s13: `<h3>Årshjul for HMS-aktiviteter</h3>
<p>Følgende aktiviteter planlegges gjennom året for å sikre systematisk HMS-arbeid:</p>
<table>
  <tr><th>Periode</th><th>Aktivitet</th><th>Ansvarlig</th></tr>
  <tr><td>Januar</td><td>Ledelsens gjennomgang av foregående år</td><td>Daglig leder</td></tr>
  <tr><td>Januar</td><td>Fastsette HMS-mål for nytt år</td><td>HMS-ansvarlig</td></tr>
  <tr><td>Februar</td><td>Gjennomgang av HMS-håndboken</td><td>HMS-ansvarlig</td></tr>
  <tr><td>Mars</td><td>Vernerunde – vår</td><td>Verneombud + HMS-ansvarlig</td></tr>
  <tr><td>April</td><td>Brannøvelse</td><td>Brannvernleder</td></tr>
  <tr><td>Mai</td><td>Gjennomgang av risikovurderinger</td><td>HMS-ansvarlig</td></tr>
  <tr><td>Juni</td><td>Arbeidsmiljøundersøkelse</td><td>HMS-ansvarlig</td></tr>
  <tr><td>August</td><td>Opplæringsplan – status og oppdatering</td><td>HMS-ansvarlig</td></tr>
  <tr><td>September</td><td>Vernerunde – høst</td><td>Verneombud + HMS-ansvarlig</td></tr>
  <tr><td>Oktober</td><td>Gjennomgang av stoffkartotek</td><td>HMS-ansvarlig</td></tr>
  <tr><td>November</td><td>Intern revisjon</td><td>HMS-ansvarlig</td></tr>
  <tr><td>Desember</td><td>Forberede ledelsens gjennomgang</td><td>HMS-ansvarlig</td></tr>
</table>
<p><em>Aktivitetene planlegges og følges opp i HMS Nova → Årsplan.</em></p>`,

  s14: `<h3>Intern revisjon</h3>
<p>{{bedriftsnavn}} gjennomfører intern revisjon for å verifisere at internkontrollen fungerer som forutsatt, jf. IK-HMS § 5 nr. 8.</p>
<h4>Frekvens</h4>
<p>Minimum <strong>1 gang per år</strong>.</p>
<h4>Gjennomføring</h4>
<ol>
  <li>Planlegging med revisjonsplan og sjekkliste</li>
  <li>Gjennomgang av dokumenter, registreringer og rutiner</li>
  <li>Intervjuer med ansatte</li>
  <li>Inspeksjon av arbeidsplasser</li>
  <li>Rapportering med funn, avvik og forbedringsforslag</li>
</ol>
<h4>Revisjonsområder</h4>
<ul>
  <li>Er HMS-håndboken oppdatert og kjent?</li>
  <li>Er risikovurderinger gjennomført og oppfølgt?</li>
  <li>Blir avvik registrert, behandlet og lukket?</li>
  <li>Er opplæring gjennomført og dokumentert?</li>
  <li>Er vernerunder gjennomført etter plan?</li>
  <li>Er brannvernutstyr kontrollert?</li>
  <li>Fungerer avviksrapportering i praksis?</li>
</ul>
<h4>Oppfølging</h4>
<p>Funn fra intern revisjon behandles i ledelsens gjennomgang og følges opp som avvik i HMS Nova.</p>`,

  s15: `<h3>Oversikt over rutiner</h3>
<p>{{bedriftsnavn}} har etablert følgende styrende rutiner og instrukser. Alle rutiner er tilgjengelige i HMS Nova med lesebekreftelse og automatisk påminnelse om gjennomgang.</p>
<h4>Grunnleggende HMS-rutiner</h4>
<ul>
  <li>Rutine for avvikshåndtering</li>
  <li>Rutine for risikovurdering</li>
  <li>Rutine for vernerunder</li>
  <li>Rutine for brannvern og evakuering</li>
  <li>Rutine for førstehjelp</li>
  <li>Rutine for opplæring av nyansatte</li>
  <li>Rutine for varsling av kritikkverdige forhold</li>
  <li>Rutine for sykefraværsoppfølging</li>
</ul>
<p>I tillegg har bedriften bransjespesifikke rutiner tilpasset virksomhetens art og risikoforhold.</p>
<p>Alle rutiner gjennomgås minimum årlig og oppdateres ved behov. Lesebekreftelse kreves av alle ansatte rutinen gjelder for.</p>
<p><em>Rutiner administreres i HMS Nova → Rutiner.</em></p>`,
};

// ── Bransjespesifikke tillegg ────────────────────────────────────────────

const INDUSTRY_OVERRIDES: Record<string, Partial<Record<string, string>>> = {
  construction: {
    s2c: `${UNIVERSAL_CONTENT.s2c}
<h4>Bransjespesifikk lovgivning – Bygg og anlegg</h4>
<ul>
  <li><strong>Byggherreforskriften</strong> — Krav til byggherre, prosjekterende og utførende</li>
  <li><strong>Forskrift om utførelse av arbeid</strong>, kap. 17-27 — Arbeid i høyden, graving, riving, stillaser</li>
  <li><strong>Forskrift om sikkerhet, helse og arbeidsmiljø på bygge- eller anleggsplasser (SHA-plan)</strong></li>
  <li><strong>Maskinforskriften</strong> — Krav til maskiner og arbeidsutstyr</li>
  <li><strong>Forskrift om tiltaksverdier og grenseverdier</strong> — Støv, støy, kjemikalier</li>
  <li><strong>Forskrift om administrative normer for forurensning i arbeidsatmosfæren</strong></li>
</ul>`,
    s5: `${UNIVERSAL_CONTENT.s5}
<h4>Bransjespesifikke kompetansekrav – Bygg og anlegg</h4>
<ul>
  <li><strong>Stillaskurs</strong> — Alle som monterer eller arbeider fra stillas</li>
  <li><strong>Maskinførerbevis</strong> — Gravemaskin, hjullaster, kran, lift, truck</li>
  <li><strong>Varmt arbeid</strong> — Sveising, skjæring, lodding</li>
  <li><strong>Fallsikring</strong> — Arbeid i høyden over 2 meter</li>
  <li><strong>Grunnleggende sikkerhetsopplæring (GSO)</strong> — Påkrevd på de fleste byggeplasser</li>
  <li><strong>HMS-kort</strong> — Alle som utfører arbeid på bygg- og anleggsplasser</li>
</ul>`,
    s6: `${UNIVERSAL_CONTENT.s6}
<h4>Bransjespesifikke prosedyrer – Bygg og anlegg</h4>
<ul>
  <li><strong>SHA-plan</strong> — Sikkerhet, helse og arbeidsmiljøplan for hvert prosjekt</li>
  <li><strong>SJA for høyrisiko-arbeid</strong> — Arbeid i høyden, graving, løft, riving, varmt arbeid</li>
  <li><strong>Daglig HMS-gjennomgang</strong> — Toolbox-talk ved arbeidsdagens start</li>
  <li><strong>Utstyrskontroll</strong> — Daglig kontroll av kraner, stillas, lifter og maskiner</li>
  <li><strong>Adgangskontroll</strong> — Registrering av alle personer på byggeplassen</li>
</ul>`,
  },

  hospitality: {
    s2c: `${UNIVERSAL_CONTENT.s2c}
<h4>Bransjespesifikk lovgivning – Hotell og restaurant</h4>
<ul>
  <li><strong>Matloven</strong> — Krav til næringsmiddelhygiene og mattrygghet</li>
  <li><strong>Forskrift om næringsmiddelhygiene (Hygienepakken)</strong></li>
  <li><strong>IK-mat forskriften</strong> — Internkontroll for næringsmiddelvirksomheter</li>
  <li><strong>Serveringsloven</strong> — Krav til serveringssteder</li>
  <li><strong>Alkoholloven</strong> — Skjenkebevilling og kontroll</li>
  <li><strong>AML § 10 — Arbeidstidsbestemmelser</strong> — Nattarbeid, skiftarbeid, overtid</li>
  <li><strong>Forskrift om arbeid som utføres i arbeidstakers hjem</strong></li>
</ul>`,
    s5: `${UNIVERSAL_CONTENT.s5}
<h4>Bransjespesifikke kompetansekrav – Hotell og restaurant</h4>
<ul>
  <li><strong>Mattrygghet og hygieneopplæring</strong> — Alle som håndterer mat</li>
  <li><strong>Allergenopplæring</strong> — Alle servitører og kjøkkenpersonell</li>
  <li><strong>Ansvarlig vertskap</strong> — Alle med skjenkebevilling</li>
  <li><strong>Nattarbeid-opplæring</strong> — Ansatte som jobber mellom kl. 21-06</li>
  <li><strong>Løfteopplæring</strong> — Riktig løfteteknikk for tungt arbeid</li>
</ul>`,
    s6: `${UNIVERSAL_CONTENT.s6}
<h4>Bransjespesifikke prosedyrer – Hotell og restaurant</h4>
<ul>
  <li><strong>IK-mat rutiner</strong> — Temperaturkontroll, mottak, lagring, tilberedning</li>
  <li><strong>HACCP-prosedyrer</strong> — Kritiske kontrollpunkter for mattrygghet</li>
  <li><strong>Renholdsplan</strong> — Systematisk renhold med frekvens og ansvarlig</li>
  <li><strong>Skadedyrkontroll</strong> — Forebygging og tiltak ved funn</li>
  <li><strong>Arbeidstidsregistrering</strong> — Spesielt for skift- og nattarbeid</li>
</ul>`,
  },

  healthcare: {
    s2c: `${UNIVERSAL_CONTENT.s2c}
<h4>Bransjespesifikk lovgivning – Helse og omsorg</h4>
<ul>
  <li><strong>Helsepersonelloven</strong> — Krav til helsepersonell, dokumentasjonsplikt</li>
  <li><strong>Smittevernloven</strong> — Forebygging av smittsomme sykdommer</li>
  <li><strong>Forskrift om smittevern i helse- og omsorgstjenesten</strong></li>
  <li><strong>Strålevernforskriften</strong> — Ved bruk av strålekilder (røntgen, etc.)</li>
  <li><strong>Forskrift om biologiske faktorer i arbeidsmiljøet</strong></li>
  <li><strong>Forskrift om utførelse av arbeid</strong>, kap. 6 — Biologiske faktorer</li>
  <li><strong>AML § 4-5</strong> — Kjemisk og biologisk helsefare</li>
</ul>`,
    s5: `${UNIVERSAL_CONTENT.s5}
<h4>Bransjespesifikke kompetansekrav – Helse og omsorg</h4>
<ul>
  <li><strong>Smittevernopplæring</strong> — Alle ansatte med pasientkontakt</li>
  <li><strong>Medikamenthåndtering</strong> — Autorisert helsepersonell</li>
  <li><strong>Forflytning og ergonomi</strong> — Alle som hjelper pasienter/brukere</li>
  <li><strong>Vold og trusler</strong> — Forebygging og håndtering</li>
  <li><strong>Stikkskadeprosedyre</strong> — Alle som håndterer skarpe gjenstander</li>
  <li><strong>Taushetsplikt og GDPR</strong> — Alle med tilgang til helseopplysninger</li>
</ul>`,
    s11: `${UNIVERSAL_CONTENT.s11}
<h4>Bransjespesifikke arbeidsmiljøutfordringer – Helse og omsorg</h4>
<ul>
  <li><strong>Vold og trusler</strong> — Rutiner for forebygging, varsling og oppfølging av ansatte utsatt for vold eller trusler fra pasienter/brukere</li>
  <li><strong>Emosjonelle belastninger</strong> — Tilbud om veiledning og debriefing etter vanskelige situasjoner</li>
  <li><strong>Nattarbeid og skiftarbeid</strong> — Helseundersøkelser og tilrettelegging for turnusarbeidere</li>
  <li><strong>Smittevern som psykisk belastning</strong> — Oppfølging i perioder med økt smitterisiko</li>
</ul>`,
  },

  transport: {
    s2c: `${UNIVERSAL_CONTENT.s2c}
<h4>Bransjespesifikk lovgivning – Transport og logistikk</h4>
<ul>
  <li><strong>Vegtrafikkloven</strong> — Trafikksikkerhet og kjøretøykrav</li>
  <li><strong>Yrkestransportloven</strong> — Krav til løyve og godkjenning</li>
  <li><strong>Forskrift om kjøre- og hviletid</strong> — Obligatorisk for sjåfører</li>
  <li><strong>ADR-forskriften</strong> — Transport av farlig gods</li>
  <li><strong>Forskrift om lasting og lossing av skip</strong> (der relevant)</li>
  <li><strong>AML § 10</strong> — Arbeidstid, spesielt for mobile arbeidstakere</li>
</ul>`,
    s5: `${UNIVERSAL_CONTENT.s5}
<h4>Bransjespesifikke kompetansekrav – Transport og logistikk</h4>
<ul>
  <li><strong>Yrkessjåførkompetanse</strong> — Alle sjåfører (grunnutdanning + etterutdanning hvert 5. år)</li>
  <li><strong>ADR-sertifikat</strong> — Sjåfører som frakter farlig gods</li>
  <li><strong>Truckførerbevis</strong> — Alle som bruker truck</li>
  <li><strong>Lastsikring</strong> — Alle som laster og sikrer gods</li>
  <li><strong>Kjøre- og hviletidsregler</strong> — Alle sjåfører med fartsskriver</li>
  <li><strong>Førstehjelp på vei</strong> — Alle sjåfører</li>
</ul>`,
  },

  technology: {
    s2c: `${UNIVERSAL_CONTENT.s2c}
<h4>Bransjespesifikk lovgivning – Teknologi og IT</h4>
<ul>
  <li><strong>Forskrift om arbeid ved dataskjerm</strong> — Krav til arbeidsplass, synsundersøkelse</li>
  <li><strong>GDPR / Personopplysningsloven</strong> — Behandling av persondata</li>
  <li><strong>Sikkerhetsloven</strong> — Der relevant for offentlige oppdrag</li>
  <li><strong>AML § 4-4</strong> — Fysisk arbeidsmiljø, ergonomi på kontor</li>
</ul>`,
    s11: `${UNIVERSAL_CONTENT.s11}
<h4>Bransjespesifikke arbeidsmiljøutfordringer – Teknologi og IT</h4>
<ul>
  <li><strong>Ergonomi ved skjermarbeid</strong> — Tilpasset arbeidsplass, skjerm, stol og bord. Synsundersøkelse tilbys, jf. forskrift om arbeid ved dataskjerm</li>
  <li><strong>Psykisk helse og stress</strong> — Høyt arbeidstempo, tidspress og kognitiv belastning. Tiltak for å forebygge utbrenthet</li>
  <li><strong>Fjernarbeid/hjemmekontor</strong> — Ergonomiske krav gjelder også hjemmekontor. Arbeidsgivers tilretteleggingsplikt</li>
  <li><strong>Sosial isolasjon</strong> — Tiltak for å sikre tilhørighet ved hybrid/fjernarbeid</li>
</ul>`,
  },

  agriculture: {
    s2c: `${UNIVERSAL_CONTENT.s2c}
<h4>Bransjespesifikk lovgivning – Landbruk</h4>
<ul>
  <li><strong>Forskrift om maskiner</strong> — Krav til landbruksmaskiner</li>
  <li><strong>Plantevernmiddelforskriften</strong> — Bruk av sprøytemidler</li>
  <li><strong>Dyrevelferdsloven</strong> — Håndtering av dyr</li>
  <li><strong>Forskrift om vern mot eksponering for kjemikalier</strong></li>
  <li><strong>Forskrift om biologiske faktorer</strong> — Zoonoser og biologisk eksponering</li>
</ul>`,
  },

  manufacturing: {
    s2c: `${UNIVERSAL_CONTENT.s2c}
<h4>Bransjespesifikk lovgivning – Industri og produksjon</h4>
<ul>
  <li><strong>Maskinforskriften</strong> — Krav til maskiner og teknisk utstyr</li>
  <li><strong>Forskrift om tiltaksverdier og grenseverdier for fysiske og kjemiske faktorer</strong></li>
  <li><strong>Støyforskriften</strong> — Grenseverdier og tiltak ved støyeksponering</li>
  <li><strong>Forskrift om utførelse av arbeid</strong>, kap. 3-5 — Kjemisk og fysisk helsefare</li>
  <li><strong>Forskrift om administrative normer for forurensning i arbeidsatmosfæren</strong></li>
  <li><strong>Trykkutstyrsforskriften</strong> (der relevant)</li>
</ul>`,
  },

  retail: {
    s2c: `${UNIVERSAL_CONTENT.s2c}
<h4>Bransjespesifikk lovgivning – Handel og service</h4>
<ul>
  <li><strong>Helligdagsfredloven</strong> — Åpningstider og søndagsarbeid</li>
  <li><strong>Forskrift om arbeid ved dataskjerm</strong> — Kassearbeid</li>
  <li><strong>AML § 4-3</strong> — Psykososialt arbeidsmiljø, ran-risiko</li>
  <li><strong>AML § 10</strong> — Arbeidstid ved kveldsjobbing og helg</li>
</ul>`,
  },

  education: {
    s2c: `${UNIVERSAL_CONTENT.s2c}
<h4>Bransjespesifikk lovgivning – Utdanning</h4>
<ul>
  <li><strong>Opplæringslova</strong> — Krav til læringsmiljø</li>
  <li><strong>Barnehageloven</strong> — Krav til barnehager</li>
  <li><strong>Forskrift om miljørettet helsevern i barnehager og skoler</strong></li>
  <li><strong>Forskrift om sikkerhet ved lekeplassutstyr</strong></li>
  <li><strong>AML § 4-3</strong> — Psykososialt arbeidsmiljø for ansatte</li>
</ul>`,
  },
};

// ── Personalhåndbok-kapitler (AML, ferieloven, GDPR) ──────────────────────

export type HandbookHrSectionDef = {
  sectionKey: string;
  sectionNumber: string;
  title: string;
  legalRef: string;
  sortOrder: number;
  moduleLink: string | null;
  content: string;
};

export const DEFAULT_HR_SECTIONS: HandbookHrSectionDef[] = [
  {
    sectionKey: "hr-arbeidsforhold",
    sectionNumber: "19",
    title: "Ansettelse og arbeidsavtale",
    legalRef: "AML § 14-5, § 14-6",
    sortOrder: 19,
    moduleLink: "/dashboard/onboarding",
    content: `<h3>Skriftlig arbeidsavtale</h3>
<p>Alle som arbeider i {{bedriftsnavn}} skal ha skriftlig arbeidsavtale. Avtalen skal foreligge senest sju dager etter at arbeidsforholdet starter, jf. AML § 14-5.</p>
<p>Arbeidsavtalen skal minst inneholde opplysningene i AML § 14-6, blant annet partenes identitet, arbeidssted, stillingsbeskrivelse, tiltredelsesdato, forventet varighet ved midlertidig ansettelse, prøvetid, ferie, oppsigelsesfrister, lønn og andre godtgjørelser, arbeidstid og eventuelle tariffavtaler.</p>
<h3>Onboarding</h3>
<p>Nyansatte gjennomgår et strukturert onboarding-løp med nødvendig HMS-opplæring og instruksjon (AML § 3-2, org.forskr. kap. 8 og IK-HMS § 5 nr. 2), gjennomgang av denne håndboken og øvrige lovpålagte oppgaver. Fremdrift følges i onboarding-modulen.</p>
<p>Lønn og godtgjørelser fremgår av arbeidsavtalen og lønnsslippen. Nærmere vilkår avtales individuelt eller i tariffavtale.</p>`,
  },
  {
    sectionKey: "hr-arbeidstid",
    sectionNumber: "20",
    title: "Arbeidstid og overtid",
    legalRef: "AML kap. 10",
    sortOrder: 20,
    moduleLink: "/dashboard/time-registration",
    content: `<h3>Alminnelig arbeidstid</h3>
<p>Arbeidstiden i {{bedriftsnavn}} følger arbeidsavtalen og AML kapittel 10. Alminnelig arbeidstid skal som hovedregel ikke overstige ni timer i løpet av 24 timer og 40 timer i løpet av sju dager, jf. AML § 10-4, med mindre annet er lovlig avtalt.</p>
<h3>Pauser og hvile</h3>
<p>Arbeidstaker har rett til pause når arbeidstiden er mer enn fem og en halv time, jf. AML § 10-9. Daglig og ukentlig arbeidsfri skal overholdes etter AML § 10-8.</p>
<h3>Overtid</h3>
<p>Arbeid utover alminnelig arbeidstid er overtid og skal være pålagt når det er et særlig og tidsavgrenset behov, jf. AML § 10-6. Overtid registreres i timeregistreringen.</p>`,
  },
  {
    sectionKey: "hr-ferie",
    sectionNumber: "21",
    title: "Ferie og feriepenger",
    legalRef: "Ferieloven",
    sortOrder: 21,
    moduleLink: "/dashboard/fravaer",
    content: `<h3>Ferierett</h3>
<p>Alle ansatte i {{bedriftsnavn}} har rett til ferie etter ferieloven. Hovedferieperioden er 1. juni–30. september. Arbeidstaker har rett til tre uker sammenhengende ferie i denne perioden, så langt det er mulig.</p>
<h3>Feriepenger</h3>
<p>Feriepenger opptjenes i opptjeningsåret og utbetales i ferieåret i tråd med ferieloven. Sats og beregningsgrunnlag fremgår av lønnsslipp og eventuelt tariffavtale.</p>
<h3>Søknad og godkjenning</h3>
<p>Ferie søkes i fraværsmodulen og godkjennes av nærmeste leder. Tidspunktet fastsettes etter drøfting, jf. ferieloven § 6.</p>`,
  },
  {
    sectionKey: "hr-sykefravaer",
    sectionNumber: "22",
    title: "Sykefravær og egenmelding",
    legalRef: "AML § 4-6, Folketrygdloven § 8-7",
    sortOrder: 22,
    moduleLink: "/dashboard/fravaer",
    content: `<h3>Melding om sykdom</h3>
<p>Ved sykdom skal den ansatte varsle leder så tidlig som mulig første fraværsdag. Fravær registreres i fraværsmodulen.</p>
<h3>Egenmelding</h3>
<p>Egenmelding kan brukes innenfor rammene i folketrygdloven § 8-7 og bedriftens interne regler. Sykmelding fra lege kreves når egenmeldingsretten er brukt opp, eller når arbeidsgiver ber om det.</p>
<h3>Oppfølgingsplikt</h3>
<p>Arbeidsgiver skal følge opp sykmeldte og tilrettelegge arbeidet så langt det er mulig, jf. AML § 4-6. Oppfølgingsplan skal som hovedregel utarbeides senest når arbeidstaker har vært helt eller delvis borte fra arbeidet i fire uker. Dialogmøter gjennomføres etter lovens frister.</p>
<p>Diagnose og andre helseopplysninger behandles med særlig konfidensialitet (GDPR art. 9).</p>`,
  },
  {
    sectionKey: "hr-permisjon",
    sectionNumber: "23",
    title: "Permisjon",
    legalRef: "AML kap. 12",
    sortOrder: 23,
    moduleLink: "/dashboard/fravaer",
    content: `<h3>Rett til permisjon</h3>
<p>{{bedriftsnavn}} følger arbeidsmiljølovens kapittel 12 om permisjon, blant annet svangerskap, fødsel, omsorg for barn, amming, pleie av nærstående og utdanningspermisjon der vilkårene er oppfylt.</p>
<h3>Søknad</h3>
<p>Permisjon søkes i fraværsmodulen med type, periode og nødvendig dokumentasjon. Leder behandler søknaden. Rettigheter etter folketrygden (foreldrepenger m.m.) avklares med NAV.</p>`,
  },
  {
    sectionKey: "hr-kompetanse",
    sectionNumber: "24",
    title: "Kompetansekrav i stillingen",
    legalRef: "AML § 3-2, IK-HMS § 5 nr. 2 og nr. 5",
    sortOrder: 24,
    moduleLink: "/dashboard/training/profiler",
    content: `<h3>Nødvendig opplæring</h3>
<p>Arbeidsgiver skal sørge for at alle ansatte i {{bedriftsnavn}} får nødvendig opplæring til å utføre arbeidet trygt, jf. AML § 3-2. Kompetansekrav per rolle dokumenteres i kompetanseprofiler.</p>
<h3>Gap og fornyelse</h3>
<p>Ansatte og ledere kan se hvilke kurs som er oppfylt, utløpt eller mangler. Lovpålagte kurs prioriteres. HMS-opplæring for arbeidsgiver følger AML § 3-5.</p>`,
  },
  {
    sectionKey: "hr-personvern",
    sectionNumber: "25",
    title: "Personopplysninger i ansettelsesforholdet",
    legalRef: "GDPR art. 5, 6 og 13, personopplysningsloven",
    sortOrder: 25,
    moduleLink: null,
    content: `<h3>Behandlingsansvar</h3>
<p>{{bedriftsnavn}} er behandlingsansvarlig for personopplysninger om ansatte. Opplysninger samles inn og brukes bare til legitimt personal- og HMS-arbeid, med hjemmel i avtale, rettslig plikt eller berettiget interesse, jf. GDPR art. 6.</p>
<h3>Dine rettigheter</h3>
<p>Du har rett til innsyn, retting og i visse tilfeller sletting (GDPR art. 15–17). Særlige kategorier (helse, varsling) behandles med streng tilgangsstyring. Spørsmål rettes til leder eller personvernkontakt.</p>
<p>Lagringstiden følger lovpålagte oppbevaringskrav. Når arbeidsforholdet opphører, slettes eller anonymiseres data som ikke lenger er nødvendige.</p>`,
  },
  {
    sectionKey: "hr-opphor",
    sectionNumber: "26",
    title: "Opphør av arbeidsforhold",
    legalRef: "AML kap. 15, AML § 15-15, GDPR art. 17",
    sortOrder: 26,
    moduleLink: "/dashboard/onboarding",
    content: `<h3>Oppsigelse</h3>
<p>Oppsigelse skal skje skriftlig og oppfylle formkravene i AML § 15-4. Oppsigelsesfrister følger AML § 15-3 og arbeidsavtalen. Oppsigelse fra arbeidsgiver skal være saklig begrunnet, jf. AML § 15-7.</p>
<h3>Sluttattest</h3>
<p>Arbeidstaker som fratrer har krav på sluttattest, jf. AML § 15-15.</p>
<h3>Offboarding</h3>
<p>Ved avslutning gjennomføres offboarding: innlevering av utstyr, stenging av tilganger og vurdering av personopplysninger som skal slettes, jf. GDPR art. 17. Oppgavene følges i offboarding-modulen.</p>`,
  },
];

// ── Bygg komplett mal for en bransje ─────────────────────────────────────

export function buildIndustryTemplate(
  industryKey: string,
  industryLabel: string,
): HandbookTemplateDefinition {
  const overrides = INDUSTRY_OVERRIDES[industryKey] ?? {};

  const sections: HandbookTemplateSectionContent[] = Object.entries(
    UNIVERSAL_CONTENT,
  ).map(([key, content]) => ({
    sectionKey: key,
    content: overrides[key] ?? content,
  }));

  return {
    id: `template-${industryKey}`,
    name: `HMS-hånbok – ${industryLabel}`,
    description: `Komplett HMS-hånbok tilpasset ${industryLabel.toLowerCase()} med bransjespesifikke lovkrav, kompetansekrav og prosedyrer.`,
    industry: industryKey,
    sections,
  };
}

export function replaceTemplateVariables(
  content: string,
  variables: Record<string, string>,
): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value || `[${key}]`);
  }
  return result;
}

export function getAvailableTemplates(): Array<{
  id: string;
  name: string;
  description: string;
  industry: string;
}> {
  const industries: Array<{ key: string; label: string }> = [
    { key: "construction", label: "Bygg og anlegg" },
    { key: "hospitality", label: "Hotell og restaurant" },
    { key: "healthcare", label: "Helse og omsorg" },
    { key: "transport", label: "Transport og logistikk" },
    { key: "technology", label: "Teknologi og IT" },
    { key: "agriculture", label: "Landbruk" },
    { key: "manufacturing", label: "Industri og produksjon" },
    { key: "retail", label: "Handel og service" },
    { key: "education", label: "Utdanning" },
    { key: "other", label: "Generell mal" },
  ];

  return industries.map(({ key, label }) => {
    const tpl = buildIndustryTemplate(key, label);
    return {
      id: tpl.id,
      name: tpl.name,
      description: tpl.description,
      industry: key,
    };
  });
}
