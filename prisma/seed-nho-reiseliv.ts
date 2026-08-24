/**
 * NHO Reiseliv Demo Seed – Fjordheim Hotell & Spa AS
 * Komplett HMS-data for presentasjon.
 * Kjør: tsx prisma/seed-nho-reiseliv.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TENANT_SLUG = "fjordheim-hotell";
const PASSWORD = "Demo2026!";

async function main() {
  console.log("🏨 NHO Reiseliv Demo Seed – Fjordheim Hotell & Spa AS\n");

  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  // ── 1. Tenant ─────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT_SLUG },
    update: {},
    create: {
      name: "Fjordheim Hotell & Spa AS",
      slug: TENANT_SLUG,
      orgNumber: "987654321",
      industry: "hospitality",
      status: "ACTIVE",
      contactEmail: "post@fjordheim.no",
      contactPhone: "+47 56 12 34 56",
      address: "Fjordveien 42",
      city: "Os",
      postalCode: "5200",
      employeeCount: 35,
      contactPerson: "Kari Fjordheim",
      hmsContactName: "Thomas Berg",
      hmsContactPhone: "+47 91 23 45 67",
      hmsContactEmail: "thomas@fjordheim.no",
      startpakkeCompleted: true,
      setupGuideHidden: true,
      onboardingStatus: "COMPLETED",
      onboardingCompletedAt: new Date("2025-09-01"),
      ruhModuleEnabled: true,
      tavleBannerDismissed: true,
      pricingTier: "SMALL",
      termsAcceptedAt: new Date("2025-08-15"),
    },
  });
  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})\n`);

  // ── 2. Brukere ────────────────────────────────────────────────────────────
  const users = [
    { email: "kari@fjordheim.no", name: "Kari Fjordheim", role: "ADMIN" as const, position: "Daglig leder", department: "Ledelse" },
    { email: "thomas@fjordheim.no", name: "Thomas Berg", role: "HMS" as const, position: "HMS-ansvarlig / Driftsleder", department: "Drift" },
    { email: "ingrid@fjordheim.no", name: "Ingrid Haugen", role: "LEDER" as const, position: "Restaurantsjef", department: "Restaurant" },
    { email: "erik@fjordheim.no", name: "Erik Strand", role: "VERNEOMBUD" as const, position: "Resepsjonssjef / Verneombud", department: "Resepsjon" },
    { email: "marte@fjordheim.no", name: "Marte Solheim", role: "ANSATT" as const, position: "Housekeeping", department: "Renhold" },
    { email: "jonas@fjordheim.no", name: "Jonas Vik", role: "ANSATT" as const, position: "Kokk", department: "Kjøkken" },
    { email: "anne.bht@fjordheim.no", name: "Anne Lind", role: "BHT" as const, position: "Bedriftshelsetjeneste", department: "Ekstern" },
  ];

  const userRecords: Record<string, string> = {};

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, password: hashedPassword },
      create: { email: u.email, name: u.name, password: hashedPassword, lastTenantId: tenant.id },
    });
    userRecords[u.email] = user.id;

    await prisma.userTenant.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
      update: { role: u.role, position: u.position, department: u.department },
      create: { userId: user.id, tenantId: tenant.id, role: u.role, position: u.position, department: u.department },
    });
  }

  const adminId = userRecords["kari@fjordheim.no"];
  const hmsId = userRecords["thomas@fjordheim.no"];
  const lederId = userRecords["ingrid@fjordheim.no"];
  const vernId = userRecords["erik@fjordheim.no"];
  const marteId = userRecords["marte@fjordheim.no"];
  const jonasId = userRecords["jonas@fjordheim.no"];

  console.log(`✅ ${users.length} brukere opprettet\n`);

  // ── Rydd eksisterende data for denne tenant ───────────────────────────────
  console.log("🗑️  Rydder eksisterende data...");
  await prisma.inspectionFinding.deleteMany({ where: { inspection: { tenantId: tenant.id } } });
  await prisma.inspection.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.formFieldValue.deleteMany({ where: { submission: { tenantId: tenant.id } } });
  await prisma.formSubmission.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.formField.deleteMany({ where: { formTemplate: { tenantId: tenant.id } } });
  await prisma.formTemplate.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.measure.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.incident.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.riskControl.deleteMany({ where: { risk: { tenantId: tenant.id } } });
  await prisma.risk.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.riskAssessment.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.training.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.chemical.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.routine.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.employeeReviewAction.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.employeeReviewGoal.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.employeeReview.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.orgChartNode.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.handbookSignature.deleteMany({ where: { handbook: { tenantId: tenant.id } } });
  await prisma.handbookSection.deleteMany({ where: { version: { handbook: { tenantId: tenant.id } } } });
  await prisma.handbookVersion.deleteMany({ where: { handbook: { tenantId: tenant.id } } });
  await prisma.hmsHandbook.deleteMany({ where: { tenantId: tenant.id } });
  console.log("✅ Ryddet\n");

  // ── 3. Organisasjonskart ──────────────────────────────────────────────────
  const orgRoot = await prisma.orgChartNode.create({
    data: { tenantId: tenant.id, title: "Daglig leder", name: "Kari Fjordheim", department: "Ledelse", sortOrder: 0 },
  });
  const orgHms = await prisma.orgChartNode.create({
    data: { tenantId: tenant.id, parentId: orgRoot.id, title: "HMS-ansvarlig / Driftsleder", name: "Thomas Berg", department: "Drift", sortOrder: 0 },
  });
  const orgRest = await prisma.orgChartNode.create({
    data: { tenantId: tenant.id, parentId: orgRoot.id, title: "Restaurantsjef", name: "Ingrid Haugen", department: "Restaurant", sortOrder: 1 },
  });
  const orgResepsjon = await prisma.orgChartNode.create({
    data: { tenantId: tenant.id, parentId: orgRoot.id, title: "Resepsjonssjef / Verneombud", name: "Erik Strand", department: "Resepsjon", sortOrder: 2 },
  });
  await prisma.orgChartNode.create({
    data: { tenantId: tenant.id, parentId: orgRoot.id, title: "Spa-leder", name: "Silje Nordby", department: "Spa & Wellness", sortOrder: 3 },
  });
  await prisma.orgChartNode.create({
    data: { tenantId: tenant.id, parentId: orgHms.id, title: "Housekeeping-team", name: "Marte Solheim + 8 ansatte", department: "Renhold", sortOrder: 0 },
  });
  await prisma.orgChartNode.create({
    data: { tenantId: tenant.id, parentId: orgRest.id, title: "Kokker", name: "Jonas Vik + 4 kokker", department: "Kjøkken", sortOrder: 0 },
  });
  await prisma.orgChartNode.create({
    data: { tenantId: tenant.id, parentId: orgResepsjon.id, title: "Resepsjonsmedarbeidere", name: "3 ansatte", department: "Resepsjon", sortOrder: 0 },
  });
  console.log("✅ 8 organisasjonskart-noder\n");

  // ── 4. HMS-handbok ────────────────────────────────────────────────────────
  const handbook = await prisma.hmsHandbook.create({ data: { tenantId: tenant.id } });

  const handbookVersion = await prisma.handbookVersion.create({
    data: {
      handbookId: handbook.id,
      version: "2.0",
      status: "APPROVED",
      approvedById: adminId,
      approvedAt: new Date("2026-03-15"),
      publishedAt: new Date("2026-03-15"),
      changeNote: "Fullstendig tilpasset hotell- og reiselivsbransjen. Godkjent av daglig leder.",
    },
  });

  await prisma.hmsHandbook.update({
    where: { id: handbook.id },
    data: { currentVersionId: handbookVersion.id, lastReviewedAt: new Date("2026-03-15"), reviewedById: hmsId },
  });

  const SECTIONS = [
    { key: "s1", num: "1", title: "HMS-policy og mål", sort: 1, legalRef: "IK-HMS § 5 nr. 4, AML § 3-1" },
    { key: "s2", num: "2", title: "Organisasjon, roller og ansvar", sort: 2, legalRef: "IK-HMS § 5 nr. 5, AML § 3-1, § 6-1" },
    { key: "s2b", num: "3", title: "Medvirkning og HMS-organisering", sort: 3, legalRef: "IK-HMS § 5 nr. 3, AML § 6-1, § 7-1" },
    { key: "s2c", num: "4", title: "Gjeldende lover og forskrifter", sort: 4, legalRef: "IK-HMS § 5 nr. 1" },
    { key: "s3", num: "5", title: "Risikostyring", sort: 5, legalRef: "IK-HMS § 5 nr. 6, AML § 3-1" },
    { key: "s4", num: "6", title: "Avvik, hendelser og forbedring", sort: 6, legalRef: "AML § 5-1, § 5-2, IK-HMS § 5 nr. 7" },
    { key: "s5", num: "7", title: "Kompetanse og opplæring", sort: 7, legalRef: "AML § 3-2, IK-HMS § 5 nr. 2" },
    { key: "s6", num: "8", title: "Operasjonell kontroll", sort: 8, legalRef: "AML § 3-1, IK-HMS § 5 nr. 7" },
    { key: "s7", num: "9", title: "Brannvern og beredskap", sort: 9, legalRef: "Brann- og eksplosjonsvernloven § 13" },
    { key: "s8", num: "10", title: "Vernerunder og løpende internkontroll", sort: 10, legalRef: "AML § 6-2, IK-HMS § 5 nr. 7" },
    { key: "s9", num: "11", title: "Ledelsens gjennomgang", sort: 11, legalRef: "IK-HMS § 5 nr. 8, ISO 45001 kap. 9.3" },
    { key: "s10", num: "12", title: "Dokumentstyring og systemkontroll", sort: 12, legalRef: "IK-HMS § 5 nr. 2" },
    { key: "s11", num: "13", title: "Arbeidsmiljø – fysisk og psykososialt", sort: 13, legalRef: "AML § 4-1, § 4-3" },
    { key: "s11b", num: "14", title: "Varsling av kritikkverdige forhold", sort: 14, legalRef: "AML § 2 A-1 til § 2 A-7" },
    { key: "s12", num: "15", title: "Ytre miljø og avfall", sort: 15, legalRef: "Forurensningsloven, AML § 4-5" },
    { key: "s13", num: "16", title: "Årshjul for HMS-aktiviteter", sort: 16, legalRef: "IK-HMS § 5 nr. 8" },
    { key: "s14", num: "17", title: "Intern revisjon og systemevaluering", sort: 17, legalRef: "IK-HMS § 5 nr. 8" },
    { key: "s15", num: "18", title: "Rutiner og prosedyrer", sort: 18, legalRef: "IK-HMS § 5 nr. 7" },
  ];

  const HOSPITALITY_CONTENT: Record<string, string> = {
    s1: `<h2>HMS-policy – Fjordheim Hotell & Spa AS</h2>
<p>Fjordheim Hotell & Spa AS skal være en trygg og helsefremmende arbeidsplass for alle ansatte, gjester og leverandører. Vi forplikter oss til å:</p>
<ul>
<li>Oppfylle alle gjeldende lover, forskrifter og bransjestandarder for HMS</li>
<li>Arbeide systematisk med forebygging av skader, sykdom og uønskede hendelser</li>
<li>Sikre et inkluderende og respektfullt arbeidsmiljø fritt for trakassering</li>
<li>Kontinuerlig forbedre våre HMS-prosesser gjennom risikovurdering og oppfølging av avvik</li>
</ul>
<h3>Mål for 2026</h3>
<ul>
<li>Sykefravær under 5%</li>
<li>Null alvorlige arbeidsulykker</li>
<li>100% gjennomført obligatorisk opplæring for alle ansatte</li>
<li>Minst 2 vernerunder per halvår</li>
<li>Trivselscore over 4.0 på medarbeiderundersøkelse</li>
</ul>`,
    s2: `<h2>Organisasjon, roller og ansvar</h2>
<p><strong>Daglig leder:</strong> Kari Fjordheim – øverste ansvar for HMS i virksomheten (AML § 3-1).</p>
<p><strong>HMS-ansvarlig:</strong> Thomas Berg – koordinerer HMS-arbeidet, gjennomfører risikovurderinger, følger opp avvik og tiltak.</p>
<p><strong>Verneombud:</strong> Erik Strand – ivaretar arbeidstakernes interesser i HMS-saker (AML § 6-2).</p>
<p><strong>Brannvernleder:</strong> Thomas Berg – ansvar for brannvernorganisering og øvelser.</p>
<p><strong>Avdelingsledere:</strong> Ingrid Haugen (restaurant), Erik Strand (resepsjon), Silje Nordby (spa) – daglig oppfølging av HMS i sine avdelinger.</p>
<p>Se organisasjonskart for fullstendig oversikt over ansvarslinjer.</p>`,
    s2b: `<h2>Medvirkning og HMS-organisering</h2>
<p>Alle ansatte har rett og plikt til å medvirke i HMS-arbeidet (AML § 2-3). Medvirkning sikres gjennom:</p>
<ul>
<li>Verneombud valgt av ansatte (Erik Strand)</li>
<li>Månedlige personalmøter med fast HMS-punkt</li>
<li>Lav terskel for avviksmelding via HMS Nova (mobil/PC)</li>
<li>Årlig medarbeidersamtale med HMS-fokus</li>
<li>Anonym psykososial kartlegging (halvårlig)</li>
</ul>
<p>Virksomheten har under 50 ansatte – AMU er derfor ikke påkrevd, men verneombud deltar i ledermøter ved HMS-saker.</p>`,
    s2c: `<h2>Gjeldende lover og forskrifter</h2>
<p>Følgende lovgivning er særlig relevant for Fjordheim Hotell & Spa AS:</p>
<h3>Generelt HMS</h3>
<ul>
<li><strong>Arbeidsmiljøloven (AML)</strong> – grunnlaget for HMS-arbeidet</li>
<li><strong>Internkontrollforskriften (IK-HMS)</strong> – systematisk HMS-styring</li>
<li><strong>Forskrift om organisering, ledelse og medvirkning</strong></li>
</ul>
<h3>Bransjespesifikk lovgivning – Hotell og restaurant</h3>
<ul>
<li><strong>Matloven</strong> – krav til næringsmiddelhygiene og mattrygghet</li>
<li><strong>Forskrift om næringsmiddelhygiene (Hygienepakken)</strong> – HACCP</li>
<li><strong>Forordning (EF) 852/2004</strong> – hygieneforordningen</li>
<li><strong>Serveringsloven</strong> – krav til serveringssteder</li>
<li><strong>Alkoholloven</strong> – krav ved skjenking</li>
<li><strong>Brann- og eksplosjonsvernloven</strong> – særskilt brannobjekt</li>
<li><strong>Forskrift om badeanlegg, bassengbad og badstu</strong> – basseng/spa-krav</li>
<li><strong>Legionellaforskriften</strong> – forebygging i vanninstallasjoner</li>
<li><strong>Forskrift om tiltaks- og grenseverdier</strong> – kjemikalieeksponering</li>
</ul>`,
    s3: `<h2>Risikostyring</h2>
<p>Fjordheim Hotell & Spa gjennomfører systematisk risikovurdering iht. IK-HMS § 5 nr. 6. Risikovurdering gjennomføres:</p>
<ul>
<li>Årlig overordnet risikovurdering (januar)</li>
<li>Ved nye aktiviteter, ombygginger eller endringer</li>
<li>Etter alvorlige hendelser</li>
<li>Ved endring i bemannning eller organisering</li>
</ul>
<h3>Metode</h3>
<p>Vi bruker risikomatrise (sannsynlighet x konsekvens, 1-5) og prioriterer tiltak etter risikoscore. Alle risikoer med score ≥ 9 skal ha tiltak med frist og ansvarlig.</p>
<h3>Nøkkelrisikoer for vår bransje</h3>
<ul>
<li>Ergonomi og stående arbeid</li>
<li>Kjemikalieeksponering (renhold, basseng)</li>
<li>Brann og evakuering (kjøkken, spa)</li>
<li>Vold/trusler fra gjester</li>
<li>Mattrygghet og allergener</li>
<li>Legionella (dusjer, boblebad)</li>
<li>Psykososialt (trakassering, nattarbeid)</li>
</ul>`,
    s4: `<h2>Avvik, hendelser og forbedring</h2>
<p>Alle ansatte har plikt til å melde avvik og uønskede hendelser (AML § 2-3). Meldinger gjøres via HMS Nova-appen.</p>
<h3>Kategorier</h3>
<ul>
<li><strong>Ulykke</strong> – personskade (varsles Arbeidstilsynet ved alvorlig, AML § 5-2)</li>
<li><strong>Nestenulykke</strong> – tilløp uten skade</li>
<li><strong>Farlig situasjon</strong> – observasjon av fare</li>
<li><strong>Kvalitetsavvik</strong> – brudd på prosedyre/standard</li>
<li><strong>Kundeklage</strong> – tilbakemelding fra gjest</li>
</ul>
<h3>Behandlingsprosess</h3>
<ol>
<li>Melding (ansatt)</li>
<li>Vurdering og umiddelbare tiltak (HMS-ansvarlig)</li>
<li>Årsaksanalyse (5 hvorfor)</li>
<li>Korrigerende tiltak med frist og ansvarlig</li>
<li>Verifikasjon av effekt</li>
</ol>`,
    s5: `<h2>Kompetanse og opplæring</h2>
<p>Alle ansatte skal ha tilstrekkelig opplæring til å utføre arbeidet på en forsvarlig måte (AML § 3-2).</p>
<h3>Obligatorisk opplæring – alle ansatte</h3>
<ul>
<li>HMS-introduksjon ved ansettelse</li>
<li>Brannvernopplæring (årlig)</li>
<li>Førstehjelp (hvert 2. år)</li>
</ul>
<h3>Avdelingsspesifikk opplæring</h3>
<ul>
<li><strong>Kjøkken:</strong> Mattrygghet og HACCP, allergenbehandling</li>
<li><strong>Renhold:</strong> Kjemikaliehåndtering, ergonomi, løfteteknikk</li>
<li><strong>Resepsjon:</strong> Håndtering av vold/trusler, alenearbeid</li>
<li><strong>Spa:</strong> Bassengkjemi (klor), hygienekrav</li>
</ul>
<h3>Dokumentasjon</h3>
<p>All opplæring dokumenteres i HMS Nova med kursbevis og utløpsdato. Automatisk varsling ved utløp.</p>`,
    s6: `<h2>Operasjonell kontroll</h2>
<p>Følgende SJA-er (sikker jobb-analyse) og daglige kontroller er etablert:</p>
<ul>
<li>SJA: Rengjøring med sterke kjemikalier</li>
<li>SJA: Kjøkkenarbeid med frityrkokere og ovner</li>
<li>SJA: Arbeid alene – nattvakt og resepsjon</li>
<li>SJA: Basseng- og spabassengdrift</li>
<li>Daglig temperaturlogg HACCP (kjøkken)</li>
<li>Daglig sjekkliste resepsjon (rømningsveier, alarm)</li>
</ul>`,
    s7: `<h2>Brannvern og beredskap</h2>
<p>Fjordheim Hotell er klassifisert som særskilt brannobjekt (brann- og eksplosjonsvernloven § 13). Brannvernleder: Thomas Berg.</p>
<h3>Tiltak</h3>
<ul>
<li>Oppdatert evakueringsplan i alle etasjer og rom</li>
<li>Kvartalsvis kontroll av slokkeutstyr og rømningsveier</li>
<li>Brannøvelse minst 2 ganger per år (inkl. en uanmeldt)</li>
<li>Røykvarslere, sprinkler og nødbelysning iht. forskriftskrav</li>
<li>Brannvernopplæring for alle nyansatte</li>
</ul>
<h3>Beredskapsplan</h3>
<p>Beredskapsplan dekker brann, akutt personskade, truende gjest, og naturhendelser (flom/ras). Nødnumre hengt opp ved alle personalinnganger.</p>`,
    s8: `<h2>Vernerunder og løpende internkontroll</h2>
<p>Vernerunder gjennomføres iht. AML § 6-2 og IK-HMS § 5 nr. 7:</p>
<ul>
<li>Kvartalsvis hovedvernerunde (HMS-ansvarlig + verneombud)</li>
<li>Månedlig kjøkkeninspeksjon (HACCP-fokus)</li>
<li>Halvårlig brannvernrunde</li>
</ul>
<h3>Gjennomføring</h3>
<p>Vernerunder gjennomføres med digital sjekkliste i HMS Nova. Funn registreres som avvik med ansvarlig og frist. Avslutningsrapport signeres av deltakere.</p>`,
    s9: `<h2>Ledelsens gjennomgang</h2>
<p>Ledelsen gjennomgår HMS-systemet minimum årlig (IK-HMS § 5 nr. 8). Gjennomgangen dekker:</p>
<ul>
<li>Status på HMS-mål og KPI-er</li>
<li>Avviksstatistikk og trender</li>
<li>Risikovurderinger og behov for oppdatering</li>
<li>Opplæringsstatus</li>
<li>Resultat fra vernerunder og revisjoner</li>
<li>Medarbeiderundersøkelse (psykososialt)</li>
<li>Behov for ressurser eller endringer i systemet</li>
</ul>`,
    s10: `<h2>Dokumentstyring og systemkontroll</h2>
<p>HMS-dokumenter styres gjennom HMS Nova med versjonskontroll, tilgangskontroll og automatisk gjennomgangsfrist.</p>
<ul>
<li>Alle styrende dokumenter har eier, versjon og gjennomgangsdato</li>
<li>Utdaterte dokumenter arkiveres automatisk</li>
<li>Sikkerhetsdatablad oppdateres årlig</li>
<li>Tilgang basert på rolle og avdeling</li>
</ul>`,
    s11: `<h2>Arbeidsmiljø – fysisk og psykososialt</h2>
<h3>Fysisk arbeidsmiljø</h3>
<ul>
<li>Ergonomikartlegging av arbeidsstasjoner (housekeeping, resepsjon, kjøkken)</li>
<li>Støy- og temperaturmålinger</li>
<li>Inneklima – ventilasjon i alle avdelinger</li>
</ul>
<h3>Psykososialt arbeidsmiljø (AML § 4-3)</h3>
<ul>
<li>Halvårlig anonym kartlegging (trivsel, arbeidsmengde, støtte, trakassering)</li>
<li>Årlig medarbeidersamtale</li>
<li>Nulltoleranse for trakassering og seksuell trakassering</li>
<li>Rutine for oppfølging av høyt arbeidspress i sesong</li>
</ul>
<h3>Tiltak i 2026</h3>
<ul>
<li>Anti-tretthetsmatter i resepsjon og kjøkken</li>
<li>Løftekurs for housekeeping</li>
<li>Debrifing-ordning etter krevende gjestesituasjoner</li>
</ul>`,
    s11b: `<h2>Varsling av kritikkverdige forhold</h2>
<p>Alle ansatte har rett til å varsle om kritikkverdige forhold uten frykt for gjengjeldelse (AML § 2 A-1).</p>
<h3>Varslingskanal</h3>
<ul>
<li>HMS Nova – anonym varslingsmodul</li>
<li>Direkte til verneombud (Erik Strand)</li>
<li>Direkte til daglig leder (Kari Fjordheim)</li>
<li>Bedriftshelsetjeneste (Anne Lind) for eksterne henvendelser</li>
</ul>
<h3>Behandling</h3>
<p>Varsler behandles konfidensielt innen 7 virkedager. Varsler skal aldri utsettes for gjengjeldelse.</p>`,
    s12: `<h2>Ytre miljø og avfall</h2>
<ul>
<li>Kildesortering i alle avdelinger (restavfall, papir, plast, glass, matavfall)</li>
<li>Stoffkartotek for alle kjemikalier (tilgjengelig i HMS Nova)</li>
<li>Legionella-kontroll av dusjer og boblebad (kvartalsvis prøve)</li>
<li>Avfettingsvann fra kjøkken – fettavskiller kontrolleres månedlig</li>
<li>Energisparetiltak: LED-belysning, varmepumpe, vannsparing på rom</li>
</ul>`,
    s13: `<h2>Årshjul for HMS-aktiviteter</h2>
<ul>
<li><strong>Januar:</strong> Årlig risikovurdering, ledelsens gjennomgang</li>
<li><strong>Februar:</strong> Opplæringsplan revideres</li>
<li><strong>Mars:</strong> Vernerunde Q1, brannøvelse (anmeldt)</li>
<li><strong>April:</strong> Psykososial kartlegging (vår)</li>
<li><strong>Mai:</strong> Sesongoppstart – onboarding sommeransatte</li>
<li><strong>Juni:</strong> Vernerunde Q2, kjøkkeninspeksjon</li>
<li><strong>August:</strong> Brannøvelse (uanmeldt)</li>
<li><strong>September:</strong> Vernerunde Q3, medarbeidersamtaler</li>
<li><strong>Oktober:</strong> Psykososial kartlegging (høst)</li>
<li><strong>November:</strong> Opplæring nyansatte vinter</li>
<li><strong>Desember:</strong> Vernerunde Q4, evaluering og forberedelse neste år</li>
</ul>`,
    s14: `<h2>Intern revisjon og systemevaluering</h2>
<p>Intern revisjon gjennomføres årlig for å verifisere at HMS-systemet fungerer som tiltenkt (IK-HMS § 5 nr. 8).</p>
<ul>
<li>Revisjonsplan utarbeides i januar</li>
<li>Revisjon gjennomføres av HMS-ansvarlig eller ekstern BHT</li>
<li>Funn dokumenteres og følges opp som avvik</li>
<li>Revisjonsrapport presenteres for ledelsen</li>
</ul>`,
    s15: `<h2>Rutiner og prosedyrer</h2>
<p>Følgende rutiner er etablert og tilgjengelig for alle ansatte:</p>
<ul>
<li>Brannvernrutine</li>
<li>Rutine for temperaturkontroll HACCP</li>
<li>Rutine for håndtering av vold og trusler</li>
<li>Varslingsrutine</li>
<li>Rutine for legionella-kontroll</li>
<li>Onboarding-prosedyre for nyansatte</li>
<li>Rutine for kjemikaliehåndtering</li>
<li>Rutine for håndtering av allergener</li>
</ul>
<p>Alle rutiner gjennomgås årlig og revideres ved behov. Ansvarlig for oppdatering er HMS-ansvarlig.</p>`,
  };

  for (const sec of SECTIONS) {
    await prisma.handbookSection.create({
      data: {
        versionId: handbookVersion.id,
        sectionKey: sec.key,
        sectionNumber: sec.num,
        title: sec.title,
        content: HOSPITALITY_CONTENT[sec.key] || `<p>${sec.title} – innhold her.</p>`,
        sortOrder: sec.sort,
        legalRef: sec.legalRef,
      },
    });
  }

  await prisma.handbookSignature.create({
    data: { handbookId: handbook.id, userId: adminId, signedAt: new Date("2026-03-15") },
  });
  await prisma.handbookSignature.create({
    data: { handbookId: handbook.id, userId: vernId, signedAt: new Date("2026-03-16") },
  });

  console.log("✅ HMS-handbok med 18 seksjoner (APPROVED v2.0)\n");

  // ── 5. Risikovurdering ────────────────────────────────────────────────────
  const riskAssessment = await prisma.riskAssessment.create({
    data: {
      tenantId: tenant.id,
      title: "Årlig risikovurdering 2026 – Fjordheim Hotell & Spa",
      assessmentYear: 2026,
      participants: "Kari Fjordheim, Thomas Berg, Erik Strand, Ingrid Haugen",
      approvedById: adminId,
      approvedAt: new Date("2026-01-20"),
    },
  });

  const risksData = [
    { title: "Ergonomi – stående og gående arbeid", context: "82% i overnatting/servering har stående arbeid (STAMI). Housekeeping, servering og resepsjon særlig utsatt.", category: "HEALTH", likelihood: 4, consequence: 3, status: "MITIGATING", residualLikelihood: 2, residualConsequence: 3 },
    { title: "Vått arbeid – renhold og kjøkken", context: "Hyppig kontakt med vann og kjemikalier kan føre til dermatitter.", category: "HEALTH", likelihood: 3, consequence: 2, status: "MITIGATING", residualLikelihood: 2, residualConsequence: 2 },
    { title: "Kjemikalier – rengjøringsmidler", context: "Bruk av rengjøringsmidler, desinfeksjon og bassengkjemikalier. Krav om stoffkartotek (AML § 4-5).", category: "SAFETY", likelihood: 3, consequence: 3, status: "MITIGATING", residualLikelihood: 2, residualConsequence: 2 },
    { title: "Vold, trusler og krevende kundesituasjoner", context: "Arbeidstilsynet fant brudd i 26% av tilsyn. Resepsjon, bar og nattvakt er utsatt.", category: "HEALTH", likelihood: 3, consequence: 3, status: "OPEN" },
    { title: "Nattarbeid og skiftarbeid", context: "Nattarbeid øker risiko for søvnforstyrrelser og hjerte-kar-sykdom (AML § 10-11).", category: "HEALTH", likelihood: 4, consequence: 2, status: "MITIGATING", residualLikelihood: 3, residualConsequence: 2 },
    { title: "Seksuell trakassering", context: "14% i næringen oppga uønsket seksuell oppmerksomhet (Arbeidstilsynet).", category: "PSYCHOSOCIAL", likelihood: 3, consequence: 3, status: "MITIGATING", residualLikelihood: 2, residualConsequence: 3 },
    { title: "Brann og evakuering", context: "Hotell med overnattingsgjester – særskilt brannobjekt. Kjøkken med frityr, spa med klorkjemikalier.", category: "SAFETY", likelihood: 2, consequence: 5, status: "MITIGATING", residualLikelihood: 1, residualConsequence: 5 },
    { title: "Mattrygghetsfare – HACCP", context: "HACCP-plikt iht. forordning (EF) 852/2004. Feil temperatur og krysskontaminasjon.", category: "SAFETY", likelihood: 3, consequence: 4, status: "MITIGATING", residualLikelihood: 2, residualConsequence: 3 },
    { title: "Legionella i dusjer og spa", context: "Varmt vann i boblebad og dusjer gir vekst for Legionella. Forskrift om miljørettet helsevern.", category: "SAFETY", likelihood: 2, consequence: 5, status: "OPEN" },
    { title: "Ergonomi – løft i housekeeping", context: "Tunge løft, ukvemsarbeid og repetitivt arbeid i housekeeping (STAMI).", category: "HEALTH", likelihood: 4, consequence: 3, status: "MITIGATING", residualLikelihood: 3, residualConsequence: 2 },
  ];

  const riskIds: string[] = [];
  for (const r of risksData) {
    const risk = await prisma.risk.create({
      data: {
        tenantId: tenant.id,
        riskAssessmentId: riskAssessment.id,
        title: r.title,
        context: r.context,
        category: r.category as any,
        likelihood: r.likelihood,
        consequence: r.consequence,
        score: r.likelihood * r.consequence,
        status: r.status as any,
        ownerId: hmsId,
        residualLikelihood: r.residualLikelihood ?? null,
        residualConsequence: r.residualConsequence ?? null,
        residualScore: r.residualLikelihood && r.residualConsequence ? r.residualLikelihood * r.residualConsequence : null,
        nextReviewDate: new Date("2027-01-15"),
      },
    });
    riskIds.push(risk.id);
  }
  console.log(`✅ ${risksData.length} risikoer opprettet\n`);

  // ── 6. Avvik / hendelser ──────────────────────────────────────────────────
  const incidentsData = [
    {
      title: "Glatt gulv i spa-området",
      description: "Gjest skled nesten på vått gulv ved inngang til svømmebasseng. Gulvet var nyvasket uten advarselskilt.",
      type: "NESTEN",
      status: "OPEN",
      stage: "REPORTED",
      severity: 3,
      location: "Spa – bassengområde",
      reportedBy: marteId,
      occurredAt: new Date("2026-08-20"),
      avviksnummer: "AV-2026-001",
      immediateAction: "Satte ut advarselskilt og tørket gulv.",
    },
    {
      title: "Manglende brannslukker i teknisk rom",
      description: "Under vernerunde oppdaget at brannslukker i teknisk rom manglet – fjernet for service men ikke erstattet.",
      type: "AVVIK",
      status: "INVESTIGATING",
      stage: "UNDER_REVIEW",
      severity: 4,
      location: "Teknisk rom, kjeller",
      reportedBy: vernId,
      occurredAt: new Date("2026-08-10"),
      avviksnummer: "AV-2026-002",
      immediateAction: "Hentet reserveslukker fra lager og plasserte midlertidig.",
    },
    {
      title: "Allergireaksjon hos gjest – nøtter i dessert",
      description: "Gjest fikk allergisk reaksjon etter å ha spist dessert som inneholdt spor av nøtter uten at dette var merket på menyen.",
      type: "CUSTOMER",
      status: "ACTION_TAKEN",
      stage: "ACTIONS_DEFINED",
      severity: 4,
      location: "Restaurant",
      reportedBy: lederId,
      occurredAt: new Date("2026-07-28"),
      avviksnummer: "AV-2026-003",
      immediateAction: "Gjest fikk antihistamin, ambulanse tilkalt som forholdsregel. Retten tatt av menyen umiddelbart.",
      rootCause: "Allergenoversikt ikke oppdatert etter menyendring. Manglende kommunikasjon mellom souschef og servitører.",
      contributingFactors: "Sesongansatt souschef hadde ikke fått opplæring i allergenrutine.",
      customerName: "Lars Henriksen",
      customerEmail: "lars.h@gmail.com",
    },
    {
      title: "Ryggplager etter tung løfting – housekeeping",
      description: "Marte fikk akutte ryggplager etter å ha løftet tung madrass alene ved rombyte.",
      type: "FARLIG_SITUASJON",
      status: "CLOSED",
      stage: "VERIFIED",
      severity: 3,
      location: "Hotellrom 304",
      reportedBy: marteId,
      occurredAt: new Date("2026-06-15"),
      avviksnummer: "AV-2026-004",
      immediateAction: "Marte gikk til pause. Kollega overtok rombyte.",
      rootCause: "Mangel på løfteutstyr (madrass-løfter) og rutine om to-persons løft ved tunge gjenstander.",
      investigatedBy: hmsId,
      investigatedAt: new Date("2026-06-16"),
      closedBy: hmsId,
      closedAt: new Date("2026-07-10"),
      lessonsLearned: "Innført krav om to-persons løft for madrasser. Bestilt madrass-løfter.",
    },
    {
      title: "Truende gjest i resepsjon – nattvakt",
      description: "Beruset gjest oppførte seg truende mot nattevakt og nektet å forlate lobbyen. Kastet asjett.",
      type: "NESTEN",
      status: "CLOSED",
      stage: "VERIFIED",
      severity: 4,
      location: "Resepsjon",
      reportedBy: vernId,
      occurredAt: new Date("2026-05-22"),
      avviksnummer: "AV-2026-005",
      immediateAction: "Trykte alarm-knapp. Kollega tilkalt. Gjest fjernet av vekter.",
      rootCause: "Alenearbeid uten tilstrekkelig backup-rutine for nattevakt ved helger med fullt hus.",
      investigatedBy: hmsId,
      investigatedAt: new Date("2026-05-23"),
      closedBy: adminId,
      closedAt: new Date("2026-06-05"),
      lessonsLearned: "Innført to-manns bemanning helgenetter. Oppdatert vold/trussel-rutine.",
    },
    {
      title: "Manglende temperaturlogg – kjølerom",
      description: "Temperaturlogg for kjølerom 2 ikke ført på 4 dager. Oppdaget ved kjøkkeninspeksjon.",
      type: "KVALITET",
      status: "CLOSED",
      stage: "VERIFIED",
      severity: 2,
      location: "Kjøkken – kjølerom 2",
      reportedBy: lederId,
      occurredAt: new Date("2026-04-18"),
      avviksnummer: "AV-2026-006",
      immediateAction: "Kontrollerte temperaturer – alt innenfor krav. Fylte inn logg.",
      rootCause: "Ansvarlig kokk på ferie, vikar ikke informert om rutine.",
      investigatedBy: lederId,
      investigatedAt: new Date("2026-04-19"),
      closedBy: hmsId,
      closedAt: new Date("2026-04-25"),
      lessonsLearned: "Temperaturlogg lagt til i ferieoverleverings-sjekkliste.",
    },
  ];

  const incidentIds: string[] = [];
  for (const inc of incidentsData) {
    const incident = await prisma.incident.create({
      data: {
        tenantId: tenant.id,
        title: inc.title,
        description: inc.description,
        type: inc.type as any,
        status: inc.status as any,
        stage: inc.stage as any,
        severity: inc.severity,
        location: inc.location,
        reportedBy: inc.reportedBy,
        occurredAt: inc.occurredAt,
        avviksnummer: inc.avviksnummer,
        immediateAction: inc.immediateAction ?? null,
        rootCause: inc.rootCause ?? null,
        contributingFactors: inc.contributingFactors ?? null,
        investigatedBy: inc.investigatedBy ?? null,
        investigatedAt: inc.investigatedAt ?? null,
        closedBy: inc.closedBy ?? null,
        closedAt: inc.closedAt ?? null,
        lessonsLearned: inc.lessonsLearned ?? null,
        customerName: inc.customerName ?? null,
        customerEmail: inc.customerEmail ?? null,
      },
    });
    incidentIds.push(incident.id);
  }
  console.log(`✅ ${incidentsData.length} avvik/hendelser opprettet\n`);

  // ── 7. Tiltak (Measure) ───────────────────────────────────────────────────
  const measuresData = [
    { title: "Sklisikring installert i spa-område", status: "DONE", category: "CORRECTIVE", riskIdx: 0, incidentIdx: null, responsibleId: hmsId, dueAt: new Date("2026-04-01") },
    { title: "Anti-tretthetsmatter kjøpt til resepsjon og kjøkken", status: "DONE", category: "PREVENTIVE", riskIdx: 0, incidentIdx: null, responsibleId: hmsId, dueAt: new Date("2026-03-15") },
    { title: "Oppdatering av nattarbeidsrutine", status: "IN_PROGRESS", category: "CORRECTIVE", riskIdx: 4, incidentIdx: null, responsibleId: hmsId, dueAt: new Date("2026-09-01") },
    { title: "Legionella-testplan implementert", status: "PENDING", category: "PREVENTIVE", riskIdx: 8, incidentIdx: null, responsibleId: hmsId, dueAt: new Date("2026-10-01") },
    { title: "Alarm-oppgradering resepsjon", status: "PENDING", category: "PREVENTIVE", riskIdx: 3, incidentIdx: null, responsibleId: vernId, dueAt: new Date("2026-09-15") },
    { title: "Madrass-løfter bestilt til housekeeping", status: "DONE", category: "CORRECTIVE", riskIdx: 9, incidentIdx: 3, responsibleId: hmsId, dueAt: new Date("2026-07-01") },
    { title: "To-manns bemanning helgenetter innført", status: "DONE", category: "CORRECTIVE", riskIdx: 3, incidentIdx: 4, responsibleId: adminId, dueAt: new Date("2026-06-01") },
    { title: "Oppdatert allergenoversikt og opplæring servitører", status: "DONE", category: "CORRECTIVE", riskIdx: 7, incidentIdx: 2, responsibleId: lederId, dueAt: new Date("2026-08-05") },
    { title: "Rutine for ferieoverlevering kjøkken oppdatert", status: "DONE", category: "IMPROVEMENT", riskIdx: null, incidentIdx: 5, responsibleId: lederId, dueAt: new Date("2026-05-01") },
    { title: "Ny brannslukker til teknisk rom – fast leverandøravtale", status: "IN_PROGRESS", category: "CORRECTIVE", riskIdx: 6, incidentIdx: 1, responsibleId: hmsId, dueAt: new Date("2026-08-30") },
  ];

  for (const m of measuresData) {
    await prisma.measure.create({
      data: {
        tenantId: tenant.id,
        title: m.title,
        status: m.status as any,
        category: m.category as any,
        responsibleId: m.responsibleId,
        dueAt: m.dueAt,
        riskId: m.riskIdx !== null ? riskIds[m.riskIdx] : null,
        incidentId: m.incidentIdx !== null ? incidentIds[m.incidentIdx] : null,
        effectiveness: m.status === "DONE" ? "EFFECTIVE" : "NOT_EVALUATED",
      },
    });
  }
  console.log(`✅ ${measuresData.length} tiltak opprettet\n`);

  // ── 8. Vernerunder / inspeksjoner ─────────────────────────────────────────
  // Opprett FormTemplate for vernerunde
  const vernerundeTemplate = await prisma.formTemplate.create({
    data: {
      title: "Vernerunde – Fjordheim Hotell",
      tenantId: tenant.id,
      category: "INSPECTION",
      createdBy: hmsId,
      requiresSignature: true,
      isActive: true,
    },
  });

  const vernerundeFields = [
    { label: "Fysisk arbeidsmiljø", fieldType: "SECTION_HEADER", order: 1 },
    { label: "Ryddige og frie rømningsveier", fieldType: "RADIO", order: 2, options: '["OK","Ikke OK","Ikke relevant"]', isRequired: true },
    { label: "Tilstrekkelig belysning i alle arealer", fieldType: "RADIO", order: 3, options: '["OK","Ikke OK","Ikke relevant"]', isRequired: true },
    { label: "Sklisikre gulvflater", fieldType: "RADIO", order: 4, options: '["OK","Ikke OK","Ikke relevant"]', isRequired: true },
    { label: "Nødutgangskilt synlige og belyst", fieldType: "RADIO", order: 5, options: '["OK","Ikke OK","Ikke relevant"]', isRequired: true },
    { label: "Ergonomi og arbeidsstasjon", fieldType: "SECTION_HEADER", order: 6 },
    { label: "Anti-tretthetsmatter på stående arbeidsplasser", fieldType: "RADIO", order: 7, options: '["OK","Ikke OK","Ikke relevant"]', isRequired: true },
    { label: "Ergonomisk tilrettelagte arbeidsstasjoner", fieldType: "RADIO", order: 8, options: '["OK","Ikke OK","Ikke relevant"]', isRequired: true },
    { label: "Brann og sikkerhet", fieldType: "SECTION_HEADER", order: 9 },
    { label: "Brannslukker tilgjengelig og datert", fieldType: "RADIO", order: 10, options: '["OK","Ikke OK","Ikke relevant"]', isRequired: true },
    { label: "Brannteppe tilgjengelig i kjøkken", fieldType: "RADIO", order: 11, options: '["OK","Ikke OK","Ikke relevant"]', isRequired: true },
    { label: "Varslingsknapp/alarm testet", fieldType: "RADIO", order: 12, options: '["OK","Ikke OK","Ikke relevant"]', isRequired: true },
    { label: "Kommentar / observasjoner", fieldType: "TEXTAREA", order: 13, isRequired: false },
  ];

  const fieldIds: string[] = [];
  for (const f of vernerundeFields) {
    const field = await prisma.formField.create({
      data: {
        formTemplateId: vernerundeTemplate.id,
        fieldType: f.fieldType as any,
        label: f.label,
        order: f.order,
        isRequired: f.isRequired ?? false,
        options: f.options ?? null,
      },
    });
    fieldIds.push(field.id);
  }

  // Fullført vernerunde Q1 2026
  const submission1 = await prisma.formSubmission.create({
    data: {
      formTemplateId: vernerundeTemplate.id,
      tenantId: tenant.id,
      status: "SUBMITTED",
      submittedById: hmsId,
      signedAt: new Date("2026-03-22"),
    },
  });

  const radioFieldIds = fieldIds.filter((_, i) => vernerundeFields[i].fieldType === "RADIO");
  const q1Answers = ["OK", "OK", "OK", "OK", "OK", "OK", "OK", "Ikke OK", "OK", "Ikke OK"];
  for (let i = 0; i < radioFieldIds.length; i++) {
    await prisma.formFieldValue.create({
      data: { submissionId: submission1.id, fieldId: radioFieldIds[i], value: q1Answers[i] ?? "OK" },
    });
  }

  await prisma.inspection.create({
    data: {
      tenantId: tenant.id,
      title: "Hovedvernerunde Q1 2026",
      type: "VERNERUNDE",
      status: "COMPLETED",
      scheduledDate: new Date("2026-03-20"),
      completedDate: new Date("2026-03-22"),
      conductedBy: hmsId,
      formTemplateId: vernerundeTemplate.id,
      formSubmissionId: submission1.id,
      participants: "Thomas Berg, Erik Strand",
      location: "Hele hotellet",
    },
  });

  // Kjøkkeninspeksjon
  const kjokkenInspeksjon = await prisma.inspection.create({
    data: {
      tenantId: tenant.id,
      title: "Kjøkkeninspeksjon – HACCP Q2 2026",
      type: "HMS_INSPEKSJON",
      status: "COMPLETED",
      scheduledDate: new Date("2026-06-10"),
      completedDate: new Date("2026-06-12"),
      conductedBy: lederId,
      participants: "Ingrid Haugen, Thomas Berg",
      location: "Kjøkken",
    },
  });

  await prisma.inspectionFinding.create({
    data: {
      inspectionId: kjokkenInspeksjon.id,
      title: "Temperaturlogger ikke signert siste uke",
      description: "Temperaturlogg for kjølerom mangler signatur for 3 av 7 dager.",
      severity: 2,
      status: "RESOLVED",
    },
  });
  await prisma.inspectionFinding.create({
    data: {
      inspectionId: kjokkenInspeksjon.id,
      title: "Sikkerhetsdatablad mangler for nytt avfettingsmiddel",
      description: "Nytt avfettingsmiddel tatt i bruk uten at SDB er lagt inn i stoffkartotek.",
      severity: 3,
      status: "RESOLVED",
    },
  });

  // Planlagt brannvernrunde
  await prisma.inspection.create({
    data: {
      tenantId: tenant.id,
      title: "Brannvernrunde Q3 2026",
      type: "VERNERUNDE",
      status: "PLANNED",
      scheduledDate: new Date("2026-09-15"),
      conductedBy: hmsId,
      participants: "Thomas Berg, Erik Strand, Silje Nordby",
      location: "Hele hotellet inkl. spa og teknisk",
      riskCategory: "SAFETY",
    },
  });

  console.log("✅ 3 vernerunder/inspeksjoner opprettet\n");

  // ── 9. Psykososial kartlegging (WELLBEING) ────────────────────────────────
  const wellbeingTemplate = await prisma.formTemplate.create({
    data: {
      title: "Psykososial puls – Fjordheim Hotell",
      tenantId: tenant.id,
      category: "WELLBEING",
      createdBy: hmsId,
      allowAnonymousResponses: true,
      requiresSignature: false,
      isActive: true,
    },
  });

  const wellbeingFields = [
    { label: "Hvordan trives du på jobb?", fieldType: "LIKERT_SCALE", order: 1, isRequired: true },
    { label: "Opplever du arbeidsmengden som håndterbar?", fieldType: "LIKERT_SCALE", order: 2, isRequired: true },
    { label: "Får du tilstrekkelig støtte fra leder?", fieldType: "LIKERT_SCALE", order: 3, isRequired: true },
    { label: "Føler du deg trygg på arbeidsplassen?", fieldType: "LIKERT_SCALE", order: 4, isRequired: true },
    { label: "Kommentar (valgfritt)", fieldType: "TEXTAREA", order: 5, isRequired: false },
  ];

  const wbFieldIds: string[] = [];
  for (const f of wellbeingFields) {
    const field = await prisma.formField.create({
      data: {
        formTemplateId: wellbeingTemplate.id,
        fieldType: f.fieldType as any,
        label: f.label,
        order: f.order,
        isRequired: f.isRequired,
      },
    });
    wbFieldIds.push(field.id);
  }

  // 4 anonyme svar
  const wbResponses = [
    { scores: ["4", "4", "5", "5"], comment: null },
    { scores: ["4", "3", "4", "4"], comment: "Litt mye i høysesongen, men godt teamarbeid." },
    { scores: ["5", "4", "4", "5"], comment: null },
    { scores: ["3", "3", "4", "3"], comment: "Ønsker bedre rutine for vold/trusler om natten." },
  ];

  for (const resp of wbResponses) {
    const sub = await prisma.formSubmission.create({
      data: {
        formTemplateId: wellbeingTemplate.id,
        tenantId: tenant.id,
        status: "SUBMITTED",
        submittedById: null,
        
      },
    });
    for (let i = 0; i < resp.scores.length; i++) {
      await prisma.formFieldValue.create({
        data: { submissionId: sub.id, fieldId: wbFieldIds[i], value: resp.scores[i] },
      });
    }
    if (resp.comment) {
      await prisma.formFieldValue.create({
        data: { submissionId: sub.id, fieldId: wbFieldIds[4], value: resp.comment },
      });
    }
  }

  console.log("✅ Psykososial kartlegging med 4 anonyme svar\n");

  // ── 10. Medarbeidersamtaler ───────────────────────────────────────────────
  const review1 = await prisma.employeeReview.create({
    data: {
      tenantId: tenant.id,
      employeeId: marteId,
      reviewerId: hmsId,
      scheduledDate: new Date("2026-03-05"),
      completedDate: new Date("2026-03-05"),
      status: "GJENNOMFORT",
      trivselScore: 4,
      arbeidsmiljoeScore: 4,
      samarbeidScore: 5,
      psykKravOgForventninger: "FORSVARLIG",
      psykEmosjonelleKrav: "FORSVARLIG",
      psykArbeidsmengde: "FORSVARLIG",
      psykStotteOgHjelp: "FORSVARLIG",
      oppsummeringKommentar: "Marte trives godt. Ønsker løftekurs. Ingen bekymringer.",
    },
  });
  await prisma.employeeReviewGoal.create({
    data: { reviewId: review1.id, tenantId: tenant.id, description: "Gjennomføre ergonomi-/løftekurs innen Q2", category: "FAGLIG", status: "OPPNADD" },
  });

  const review2 = await prisma.employeeReview.create({
    data: {
      tenantId: tenant.id,
      employeeId: jonasId,
      reviewerId: lederId,
      scheduledDate: new Date("2026-03-10"),
      completedDate: new Date("2026-03-10"),
      status: "SIGNERT",
      trivselScore: 3,
      arbeidsmiljoeScore: 3,
      samarbeidScore: 4,
      psykKravOgForventninger: "FORSVARLIG",
      psykEmosjonelleKrav: "DELVIS_FORSVARLIG",
      psykArbeidsmengde: "DELVIS_FORSVARLIG",
      psykStotteOgHjelp: "FORSVARLIG",
      oppsummeringKommentar: "Jonas opplever høy arbeidsbelastning i sesong. Behov for bedre planlegging.",
      signertAvAnsatt: true,
      signertAvLeder: true,
    },
  });
  await prisma.employeeReviewGoal.create({
    data: { reviewId: review2.id, tenantId: tenant.id, description: "Bedre sesongplanlegging med restaurantsjef", category: "VIRKSOMHET", status: "PAGAENDE" },
  });
  await prisma.employeeReviewAction.create({
    data: { reviewId: review2.id, tenantId: tenant.id, description: "Leder skal ta opp bemanningsplan med daglig leder", ansvarlig: "LEDER", dueDate: new Date("2026-05-01"), completed: true },
  });

  await prisma.employeeReview.create({
    data: {
      tenantId: tenant.id,
      employeeId: vernId,
      reviewerId: adminId,
      scheduledDate: new Date("2026-09-20"),
      status: "PLANLAGT",
    },
  });

  console.log("✅ 3 medarbeidersamtaler\n");

  // ── 11. Opplæring ─────────────────────────────────────────────────────────
  const trainingData = [
    { userId: adminId, courseKey: "brannvern", title: "Brannvernopplæring", provider: "DSB e-læring", completedAt: new Date("2026-01-10"), validUntil: new Date("2027-01-10"), isRequired: true },
    { userId: hmsId, courseKey: "brannvern", title: "Brannvernopplæring", provider: "DSB e-læring", completedAt: new Date("2026-01-10"), validUntil: new Date("2027-01-10"), isRequired: true },
    { userId: lederId, courseKey: "brannvern", title: "Brannvernopplæring", provider: "DSB e-læring", completedAt: new Date("2026-01-10"), validUntil: new Date("2027-01-10"), isRequired: true },
    { userId: vernId, courseKey: "brannvern", title: "Brannvernopplæring", provider: "DSB e-læring", completedAt: new Date("2026-01-10"), validUntil: new Date("2027-01-10"), isRequired: true },
    { userId: marteId, courseKey: "brannvern", title: "Brannvernopplæring", provider: "DSB e-læring", completedAt: new Date("2026-01-10"), validUntil: new Date("2027-01-10"), isRequired: true },
    { userId: jonasId, courseKey: "brannvern", title: "Brannvernopplæring", provider: "DSB e-læring", completedAt: new Date("2026-01-10"), validUntil: new Date("2027-01-10"), isRequired: true },
    { userId: hmsId, courseKey: "forstehjelp", title: "Førstehjelp", provider: "Røde Kors", completedAt: new Date("2025-10-20"), validUntil: new Date("2027-10-20"), isRequired: true },
    { userId: vernId, courseKey: "forstehjelp", title: "Førstehjelp", provider: "Røde Kors", completedAt: new Date("2025-10-20"), validUntil: new Date("2027-10-20"), isRequired: true },
    { userId: marteId, courseKey: "forstehjelp", title: "Førstehjelp", provider: "Røde Kors", completedAt: new Date("2025-04-15"), validUntil: new Date("2025-04-15"), isRequired: true }, // UTLØPT
    { userId: jonasId, courseKey: "hospitality_food_safety_haccp", title: "Mattrygghet og HACCP", provider: "NHO Reiseliv / Mattilsynet", completedAt: new Date("2025-11-05"), validUntil: new Date("2027-11-05"), isRequired: true },
    { userId: lederId, courseKey: "hospitality_food_safety_haccp", title: "Mattrygghet og HACCP", provider: "NHO Reiseliv / Mattilsynet", completedAt: new Date("2025-11-05"), validUntil: new Date("2027-11-05"), isRequired: true },
    { userId: vernId, courseKey: "hospitality_violence_threats", title: "Håndtering av vold og trusler", provider: "Arbeidstilsynet e-læring", completedAt: new Date("2026-02-12"), validUntil: new Date("2028-02-12"), isRequired: true },
    { userId: marteId, courseKey: "hospitality_chemical_handling", title: "Kjemikaliehåndtering renhold", provider: "HMS Nova e-læring", completedAt: new Date("2026-01-20"), validUntil: new Date("2028-01-20"), isRequired: true },
    { userId: marteId, courseKey: "ergonomi_loft", title: "Ergonomi og løfteteknikk", provider: "BHT / Anne Lind", completedAt: new Date("2026-04-10"), validUntil: new Date("2028-04-10"), isRequired: false },
  ];

  for (const t of trainingData) {
    await prisma.training.create({
      data: {
        tenantId: tenant.id,
        userId: t.userId,
        courseKey: t.courseKey,
        title: t.title,
        provider: t.provider,
        completedAt: t.completedAt,
        validUntil: t.validUntil,
        isRequired: t.isRequired,
      },
    });
  }
  console.log(`✅ ${trainingData.length} opplæringsposter\n`);

  // ── 12. Rutiner ───────────────────────────────────────────────────────────
  const routinesData = [
    { title: "Brannvernrutine", status: "ACTIVE", legalReference: "Brann- og eksplosjonsvernloven § 13, forskrift om brannforebygging § 12" },
    { title: "Rutine for temperaturkontroll HACCP", status: "ACTIVE", legalReference: "Forordning (EF) 852/2004 art. 5" },
    { title: "Rutine for håndtering av vold og trusler", status: "ACTIVE", legalReference: "AML § 4-3, Forskrift om utførelse av arbeid § 23A-1" },
    { title: "Varslingsrutine – kritikkverdige forhold", status: "ACTIVE", legalReference: "AML § 2 A-1 til § 2 A-7" },
    { title: "Legionella-kontroll dusjer og spa", status: "NEEDS_REVIEW", legalReference: "Forskrift om miljørettet helsevern § 11c" },
  ];

  for (const r of routinesData) {
    await prisma.routine.create({
      data: {
        tenantId: tenant.id,
        title: r.title,
        status: r.status as any,
        createdBy: hmsId,
        responsibleId: hmsId,
        legalReference: r.legalReference,
        reviewIntervalMonths: 12,
      },
    });
  }
  console.log(`✅ ${routinesData.length} rutiner\n`);

  // ── 13. Kjemikalier ───────────────────────────────────────────────────────
  const chemicalsData = [
    { productName: "Jif Professional Rengjøring", supplier: "Unilever", location: "Renholdslager", hazardClass: "Irriterende (GHS07)", notes: "Generell rengjøring alle avdelinger" },
    { productName: "Ecolab Oasis Pro 20 (desinfeksjon)", supplier: "Ecolab", location: "Kjøkken + renhold", hazardClass: "Etsende (GHS05)", notes: "Desinfeksjon overflater, sanitæranlegg" },
    { productName: "Sure Super HD (avfetting)", supplier: "Diversey", location: "Kjøkken", hazardClass: "Etsende (GHS05)", notes: "Avfetting storkjøkken – ovner, frityrkokere" },
    { productName: "HTH Klor granulat", supplier: "HTH/Arch", location: "Teknisk rom spa", hazardClass: "Oksiderende/Irriterende (GHS03/GHS07)", notes: "Vannbehandling svømmebasseng og boblebad" },
    { productName: "Sealed Air Suma Star D1", supplier: "Sealed Air", location: "Kjøkken", hazardClass: "Irriterende (GHS07)", notes: "Manuell oppvask" },
  ];

  for (const c of chemicalsData) {
    await prisma.chemical.create({
      data: {
        tenantId: tenant.id,
        productName: c.productName,
        supplier: c.supplier,
        location: c.location,
        hazardClass: c.hazardClass,
        notes: c.notes,
        lastVerifiedAt: new Date("2026-01-15"),
      },
    });
  }
  console.log(`✅ ${chemicalsData.length} kjemikalier\n`);

  // ── Ferdig ────────────────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════════");
  console.log("🏨 Fjordheim Hotell & Spa AS – Demo-data ferdig!");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`\nInnlogging: kari@fjordheim.no / ${PASSWORD}`);
  console.log("Alle brukere har samme passord.\n");
}

main()
  .catch((e) => {
    console.error("❌ Feil:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
