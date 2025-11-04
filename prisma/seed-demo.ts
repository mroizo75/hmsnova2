/**
 * DEMO SEED - Full data for Test Bedrift AS
 * Dette er for å vise systemet til kunder
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🎬 Seeding DEMO data for Test Bedrift AS...\n");

  // 1. Hent Test Bedrift AS
  const tenant = await prisma.tenant.findUnique({
    where: { slug: "test-bedrift" },
  });

  if (!tenant) {
    console.error("❌ Test Bedrift AS ikke funnet! Kjør først: npx prisma db seed");
    process.exit(1);
  }

  console.log(`✅ Tenant: ${tenant.name}\n`);

  // 2. Slett eksisterende demo-data for Test Bedrift AS
  console.log("🗑️  Rydder opp eksisterende demo-data...\n");

  await prisma.kpiMeasurement.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.goal.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.inspectionFinding.deleteMany({ where: { inspection: { tenantId: tenant.id } } });
  await prisma.inspection.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.auditFinding.deleteMany({ where: { audit: { tenantId: tenant.id } } });
  await prisma.audit.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.training.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.chemical.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.measure.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.incident.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.risk.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.documentVersion.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.document.deleteMany({ where: { tenantId: tenant.id } });

  console.log("✅ Eksisterende data slettet\n");

  // 3. Hent brukere
  const adminUser = await prisma.user.findUnique({ where: { email: "admin@test.no" } });
  const hmsUser = await prisma.user.findUnique({ where: { email: "hms@test.no" } });
  const leaderUser = await prisma.user.findUnique({ where: { email: "leder@test.no" } });

  if (!adminUser || !hmsUser || !leaderUser) {
    console.error("❌ Brukere ikke funnet!");
    process.exit(1);
  }

  // =====================================================================
  // 4. DOKUMENTER
  // =====================================================================
  console.log("📄 Oppretter dokumenter...");

  const documents = await Promise.all([
    prisma.document.create({
      data: {
        tenantId: tenant.id,
        title: "HMS-Håndbok 2025",
        slug: "hms-handbok-2025",
        kind: "OTHER",
        version: "1.0",
        fileKey: "demo/hms-handbok.pdf",
        status: "APPROVED",
        approvedBy: adminUser.id,
        approvedAt: new Date(),
        nextReviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.document.create({
      data: {
        tenantId: tenant.id,
        title: "Prosedyre for Avviksbehandling",
        slug: "prosedyre-avviksbehandling",
        kind: "PROCEDURE",
        version: "2.1",
        fileKey: "demo/avvik-prosedyre.pdf",
        status: "APPROVED",
        approvedBy: hmsUser.id,
        approvedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        nextReviewDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.document.create({
      data: {
        tenantId: tenant.id,
        title: "Brannvernplan",
        slug: "brannvernplan",
        kind: "PLAN",
        version: "1.3",
        fileKey: "demo/brannvernplan.pdf",
        status: "APPROVED",
        approvedBy: adminUser.id,
        approvedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        nextReviewDate: new Date(Date.now() + 305 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.document.create({
      data: {
        tenantId: tenant.id,
        title: "Arbeidsmiljøundersøkelse 2024",
        slug: "amu-2024",
        kind: "OTHER",
        version: "1.0",
        fileKey: "demo/amu-2024.pdf",
        status: "DRAFT",
      },
    }),
  ]);

  console.log(`   ✅ ${documents.length} dokumenter opprettet`);

  // =====================================================================
  // 5. RISIKOVURDERINGER
  // =====================================================================
  console.log("⚠️  Oppretter risikovurderinger...");

  const risk1 = await prisma.risk.create({
    data: {
      tenantId: tenant.id,
      title: "Fall fra høyde ved lagerarbeid",
      context: "Ansatte som jobber i høyden ved lagring kan falle og skade seg. Lokasjon: Lager - Høyreol seksjon A.",
      likelihood: 3,
      consequence: 4,
      score: 12,
      ownerId: leaderUser.id,
      status: "MITIGATING",
    },
  });

  await prisma.measure.create({
    data: {
      tenantId: tenant.id,
      riskId: risk1.id,
      title: "Sikkerhetssele og opplæring",
      description: "Sikkerhetssele påkrevd, årlig opplæring i høydearbeid, inspeksjon av utstyr hver måned.",
      status: "DONE",
      responsibleId: leaderUser.id,
      dueAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
  });

  const risk2 = await prisma.risk.create({
    data: {
      tenantId: tenant.id,
      title: "Kjemisk eksponering - Rengjøringsmidler",
      context: "Eksponering for sterke rengjøringsmidler kan forårsake hudirritasjon og luftveisplager. Lokasjon: Rengjøringsrom.",
      likelihood: 2,
      consequence: 2,
      score: 4,
      ownerId: hmsUser.id,
      status: "MITIGATING",
    },
  });

  await prisma.measure.create({
    data: {
      tenantId: tenant.id,
      riskId: risk2.id,
      title: "Verneutstyr og opplæring",
      description: "Bruk av hansker og åndedrettsvern, opplæring i sikker håndtering, sikkerhetsdatablad tilgjengelig.",
      status: "DONE",
      responsibleId: hmsUser.id,
      dueAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    },
  });

  const risk3 = await prisma.risk.create({
    data: {
      tenantId: tenant.id,
      title: "Ergonomiske belastninger - Dataarbeid",
      context: "Langvarig dataarbeid kan føre til muskel- og skjelettplager. Lokasjon: Kontorer.",
      likelihood: 3,
      consequence: 2,
      score: 6,
      ownerId: leaderUser.id,
      status: "MITIGATING",
    },
  });

  const risk4 = await prisma.risk.create({
    data: {
      tenantId: tenant.id,
      title: "Brann i elektrisk utstyr",
      context: "Eldre elektrisk utstyr kan overopphetes og forårsake brann. Lokasjon: Produksjonshall B.",
      likelihood: 1,
      consequence: 5,
      score: 5,
      ownerId: hmsUser.id,
      status: "OPEN",
    },
  });

  console.log(`   ✅ 4 risikovurderinger opprettet`);

  // =====================================================================
  // 6. HENDELSER/AVVIK
  // =====================================================================
  console.log("🚨 Oppretter hendelser/avvik...");

  const incidents = await Promise.all([
    prisma.incident.create({
      data: {
        tenantId: tenant.id,
        title: "Liten kuttsår ved bruk av stansemaskin",
        type: "SKADE",
        severity: 2,
        description: "Ansatt kuttet seg på fingeren ved bytte av stanseverktøy. Førstehjelpsutstyr ble brukt.",
        location: "Produksjon, maskin 3",
        reportedBy: "ansatt@test.no",
        investigatedBy: hmsUser.id,
        immediateAction: "Førstehjelpsutstyr ble brukt. Ansatt ble sendt til legevakt for kontroll.",
        rootCause: "Manglende bruk av vernehansker under vedlikehold av stansemaskin.",
        status: "CLOSED",
        closedBy: hmsUser.id,
        closedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        occurredAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        investigatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        lessonsLearned: "Påminnelse om bruk av verneutstyr. Oppdatert arbeidsinstruksjon. Ekstra opplæring for berørte.",
      },
    }),
    prisma.incident.create({
      data: {
        tenantId: tenant.id,
        title: "Glassflasker funnet på gulvet i lager",
        type: "NESTEN",
        severity: 3,
        description: "To glassflasker ble funnet på gulvet i lagergangen. Kunne ha forårsaket snubling eller kutt.",
        location: "Lager, gang 4",
        reportedBy: "leder@test.no",
        responsibleId: hmsUser.id,
        immediateAction: "Glassflasker fjernet umiddelbart.",
        rootCause: "Utilstrekkelig oppbevaring av glass etter mottak.",
        status: "ACTION_TAKEN",
        occurredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        investigatedBy: hmsUser.id,
        investigatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        lessonsLearned: "Innført rutine for umiddelbar rydding. Plassert flere avfallsbeholdere.",
      },
    }),
    prisma.incident.create({
      data: {
        tenantId: tenant.id,
        title: "Faresymbol mangler på kjemikaliebeholder",
        type: "AVVIK",
        severity: 4,
        description: "Beholder med rengjøringsmiddel manglet faresymbol og produktnavn.",
        location: "Rengjøringsrom",
        reportedBy: "vern@test.no",
        responsibleId: hmsUser.id,
        investigatedBy: hmsUser.id,
        immediateAction: "Beholder fjernet fra bruk inntil korrekt merking var på plass.",
        rootCause: "Kjemikalie ble fylt over i ny beholder uten merking.",
        status: "CLOSED",
        closedBy: hmsUser.id,
        closedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        occurredAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        investigatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        lessonsLearned: "Alle beholdere er nå merket. Opplæring i korrekt merking. Ukentlig inspeksjon.",
        effectivenessReview: "Ingen nye avvik funnet ved oppfølging.",
      },
    }),
  ]);

  console.log(`   ✅ ${incidents.length} hendelser opprettet`);

  // =====================================================================
  // 7. OPPLÆRING
  // =====================================================================
  console.log("🎓 Oppretter opplæring...");

  // Opplæring må opprettes individuelt per bruker med userId og courseKey (required field)
  const training1 = await prisma.training.create({
    data: {
      tenantId: tenant.id,
      userId: adminUser.id,
      courseKey: "brannvern-2025",
      title: "Brannvernopplæring 2025",
      provider: "Brannvesenet",
      description: "Årlig brannvernopplæring inkludert praktisk øvelse med brannslukker.",
      completedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      validUntil: new Date(Date.now() + 320 * 24 * 60 * 60 * 1000),
      isRequired: true,
    },
  });

  const training2 = await prisma.training.create({
    data: {
      tenantId: tenant.id,
      userId: hmsUser.id,
      courseKey: "brannvern-2025",
      title: "Brannvernopplæring 2025",
      provider: "Brannvesenet",
      description: "Årlig brannvernopplæring inkludert praktisk øvelse med brannslukker.",
      completedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      validUntil: new Date(Date.now() + 320 * 24 * 60 * 60 * 1000),
      isRequired: true,
    },
  });

  const training3 = await prisma.training.create({
    data: {
      tenantId: tenant.id,
      userId: leaderUser.id,
      courseKey: "first-aid",
      title: "Førstehjelpskurs",
      provider: "Norsk Førstehjelpsråd",
      description: "Grunnleggende førstehjelp og HLR.",
      isRequired: true,
    },
  });

  const training4 = await prisma.training.create({
    data: {
      tenantId: tenant.id,
      userId: leaderUser.id,
      courseKey: "vernerunde-training",
      title: "Vernerunde-opplæring for tillitsvalgte",
      provider: "Internt",
      description: "Opplæring i gjennomføring av vernerunder og registrering av funn.",
      completedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      isRequired: false,
    },
  });

  console.log(`   ✅ 4 opplæringer opprettet`);


  // =====================================================================
  // 8. HMS-MÅL
  // =====================================================================
  console.log("🎯 Oppretter HMS-mål...");

  const additionalGoals = await Promise.all([
    prisma.goal.create({
      data: {
        tenantId: tenant.id,
        title: "100% gjennomføring av vernerunder",
        description: "Alle planlagte kvartalsvise vernerunder skal gjennomføres i tide.",
        category: "HMS",
        targetValue: 100,
        currentValue: 75,
        unit: "%",
        year: new Date().getFullYear(),
        ownerId: hmsUser.id,
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: "ACTIVE",
      },
    }),
    prisma.goal.create({
      data: {
        tenantId: tenant.id,
        title: "Redusere sykefravær til under 4%",
        description: "Senke sykefraværsprosenten gjennom forebyggende tiltak.",
        category: "HMS",
        targetValue: 4,
        currentValue: 5.2,
        unit: "%",
        year: new Date().getFullYear(),
        ownerId: leaderUser.id,
        deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        status: "ACTIVE",
      },
    }),
  ]);

  console.log(`   ✅ ${additionalGoals.length} ekstra mål opprettet`);

  // =====================================================================
  // 9. REVISJONER/AUDITS
  // =====================================================================
  console.log("📋 Oppretter revisjoner...");

  const audit1 = await prisma.audit.create({
    data: {
      tenantId: tenant.id,
      title: "Q4 2024 Internrevisjon - HMS",
      auditType: "INTERNAL",
      scope: "Gjennomgang av HMS-systemet inkludert risikovurderinger, opplæring og dokumenthåndtering.",
      criteria: "ISO 45001:2018 krav 4-10",
      scheduledDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000),
      area: "HMS",
      department: "Alle avdelinger",
      status: "COMPLETED",
      leadAuditorId: hmsUser.id,
      teamMemberIds: JSON.stringify([adminUser.id]),
      summary: "Systemet fungerer tilfredsstillende. Enkelte forbedringspunkter identifisert.",
      conclusion: "Godkjent med mindre avvik. Korrigerende tiltak er iverksatt.",
    },
  });

  const auditFindings = await Promise.all([
    prisma.auditFinding.create({
      data: {
        auditId: audit1.id,
        findingType: "MINOR_NC",
        clause: "8.1.2",
        description: "Enkelte risikovurderinger mangler revisjonsdato.",
        evidence: "4 av 15 risikovurderinger hadde ikke satt neste revisjonsfriste.",
        requirement: "ISO 45001:2018 krever at risikovurderinger gjennomgås regelmessig.",
        responsibleId: hmsUser.id,
        dueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        correctiveAction: "Alle risikovurderinger er nå oppdatert med revisjonsdato.",
        rootCause: "Manglende rutine for oppfølging av revisjonsfrister.",
        status: "VERIFIED",
        closedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        verifiedById: adminUser.id,
        verifiedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.auditFinding.create({
      data: {
        auditId: audit1.id,
        findingType: "OBSERVATION",
        clause: "7.2",
        description: "Opplæringsmatrisen kunne vært mer oversiktlig.",
        evidence: "Manuell excel-fil brukes for å spore opplæring.",
        requirement: "Kompetansestyring skal være systematisk.",
        responsibleId: hmsUser.id,
        correctiveAction: "Implementert digital opplæringsmodul i HMS Nova.",
        status: "RESOLVED",
        closedAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  const audit2 = await prisma.audit.create({
    data: {
      tenantId: tenant.id,
      title: "Q1 2025 Internrevisjon - Kvalitet",
      auditType: "INTERNAL",
      scope: "Produktkvalitet, kundeklager og avviksbehandling.",
      criteria: "ISO 9001:2015 krav 8-10",
      scheduledDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      area: "Kvalitet",
      status: "PLANNED",
      leadAuditorId: adminUser.id,
    },
  });

  console.log(`   ✅ 2 revisjoner og ${auditFindings.length} funn opprettet`);

  // =====================================================================
  // 10. VERNERUNDER/INSPEKSJONER
  // =====================================================================
  console.log("🔍 Oppretter vernerunder...");

  const inspection1 = await prisma.inspection.create({
    data: {
      tenantId: tenant.id,
      title: "Kvartalsvis vernerunde Q4 2024",
      type: "VERNERUNDE",
      description: "Systematisk gjennomgang av alle produksjonslokaler.",
      scheduledDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      completedDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
      location: "Produksjonshall A & B",
      conductedBy: hmsUser.id,
      participants: JSON.stringify([leaderUser.id, "vern@test.no"]),
      status: "COMPLETED",
    },
  });

  const inspectionFindings = await Promise.all([
    prisma.inspectionFinding.create({
      data: {
        inspectionId: inspection1.id,
        title: "Manglende faresymbol på elektrisk skap",
        description: "Elektrisk skap i produksjonshall A mangler faresymbol for elektrisk spenning.",
        severity: 3,
        location: "Produksjonshall A, ved maskin 5",
        status: "RESOLVED",
        responsibleId: leaderUser.id,
        dueDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
        resolvedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
        resolutionNotes: "Faresymbol påført. OK.",
      },
    }),
    prisma.inspectionFinding.create({
      data: {
        inspectionId: inspection1.id,
        title: "Brannslukker mangler inspeksjonslapp",
        description: "Brannslukker ved inngang hall B har ikke inspeksjonslapp fra 2024.",
        severity: 2,
        location: "Produksjonshall B, hovedinngang",
        status: "IN_PROGRESS",
        responsibleId: hmsUser.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.inspectionFinding.create({
      data: {
        inspectionId: inspection1.id,
        title: "Utdatert evakueringsplan",
        description: "Evakueringsplan viser gammelt oppsett fra før ombyggingen.",
        severity: 4,
        location: "Pauserom",
        status: "OPEN",
        responsibleId: adminUser.id,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  const inspection2 = await prisma.inspection.create({
    data: {
      tenantId: tenant.id,
      title: "Brannøvelse vår 2025",
      type: "BRANNØVELSE",
      description: "Årlig brannøvelse med evakuering og møteplassrutiner.",
      scheduledDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      location: "Hele bedriften",
      conductedBy: hmsUser.id,
      status: "PLANNED",
    },
  });

  console.log(`   ✅ 2 inspeksjoner og ${inspectionFindings.length} funn opprettet`);

  // =====================================================================
  // 11. STOFFKARTOTEK (Kjemikalier)
  // =====================================================================
  console.log("⚗️  Oppretter kjemikalier...");

  const chemicals = await Promise.all([
    prisma.chemical.create({
      data: {
        tenantId: tenant.id,
        productName: "Ajax Professional Allrens",
        supplier: "Colgate-Palmolive AS",
        casNumber: "68155-20-4",
        hazardClass: "Irriterende",
        hazardStatements: "H315: Irriterer huden\nH319: Gir alvorlig øyeirritasjon",
        warningPictograms: JSON.stringify(["helserisiko.webp"]),
        requiredPPE: JSON.stringify(["ISO_7010_M009.svg.png", "ISO_7010_M004.svg.png"]),
        sdsVersion: "3.2",
        sdsDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        nextReviewDate: new Date(Date.now() + 185 * 24 * 60 * 60 * 1000),
        location: "Rengjøringsrom",
        quantity: 5,
        unit: "liter",
        status: "ACTIVE",
        lastVerifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lastVerifiedBy: hmsUser.id,
      },
    }),
    prisma.chemical.create({
      data: {
        tenantId: tenant.id,
        productName: "Klorin Tablet 200g",
        supplier: "Jangaard Export AS",
        casNumber: "7681-52-9",
        hazardClass: "Oksiderende, Etsende",
        hazardStatements: "H272: Kan forårsake eller forsterke brann\nH314: Gir alvorlige etseskader\nH410: Meget giftig for liv i vann",
        warningPictograms: JSON.stringify(["oksiderende.webp", "etsende.webp", "miljofare.webp"]),
        requiredPPE: JSON.stringify(["ISO_7010_M009.svg.png", "ISO_7010_M004.svg.png", "ISO_7010_M017.svg.png"]),
        sdsVersion: "2.0",
        sdsDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        nextReviewDate: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000),
        location: "Kjemikalieskap - Lager",
        quantity: 2,
        unit: "kg",
        status: "ACTIVE",
        notes: "Oppbevares atskilt fra brennbare materialer.",
        lastVerifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lastVerifiedBy: hmsUser.id,
      },
    }),
    prisma.chemical.create({
      data: {
        tenantId: tenant.id,
        productName: "WD-40 Multispray",
        supplier: "WD-40 Company",
        casNumber: "8052-41-3",
        hazardClass: "Brannfarlig aerosol",
        hazardStatements: "H222: Ekstremt brannfarlig aerosol\nH229: Beholder under trykk",
        warningPictograms: JSON.stringify(["brannfarlig.webp", "gass_under_trykk.webp"]),
        requiredPPE: JSON.stringify(["ISO_7010_M009.svg.png"]),
        sdsVersion: "5.1",
        sdsDate: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
        nextReviewDate: new Date(Date.now() + 165 * 24 * 60 * 60 * 1000),
        location: "Verksted",
        quantity: 12,
        unit: "stk (400ml)",
        status: "ACTIVE",
        lastVerifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lastVerifiedBy: hmsUser.id,
      },
    }),
  ]);

  console.log(`   ✅ ${chemicals.length} kjemikalier opprettet`);

  // =====================================================================
  // 12. TILTAK (Measures)
  // =====================================================================
  console.log("✅ Oppretter flere tiltak...");

  const additionalMeasures = await Promise.all([
    prisma.measure.create({
      data: {
        tenantId: tenant.id,
        title: "Oppdatere evakueringsplan",
        description: "Lage ny evakueringsplan som reflekterer nåværende bygningsoppsett.",
        status: "IN_PROGRESS",
        responsibleId: adminUser.id,
        dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.measure.create({
      data: {
        tenantId: tenant.id,
        title: "Bestille nye vernebriller",
        description: "Kjøpe inn 20 nye vernebriller til produksjon.",
        status: "PENDING",
        responsibleId: leaderUser.id,
        dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.measure.create({
      data: {
        tenantId: tenant.id,
        title: "Gjennomføre arbeidsmiljøundersøkelse",
        description: "Årlig AMU skal gjennomføres i Q1 2025.",
        status: "PENDING",
        responsibleId: hmsUser.id,
        dueAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  console.log(`   ✅ ${additionalMeasures.length} tiltak opprettet`);

  // =====================================================================
  // OPPSUMMERING
  // =====================================================================
  console.log("\n" + "=".repeat(80));
  console.log("🎉 DEMO SEED FULLFØRT!\n");
  console.log("📊 Opprettet:");
  console.log(`   📄 ${documents.length} dokumenter`);
  console.log(`   ⚠️  4 risikovurderinger med tiltak`);
  console.log(`   🚨 ${incidents.length} hendelser/avvik`);
  console.log(`   🎓 4 opplæringer`);
  console.log(`   🎯 ${additionalGoals.length} ekstra HMS-mål`);
  console.log(`   📋 2 revisjoner med ${auditFindings.length} funn`);
  console.log(`   🔍 2 inspeksjoner med ${inspectionFindings.length} funn`);
  console.log(`   ⚗️  ${chemicals.length} kjemikalier`);
  console.log(`   ✅ ${additionalMeasures.length} tiltak`);
  console.log("\n" + "=".repeat(80));
  console.log("\n✨ Test Bedrift AS er nå klar for demo! ✨\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

