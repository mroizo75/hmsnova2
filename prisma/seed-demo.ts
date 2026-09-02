/**
 * DEMO SEED - Full data for Test Bedrift AS
 * Dette er for å vise systemet til kunder
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addMonths } from "date-fns";

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
  await prisma.whistleblowMessage.deleteMany({ where: { whistleblowing: { tenantId: tenant.id } } });
  await prisma.whistleblowAuditLog.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.whistleblowBreakGlassRequest.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.whistleblowAccessGrant.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.whistleblowing.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.meetingDecision.deleteMany({ where: { meeting: { tenantId: tenant.id } } });
  await prisma.meetingParticipant.deleteMany({ where: { meeting: { tenantId: tenant.id } } });
  await prisma.meeting.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.managementReview.deleteMany({ where: { tenantId: tenant.id } });

  console.log("✅ Eksisterende data slettet\n");

  // 3. Hent brukere
  const adminUser = await prisma.user.findUnique({ where: { email: "admin@test.no" } });
  const hmsUser = await prisma.user.findUnique({ where: { email: "hms@test.no" } });
  const leaderUser = await prisma.user.findUnique({ where: { email: "leder@test.no" } });
  const vernUser = await prisma.user.findUnique({ where: { email: "vern@test.no" } });
  const employeeUser = await prisma.user.findUnique({ where: { email: "ansatt@test.no" } });
  const auditorUser = await prisma.user.findUnique({ where: { email: "revisor@test.no" } });

  if (!adminUser || !hmsUser || !leaderUser || !vernUser || !employeeUser || !auditorUser) {
    console.error("❌ Brukere ikke funnet!");
    process.exit(1);
  }

  const ensureGlobalTemplate = async (
    name: string,
    description: string,
    pdcaGuidance: Record<string, string>,
    defaultReviewIntervalMonths = 12,
    category?: string
  ) => {
    const existing = await prisma.documentTemplate.findFirst({
      where: { name, tenantId: null },
    });

    if (!existing) {
      await prisma.documentTemplate.create({
        data: {
          name,
          description,
          pdcaGuidance,
          defaultReviewIntervalMonths,
          category,
          isGlobal: true,
        },
      });
    }
  };

  await ensureGlobalTemplate(
    "Standard prosedyre",
    "Mal for kvalitetsprosedyrer med tydelig PDCA-struktur.",
    {
      plan: "Definer mål, omfang og ansvarlige roller.",
      do: "Beskriv gjennomføring og nødvendig dokumentasjon.",
      check: "Forklar kontroller, målinger og rapportering.",
      act: "Beskriv hvordan tiltak og forbedringer håndteres.",
    }
  );

  await ensureGlobalTemplate(
    "Arbeidsinstruks",
    "Instruks for sikre arbeidsoperasjoner i henhold til ISO 45001.",
    {
      plan: "Arbeidsområde, risikovurdering og forberedelser.",
      do: "Steg-for-steg-instruks med fokus på sikkerhet.",
      check: "Hvordan observasjoner og målinger utføres.",
      act: "Prosess for oppdatering og forbedring av instruksen.",
    },
    6
  );

  await ensureGlobalTemplate(
    "BCM-plan",
    "Mal for kontinuitetsplaner (ISO 22301) med tydelige roller.",
    {
      plan: "Identifiser kritiske tjenester og gjenopprettingsmål.",
      do: "Beskriv aktiveringskriterier og ansvarlige roller.",
      check: "Plan for øvelser, test av backup og læringspunkter.",
      act: "Prosess for forbedring og oppdatering av planverket.",
    },
    12,
    "BCM"
  );

  // =====================================================================
  // 4. DOKUMENTER
  // =====================================================================
  console.log("📄 Oppretter dokumenter...");

  const bcmTemplate = await prisma.documentTemplate.create({
    data: {
      tenantId: tenant.id,
      name: "Kontinuitetsplan",
      category: "BCM",
      description: "Tenant-spesifikk kontinuitetsmal for kritiske tjenester.",
      pdcaGuidance: {
        plan: "Kartlegg kritiske prosesser og avhengigheter.",
        do: "Definer responsteam, kommunikasjonsplan og tiltak.",
        check: "Planlagte øvelser og resultatoppfølging.",
        act: "Oppdater plan etter hver hendelse/øvelse.",
      },
      isGlobal: false,
    },
  });

  const documents = await Promise.all([
    prisma.document.create({
      data: {
        tenantId: tenant.id,
        title: "HMS-Håndbok 2025",
        slug: "hms-handbok-2025",
        kind: "OTHER",
        version: "1.0",
        fileKey: "demo/hms-handbok.pdf",
        mime: "application/pdf",
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
        mime: "application/pdf",
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
        mime: "application/pdf",
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
        mime: "application/pdf",
        status: "DRAFT",
      },
    }),
    prisma.document.create({
      data: {
        tenantId: tenant.id,
        title: "Kontinuitetsplan 2025",
        slug: "kontinuitetsplan-2025-demo",
        kind: "PLAN",
        version: "1.0",
        fileKey: "demo/bcm-plan.pdf",
        mime: "application/pdf",
        status: "APPROVED",
        approvedBy: adminUser.id,
        approvedAt: new Date(),
        ownerId: leaderUser.id,
        templateId: bcmTemplate.id,
        reviewIntervalMonths: 12,
        nextReviewDate: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000),
        planSummary: "Plan for å sikre drift av lager og logistikk ved hendelser.",
        doSummary: "Crisis team møtes innen 30 min og aktiverer alternative leverandører.",
        checkSummary: "Halvårlige skrivebordsøvelser og systemtester.",
        actSummary: "Forbedringstiltak registreres som dokumenterte avvik.",
      },
    }),
  ]);

  console.log(`   ✅ ${documents.length} dokumenter opprettet`);

  // Psykososial puls (ISO 45003)
  const wellbeingTemplate = await prisma.formTemplate.create({
    data: {
      tenantId: tenant.id,
      title: "Psykososial puls",
      description: "Kvartalsvis pulsundersøkelse for arbeidsmiljø (ISO 45003).",
      category: "WELLBEING",
      requiresSignature: false,
      requiresApproval: false,
      createdBy: adminUser.id,
      fields: {
        create: [
          {
            label: "Hvordan har du det i dag? (1-5)",
            fieldType: "RADIO",
            order: 1,
            isRequired: true,
            options: JSON.stringify(["1", "2", "3", "4", "5"]),
          },
          {
            label: "Hvordan oppleves arbeidsbelastningen? (1-5)",
            fieldType: "RADIO",
            order: 2,
            isRequired: true,
            options: JSON.stringify(["1", "2", "3", "4", "5"]),
          },
          {
            label: "Føler du deg ivaretatt av leder/kollegaer? (1-5)",
            fieldType: "RADIO",
            order: 3,
            isRequired: true,
            options: JSON.stringify(["1", "2", "3", "4", "5"]),
          },
          {
            label: "Hva ønsker du å dele?",
            fieldType: "TEXTAREA",
            order: 4,
          },
        ],
      },
    },
    include: {
      fields: true,
    },
  });

  const bcmExerciseTemplate = await prisma.formTemplate.create({
    data: {
      tenantId: tenant.id,
      title: "Beredskapsøvelse - scenario",
      description: "Sjekkliste for å dokumentere gjennomføring av forretningskontinuitetsøvelser.",
      category: "BCM",
      requiresSignature: true,
      requiresApproval: true,
      createdBy: adminUser.id,
      fields: {
        create: [
          {
            label: "Scenario / hendelse",
            fieldType: "TEXT",
            order: 1,
            isRequired: true,
          },
          {
            label: "Berørte prosesser",
            fieldType: "TEXTAREA",
            order: 2,
            isRequired: true,
          },
          {
            label: "Team som deltok",
            fieldType: "TEXTAREA",
            order: 3,
          },
          {
            label: "Hva fungerte godt?",
            fieldType: "TEXTAREA",
            order: 4,
          },
          {
            label: "Hva må forbedres?",
            fieldType: "TEXTAREA",
            order: 5,
          },
        ],
      },
    },
  });

  const wellbeingFieldMap = Object.fromEntries(
    wellbeingTemplate.fields.map((field) => [field.label, field.id])
  );

  const wellbeingResponses = [
    {
      userId: employeeUser.id,
      mood: "4",
      workload: "3",
      support: "4",
      comment: "God balanse og støtte fra teamet.",
      daysAgo: 5,
    },
    {
      userId: hmsUser.id,
      mood: "3",
      workload: "4",
      support: "3",
      comment: "Høyt arbeidspress før revisjon.",
      daysAgo: 12,
    },
    {
      userId: vernUser.id,
      mood: "5",
      workload: "2",
      support: "5",
      comment: "Motiverende å se forbedringer.",
      daysAgo: 20,
    },
  ];

  for (const response of wellbeingResponses) {
    await prisma.formSubmission.create({
      data: {
        tenantId: tenant.id,
        formTemplateId: wellbeingTemplate.id,
        submittedById: response.userId,
        status: "SUBMITTED",
        signedAt: new Date(Date.now() - response.daysAgo * 24 * 60 * 60 * 1000),
        fieldValues: {
          create: [
            { fieldId: wellbeingFieldMap["Hvordan har du det i dag? (1-5)"], value: response.mood },
            {
              fieldId: wellbeingFieldMap["Hvordan oppleves arbeidsbelastningen? (1-5)"],
              value: response.workload,
            },
            {
              fieldId: wellbeingFieldMap["Føler du deg ivaretatt av leder/kollegaer? (1-5)"],
              value: response.support,
            },
            {
              fieldId: wellbeingFieldMap["Hva ønsker du å dele?"],
              value: response.comment,
            },
          ],
        },
      },
    });
  }

  // =====================================================================
  // 5. RISIKOVURDERINGER
  // =====================================================================
  console.log("⚠️  Oppretter risikovurderinger...");

  const warehouseInspectionTemplate = await prisma.inspectionTemplate.create({
    data: {
      tenantId: tenant.id,
      name: "Kvartalsvis lagervernerunde",
      description: "Kontroller fallrisiko, orden og verneutstyr i lageret",
      category: "HMS",
      riskCategory: "SAFETY",
      checklist: {
        items: [
          { title: "Sikker tilgang til høyder", type: "checkbox" },
          { title: "Rekkverk og fallsele på plass", type: "checkbox" },
          { title: "Ingen hindringer i gangbaner", type: "checkbox" },
        ],
      },
      isGlobal: false,
    },
  });

  const chemicalInspectionTemplate = await prisma.inspectionTemplate.create({
    data: {
      tenantId: tenant.id,
      name: "Kjemikalekontroll",
      description: "Månedlig kontroll av kjemikalierom",
      category: "KJEMIKALIER",
      riskCategory: "ENVIRONMENTAL",
      checklist: {
        items: [
          { title: "Riktig merking", type: "checkbox" },
          { title: "Personlig verneutstyr tilgjengelig", type: "checkbox" },
          { title: "Sikkerhetsdatablader oppdaterte", type: "checkbox" },
        ],
      },
      isGlobal: false,
    },
  });

  const risk1 = await prisma.risk.create({
    data: {
      tenantId: tenant.id,
      title: "Fall fra høyde ved lagerarbeid",
      context: "Ansatte som jobber i høyden ved lagring kan falle og skade seg. Lokasjon: Lager - Høyreol seksjon A.",
      description: "Arbeid i høyden pågår daglig med truck og lift.",
      existingControls: "Fallsikringskurs, årlig kontroll av lift.",
      riskStatement: "Fall kan gi alvorlig skade eller dødsfall.",
      location: "Lager",
      area: "Logistikk",
      linkedProcess: "Lagerdrift",
      category: "SAFETY",
      likelihood: 3,
      consequence: 4,
      score: 12,
      ownerId: leaderUser.id,
      status: "MITIGATING",
      controlFrequency: "QUARTERLY",
      nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      residualLikelihood: 2,
      residualConsequence: 3,
      residualScore: 6,
      inspectionTemplateId: warehouseInspectionTemplate.id,
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
      category: "MITIGATION",
      followUpFrequency: "MONTHLY",
      costEstimate: 8000,
      benefitEstimate: 20,
      effectiveness: "EFFECTIVE",
      effectivenessNote: "Opplæring reduserte nestenulykker",
    },
  });

  const risk2 = await prisma.risk.create({
    data: {
      tenantId: tenant.id,
      title: "Kjemisk eksponering - Rengjøringsmidler",
      context: "Eksponering for sterke rengjøringsmidler kan forårsake hudirritasjon og luftveisplager. Lokasjon: Rengjøringsrom.",
      description: "Sterke alkalier brukes daglig. Manglende ventilation.",
      existingControls: "Hansker, briller, tvungen ventilasjon.",
      riskStatement: "Hud- og lungeskade ved søl.",
      location: "Rengjøringsrom",
      area: "Facility",
      linkedProcess: "Renhold",
      category: "ENVIRONMENTAL",
      likelihood: 2,
      consequence: 2,
      score: 4,
      ownerId: hmsUser.id,
      status: "MITIGATING",
      controlFrequency: "MONTHLY",
      nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      residualLikelihood: 1,
      residualConsequence: 2,
      residualScore: 2,
      inspectionTemplateId: chemicalInspectionTemplate.id,
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
      category: "PREVENTIVE",
      followUpFrequency: "MONTHLY",
      costEstimate: 4000,
      benefitEstimate: 15,
      effectiveness: "PARTIALLY_EFFECTIVE",
      effectivenessNote: "Trenger ny ventilasjon for full effekt",
    },
  });

  const risk3 = await prisma.risk.create({
    data: {
      tenantId: tenant.id,
      title: "Ergonomiske belastninger - Dataarbeid",
      context: "Langvarig dataarbeid kan føre til muskel- og skjelettplager. Lokasjon: Kontorer.",
      description: "Arbeidstakere sitter mer enn 7 timer daglig.",
      existingControls: "Høydejusterbare pulter, pauserutine.",
      riskStatement: "Muskelplager og sykefravær.",
      location: "Kontorfløy",
      area: "Administrasjon",
      linkedProcess: "Kontorarbeid",
      category: "HEALTH",
      likelihood: 3,
      consequence: 2,
      score: 6,
      ownerId: leaderUser.id,
      status: "MITIGATING",
      controlFrequency: "ANNUAL",
      nextReviewDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      residualLikelihood: 2,
      residualConsequence: 2,
      residualScore: 4,
    },
  });

  const risk4 = await prisma.risk.create({
    data: {
      tenantId: tenant.id,
      title: "Brann i elektrisk utstyr",
      context: "Eldre elektrisk utstyr kan overopphetes og forårsake brann. Lokasjon: Produksjonshall B.",
      description: "Gamle tavler uten termisk overvåkning",
      existingControls: "Årlig elkontroll, termografi.",
      riskStatement: "Brann og driftsstans.",
      location: "Produksjonshall B",
      area: "Produksjon",
      linkedProcess: "Produksjon",
      category: "SAFETY",
      likelihood: 1,
      consequence: 5,
      score: 5,
      ownerId: hmsUser.id,
      status: "OPEN",
      controlFrequency: "ANNUAL",
      nextReviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      residualLikelihood: 1,
      residualConsequence: 3,
      residualScore: 3,
    },
  });

  console.log(`   ✅ 4 risikovurderinger opprettet`);

  const demoSecurityAsset = await prisma.securityAsset.create({
    data: {
      tenantId: tenant.id,
      name: "Produksjonsnettverk",
      description: "Switching/Firewall som beskytter produksjonsmiljø",
      type: "INFRASTRUCTURE",
      ownerId: hmsUser.id,
      confidentiality: "HIGH",
      integrity: "HIGH",
      availability: "HIGH",
      businessCriticality: 5,
    },
  });

  const demoSecurityControl = await prisma.securityControl.create({
    data: {
      tenantId: tenant.id,
      code: "A.8.24",
      title: "Logging og overvåking",
      annexReference: "Annex A 8.24",
      requirement: "Sikkerhetslogg skal etableres og evalueres jevnlig",
      category: "TECHNICAL",
      status: "LIVE",
      maturity: "DEFINED",
      ownerId: hmsUser.id,
      linkedAssetId: demoSecurityAsset.id,
      linkedRiskId: risk4.id,
      implementationNote: "SIEM korrelerer hendelser fra brannmur, AD og produksjonssystem.",
      monitoring: "Driftsavdelingen vurderer alarmer daglig",
      lastTestDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      nextReviewDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.securityControlDocument.create({
    data: {
      tenantId: tenant.id,
      controlId: demoSecurityControl.id,
      documentId: documents[2].id,
      note: "Referanse til brannvern-/driftsplan",
    },
  });

  await prisma.securityEvidence.create({
    data: {
      tenantId: tenant.id,
      controlId: demoSecurityControl.id,
      title: "SIEM-rapport mars",
      description: "Rapport viser gjennomførte hendelsesresponser og ingen åpne avvik.",
      collectedById: hmsUser.id,
      reviewResult: "OK",
    },
  });

  const endpointAsset = await prisma.securityAsset.create({
    data: {
      tenantId: tenant.id,
      name: "Bærbare PC-er",
      description: "Flåte på 140 PC-er med sensitiv kundeinfo.",
      type: "PEOPLE",
      ownerId: leaderUser.id,
      confidentiality: "HIGH",
      integrity: "MEDIUM",
      availability: "MEDIUM",
      businessCriticality: 4,
    },
  });

  const multiFactorControl = await prisma.securityControl.create({
    data: {
      tenantId: tenant.id,
      code: "A.6.7",
      title: "MFA for alle privilegerte brukere",
      annexReference: "Annex A 6.7",
      requirement: "Administratortilgang skal sikres med flerfaktorautentisering.",
      category: "ORGANIZATIONAL",
      status: "IMPLEMENTED",
      maturity: "MANAGED",
      ownerId: hmsUser.id,
      linkedAssetId: endpointAsset.id,
      implementationNote: "All administratortilgang skjer via Azure AD Conditional Access med PIM.",
      monitoring: "Azure rapporter analyseres månedlig.",
      lastTestDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      nextReviewDate: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.securityEvidence.create({
    data: {
      tenantId: tenant.id,
      controlId: multiFactorControl.id,
      title: "PIM-logg Q2",
      description: "Gjennomgang viser 0 uautoriserte aktiveringer og alle roller har MFA.",
      collectedById: hmsUser.id,
      reviewResult: "Ingen funn",
    },
  });

  const demoAccessReview = await prisma.accessReview.create({
    data: {
      tenantId: tenant.id,
      title: "Halvårlig SAP-tilganger",
      systemName: "SAP",
      scope: "Drift og finansroller",
      status: "PLANNED",
      dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      ownerId: leaderUser.id,
    },
  });

  await prisma.accessReviewEntry.createMany({
    data: [
      {
        tenantId: tenant.id,
        reviewId: demoAccessReview.id,
        userName: leaderUser.name ?? "Leder",
        userEmail: leaderUser.email,
        role: "Finansgodkjenner",
        decision: "REVIEW",
      },
      {
        tenantId: tenant.id,
        reviewId: demoAccessReview.id,
        userName: "Tidligere ansatt",
        userEmail: "tidligere@test.no",
        role: "SAP PowerUser",
        decision: "REVOKED",
        comment: "Stoppet i forrige runde",
        decidedById: leaderUser.id,
        decidedAt: new Date(),
      },
    ],
  });

  const adReview = await prisma.accessReview.create({
    data: {
      tenantId: tenant.id,
      title: "Kvartalsvis AD-tilganger",
      systemName: "Active Directory",
      scope: "Domain Admins + Helpdesk",
      status: "IN_PROGRESS",
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      ownerId: hmsUser.id,
    },
  });

  await prisma.accessReviewEntry.createMany({
    data: [
      {
        tenantId: tenant.id,
        reviewId: adReview.id,
        userName: "Ekstern konsulent",
        userEmail: "consulting@partner.no",
        role: "Domain Admin",
        decision: "REVOKED",
        comment: "Skal avsluttes etter prosjekt",
        decidedById: hmsUser.id,
        decidedAt: new Date(),
      },
      {
        tenantId: tenant.id,
        reviewId: adReview.id,
        userName: "Produksjonsleder",
        userEmail: "prodleder@test.no",
        role: "Helpdesk Admin",
        decision: "APPROVED",
        comment: "Behov bekreftet av leder",
        decidedById: leaderUser.id,
        decidedAt: new Date(),
      },
    ],
  });

  await prisma.riskControl.createMany({
    data: [
      {
        tenantId: tenant.id,
        riskId: risk1.id,
        title: "Ukentlig inspeksjon av reoler/lift",
        description: "Lagerleder verifiserer at reoler, lift og gangveier er sikre før skift.",
        controlType: "PREVENTIVE",
        ownerId: leaderUser.id,
        status: "ACTIVE",
        effectiveness: "EFFECTIVE",
        frequency: "WEEKLY",
        evidenceDocumentId: documents[1]?.id,
      },
      {
        tenantId: tenant.id,
        riskId: risk2.id,
        title: "Månedlig kjemikalierunde",
        controlType: "PREVENTIVE",
        ownerId: hmsUser.id,
        status: "ACTIVE",
        effectiveness: "PARTIAL",
        frequency: "MONTHLY",
        monitoringMethod: "Sjekkliste fra kjemikalekontroll",
      },
      {
        tenantId: tenant.id,
        riskId: risk4.id,
        title: "Termografimåling av tavler",
        controlType: "DETECTIVE",
        ownerId: hmsUser.id,
        status: "NEEDS_IMPROVEMENT",
        effectiveness: "NOT_TESTED",
        frequency: "ANNUAL",
      },
    ],
  });

  await prisma.riskDocumentLink.createMany({
    data: [
      {
        tenantId: tenant.id,
        riskId: risk1.id,
        documentId: documents[0].id,
        relation: "PROCEDURE",
        note: "Se kapittel 4 i HMS-håndboken",
      },
      {
        tenantId: tenant.id,
        riskId: risk4.id,
        documentId: documents[2].id,
        relation: "SUPPORTING",
        note: "Brannvernplan dekker tiltak ved varmegang",
      },
    ],
  });

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
        stage: "VERIFIED",
        closedBy: hmsUser.id,
        closedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        occurredAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        investigatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        lessonsLearned: "Påminnelse om bruk av verneutstyr. Oppdatert arbeidsinstruksjon. Ekstra opplæring for berørte.",
        injuryType: "Kuttskade finger",
        medicalAttentionRequired: true,
        lostTimeMinutes: 90,
        riskReferenceId: risk1.id,
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
        stage: "ACTIONS_DEFINED",
        occurredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        investigatedBy: hmsUser.id,
        investigatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        lessonsLearned: "Innført rutine for umiddelbar rydding. Plassert flere avfallsbeholdere.",
        medicalAttentionRequired: false,
        riskReferenceId: risk2.id,
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
        stage: "VERIFIED",
        closedBy: hmsUser.id,
        closedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        occurredAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        investigatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        lessonsLearned: "Alle beholdere er nå merket. Opplæring i korrekt merking. Ukentlig inspeksjon.",
        effectivenessReview: "Ingen nye avvik funnet ved oppfølging.",
        riskReferenceId: risk2.id,
      },
    }),
    prisma.incident.create({
      data: {
        tenantId: tenant.id,
        title: "Kundeklage: forsinket servicebesøk",
        type: "CUSTOMER",
        severity: 3,
        description: "Kunde rapporterer om 2 ukers forsinkelse på servicebesøk hos kritisk kunde.",
        reportedBy: leaderUser.id,
        responsibleId: hmsUser.id,
        occurredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: "OPEN",
        stage: "REPORTED",
        customerName: "Fjord Energi AS",
        customerEmail: "innkjop@fjordenergi.no",
        customerPhone: "+47 988 65 000",
        customerTicketId: "CRM-555",
        responseDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        customerSatisfaction: 2,
      },
    }),
  ]);

  console.log(`   ✅ ${incidents.length} hendelser opprettet`);

  await prisma.customerFeedback.createMany({
    data: [
      {
        tenantId: tenant.id,
        recordedById: hmsUser.id,
        customerName: "Eva Normann",
        customerCompany: "Nordic Retail AS",
        contactEmail: "eva.normann@nordicretail.no",
        source: "MEETING",
        sentiment: "POSITIVE",
        rating: 5,
        summary: "Roser responstid og oppfølging fra HMS-teamet",
        details:
          "Nordic Retail fremhever at HMS Nova ga rask respons ved kritisk hendelse og sikret at korrigerende tiltak ble fulgt opp.",
        highlights: "Ønskes delt i kundecase og ledelsens gjennomgang.",
        followUpStatus: "SHARED",
        followUpOwnerId: leaderUser.id,
        feedbackDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        tenantId: tenant.id,
        recordedById: leaderUser.id,
        customerName: "Kari Forberg",
        customerCompany: "Bygg & Ventilasjon",
        contactPhone: "+47 988 88 888",
        source: "SURVEY",
        sentiment: "POSITIVE",
        rating: 4,
        summary: "Fornøyd med vernerundeprosessen",
        details:
          "Kunden trekker frem at fotodokumentasjon og tiltaksliste ble delt samme dag. Ønsker tettere oppfølging før neste runde i juni.",
        highlights: "Forslag om å publisere resultat i intranett og sikkerhetsmøte.",
        followUpStatus: "FOLLOW_UP",
        followUpOwnerId: hmsUser.id,
        feedbackDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log("✅ Kundetilbakemeldinger registrert");

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
  // 9b. MILJØASPEKTER
  // =====================================================================
  console.log("🌿 Oppretter miljøaspekter...");
  const environmentGoal = additionalGoals[0];
  const wasteGoal = additionalGoals[1];

  const demoEnergyAspect = await prisma.environmentalAspect.create({
    data: {
      tenantId: tenant.id,
      title: "Energibruk kontorfløy",
      description: "Strømforbruk fra ventilasjon og datarom.",
      process: "Kontor",
      location: "Kontorbygg",
      category: "ENERGY",
      impactType: "NEGATIVE",
      severity: 3,
      likelihood: 4,
      significanceScore: 12,
      legalRequirement: "Energimerkeordningen / TEK17 kap. 14",
      controlMeasures: "Bevegelsessensorer, nattmodus på ventilasjon.",
      monitoringMethod: "Automatisk energimåler",
      monitoringFrequency: "MONTHLY",
      ownerId: hmsUser.id,
      goalId: environmentGoal?.id,
      status: "ACTIVE",
      nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      lastMeasurementDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    },
  });

  const demoWasteAspect = await prisma.environmentalAspect.create({
    data: {
      tenantId: tenant.id,
      title: "Sortering av farlig avfall",
      description: "Løsemiddel og spraybokser fra produksjon.",
      process: "Produksjon",
      location: "Verksted",
      category: "WASTE",
      impactType: "NEGATIVE",
      severity: 5,
      likelihood: 3,
      significanceScore: 15,
      legalRequirement: "Avfallsforskriften kap. 11",
      controlMeasures: "Merkede beholdere, låst skap, avtale med godkjent mottak.",
      monitoringMethod: "Loggføring og månedlig kontroll",
      monitoringFrequency: "MONTHLY",
      ownerId: leaderUser.id,
      goalId: wasteGoal?.id,
      status: "MONITORED",
      nextReviewDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
    },
  });

  const demoEmissionAspect = await prisma.environmentalAspect.create({
    data: {
      tenantId: tenant.id,
      title: "Utslipp fra reserveaggregat",
      description: "Overvåker NOx-utslipp fra dieselaggregatet ved testkjøring og strømutfall.",
      process: "Drift / IT",
      location: "Datasenter",
      category: "EMISSIONS",
      impactType: "NEGATIVE",
      severity: 4,
      likelihood: 2,
      significanceScore: 8,
      legalRequirement: "Forskrift om begrensning av forurensning §27-5",
      controlMeasures: "Rutine for testkjøringer, partikkelfilter, serviceavtale",
      monitoringMethod: "Emisjonsmåler + logg fra aggregat",
      monitoringFrequency: "QUARTERLY",
      ownerId: hmsUser.id,
      status: "ACTIVE",
      nextReviewDate: addMonths(new Date(), 6),
    },
  });

  await prisma.environmentalMeasurement.create({
    data: {
      tenantId: tenant.id,
      aspectId: demoEnergyAspect.id,
      parameter: "kWh per måned",
      unit: "kWh",
      method: "AMS-måler",
      limitValue: 25000,
      targetValue: 22000,
      measuredValue: 23500,
      measurementDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      status: "WARNING",
      notes: "Kuldeperiode ga økt forbruk",
      responsibleId: hmsUser.id,
    },
  });

  await prisma.environmentalMeasurement.create({
    data: {
      tenantId: tenant.id,
      aspectId: demoEmissionAspect.id,
      parameter: "NOx (mg/Nm3)",
      unit: "mg/Nm3",
      method: "Kontinuerlig måling med sensor",
      limitValue: 980,
      targetValue: 750,
      measuredValue: 720,
      measurementDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      status: "COMPLIANT",
      notes: "Resultat innenfor målt krav etter filterbytte",
      responsibleId: leaderUser.id,
    },
  });

  await prisma.environmentalMeasurement.create({
    data: {
      tenantId: tenant.id,
      aspectId: demoWasteAspect.id,
      parameter: "Kg farlig avfall",
      unit: "kg",
      method: "Veiing ved levering",
      limitValue: 400,
      targetValue: 300,
      measuredValue: 280,
      measurementDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      status: "COMPLIANT",
      notes: "Levering til Ragn-Sells, kvittering vedlagt",
      responsibleId: leaderUser.id,
    },
  });

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

  await prisma.riskAuditLink.create({
    data: {
      tenantId: tenant.id,
      riskId: risk1.id,
      auditId: audit1.id,
      relation: "CONTROL_TEST",
      summary: "Internrevisjon kontrollerer at risikovurderinger er oppdatert",
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

  await prisma.audit.create({
    data: {
      tenantId: tenant.id,
      title: "BCM skrivebordsøvelse 2025",
      auditType: "INTERNAL",
      scope: "Beredskap for logistikk og leveranser",
      criteria: "ISO 22301",
      scheduledDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      area: "Kontinuitet",
      department: "Logistikk",
      status: "PLANNED",
      leadAuditorId: auditorUser.id,
    },
  });

  console.log(`   ✅ 3 revisjoner og ${auditFindings.length} funn opprettet`);

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
      templateId: warehouseInspectionTemplate.id,
      riskCategory: "SAFETY",
      area: "Produksjon",
      durationMinutes: 120,
      followUpById: hmsUser.id,
      nextInspection: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
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
        linkedRiskId: risk1.id,
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
        linkedRiskId: risk4.id,
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
        linkedRiskId: risk1.id,
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
      riskCategory: "SAFETY",
      durationMinutes: 60,
      followUpById: adminUser.id,
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
        category: "IMPROVEMENT",
        followUpFrequency: "ANNUAL",
        costEstimate: 5000,
        benefitEstimate: 10,
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
        category: "PREVENTIVE",
        followUpFrequency: "MONTHLY",
        costEstimate: 7000,
        benefitEstimate: 12,
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
        category: "IMPROVEMENT",
        followUpFrequency: "ANNUAL",
        costEstimate: 3000,
        benefitEstimate: 25,
      },
    }),
  ]);

  console.log(`   ✅ ${additionalMeasures.length} tiltak opprettet`);

  // =====================================================================
  // 13. LEDELSENS GJENNOMGANG
  // =====================================================================
  console.log("📊 Oppretter Ledelsens gjennomgang...");

  const mgmtReview1 = await prisma.managementReview.create({
    data: {
      tenantId: tenant.id,
      title: "Ledelsens gjennomgang Q4 2024",
      period: "Q4 2024",
      reviewDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      nextReviewDate: new Date(Date.now() + 76 * 24 * 60 * 60 * 1000),
      conductedBy: adminUser.id,
      participants: JSON.stringify([
        { name: adminUser.name, role: "Administrerende direktør", email: adminUser.email },
        { name: hmsUser.name, role: "HMS-ansvarlig", email: hmsUser.email },
        { name: leaderUser.name, role: "Avdelingsleder", email: leaderUser.email },
      ]),
      hmsGoalsReview: "4 av 4 HMS-mål er på riktig spor. Sykefravær er redusert til 3,2%.",
      incidentStatistics: "3 hendelser registrert i Q4. Alle er lukket og fulgt opp.",
      riskReview: "Alle risikovurderinger er oppdaterte. 2 nye risikoer identifisert.",
      auditResults: "Internrevisjon gjennomført med 2 mindre avvik. Begge er lukket.",
      trainingStatus: "90% av påkrevd opplæring gjennomført. Mangler brannvern for 3 ansatte.",
      resourcesReview: "Budsjett for 2025 godkjent. Behov for ekstra HMS-koordinator.",
      externalChanges: "Nye krav til stoffkartotek fra 01.01.2025.",
      conclusions: "Systemet fungerer tilfredsstillende. God fremgang på flere områder, men noen forbedringer er nødvendige. Høy rapporteringskultur. Lav fraværsrate. Gode resultater fra brannøvelse.",
      decisions: "Godkjent budsjett for nytt verneutstyr (kr 50.000). Besluttet å gjennomføre ekstra HMS-opplæring for alle ledere. Oppfølging av åpne avvik innen 30 dager. Implementere digital løsning for stoffkartotek.",
      actionPlan: JSON.stringify([
        { title: "Bestille nytt verneutstyr", responsible: "HMS-ansvarlig", deadline: "2025-01-15" },
        { title: "Planlegge HMS-kurs for ledere", responsible: "HR", deadline: "2025-02-01" },
        { title: "Følge opp åpne avvik", responsible: "HMS-ansvarlig", deadline: "2025-01-10" },
      ]),
      notes: "Kvartalsvis gjennomgang av HMS og kvalitetssystemet. Forslag til forbedringer: digitalisering av prosesser, tverrfaglig samarbeid.",
      status: "COMPLETED",
      approvedBy: adminUser.id,
      approvedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    },
  });

  const mgmtReview2 = await prisma.managementReview.create({
    data: {
      tenantId: tenant.id,
      title: "Ledelsens gjennomgang Q1 2025 (planlagt)",
      period: "Q1 2025",
      reviewDate: new Date(Date.now() + 76 * 24 * 60 * 60 * 1000),
      nextReviewDate: new Date(Date.now() + 166 * 24 * 60 * 60 * 1000),
      conductedBy: adminUser.id,
      participants: JSON.stringify([
        { name: adminUser.name, role: "Administrerende direktør", email: adminUser.email },
        { name: hmsUser.name, role: "HMS-ansvarlig", email: hmsUser.email },
        { name: leaderUser.name, role: "Avdelingsleder", email: leaderUser.email },
      ]),
      notes: "Neste kvartalsvise gjennomgang. Agenda: Oppfølging av tiltak fra Q4, analyse av sykefravær, resultater fra arbeidsmiljøundersøkelse, planlegging av revisjoner 2025.",
      status: "PLANNED",
    },
  });

  console.log(`   ✅ 2 ledelsens gjennomganger opprettet`);

  // =====================================================================
  // 14. AMU/VO MØTER
  // =====================================================================
  console.log("🤝 Oppretter AMU/VO møter...");

  const meeting1 = await prisma.meeting.create({
    data: {
      tenantId: tenant.id,
      title: "AMU-møte november 2024",
      type: "AMU",
      scheduledDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      location: "Møterom A - Hovedkontor",
      organizer: adminUser.id,
      agenda: "1. Gjennomgang av sykefravær oktober\n2. Status på HMS-hendelser\n3. Planlegging av kommende vernerunde\n4. Evaluering av brannøvelse\n5. Innkjøp av verneutstyr\n6. Eventuelt",
      summary: "Møtet ble avholdt med alle tilstede. Sykefraværet har gått ned med 12% sammenlignet med samme periode i fjor.",
      notes: "Alle HMS-hendelser er fulgt opp. Brannøvelsen ble vellykket gjennomført med 98% deltakelse. Besluttet å kjøpe inn nye ergonomiske stoler til kontorplassene. Neste møte planlagt 15. desember.",
      status: "COMPLETED",
      startedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // 90 minutter senere
      minuteTaker: hmsUser.id,
    },
  });

  await prisma.meetingParticipant.createMany({
    data: [
      {
        meetingId: meeting1.id,
        userId: adminUser.id,
        role: "CHAIR",
        attended: true,
      },
      {
        meetingId: meeting1.id,
        userId: hmsUser.id,
        role: "SECRETARY",
        attended: true,
      },
      {
        meetingId: meeting1.id,
        userId: vernUser.id,
        role: "MEMBER",
        attended: true,
      },
      {
        meetingId: meeting1.id,
        userId: leaderUser.id,
        role: "MEMBER",
        attended: true,
      },
      {
        meetingId: meeting1.id,
        userId: employeeUser.id,
        role: "MEMBER",
        attended: false,
        notes: "Meldt forfall - syk",
      },
    ],
  });

  const meeting1Decisions = await Promise.all([
    prisma.meetingDecision.create({
      data: {
        meetingId: meeting1.id,
        decisionNumber: "AMU-2024-11-01",
        title: "Anskaffe nye ergonomiske kontorstoler",
        description: "Vedtak: Anskaffe 15 nye ergonomiske kontorstoler innen 31. januar 2025 for å forbedre arbeidsergonomi.",
        responsibleId: adminUser.id,
        dueDate: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
        status: "PENDING",
      },
    }),
    prisma.meetingDecision.create({
      data: {
        meetingId: meeting1.id,
        decisionNumber: "AMU-2024-11-02",
        title: "Gjennomføre vernerunde i uke 50",
        description: "Vedtak: Gjennomføre ny vernerunde i uke 50 med fokus på produksjonsområdet.",
        responsibleId: vernUser.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "IN_PROGRESS",
      },
    }),
    prisma.meetingDecision.create({
      data: {
        meetingId: meeting1.id,
        decisionNumber: "AMU-2024-11-03",
        title: "Oppdatere risikovurdering for ergonomi",
        description: "Vedtak: Oppdatere risikovurdering for ergonomi på alle kontorarbeidsplasser basert på ny forskning.",
        responsibleId: hmsUser.id,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "PENDING",
      },
    }),
  ]);

  const meeting2 = await prisma.meeting.create({
    data: {
      tenantId: tenant.id,
      title: "VO-møte desember 2024 (planlagt)",
      type: "VO",
      scheduledDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      location: "Møterom B",
      organizer: leaderUser.id,
      agenda: "1. Oppfølging av tiltak fra forrige møte\n2. Innmeldte HMS-bekymringer\n3. Status verneutstyr\n4. Planlegging vernerunde januar",
      notes: "Møte med verneombud for oppfølging av HMS-tiltak",
      status: "PLANNED",
    },
  });

  await prisma.meetingParticipant.createMany({
    data: [
      {
        meetingId: meeting2.id,
        userId: leaderUser.id,
        role: "CHAIR",
        attended: false,
      },
      {
        meetingId: meeting2.id,
        userId: hmsUser.id,
        role: "MEMBER",
        attended: false,
      },
      {
        meetingId: meeting2.id,
        userId: vernUser.id,
        role: "MEMBER",
        attended: false,
      },
    ],
  });

  console.log(`   ✅ 2 AMU/VO møter opprettet med ${meeting1Decisions.length} beslutninger`);

  // =====================================================================
  // 15. ANONYM VARSLING
  // =====================================================================
  console.log("🔒 Oppretter varslinger...");

  const whistleblow1 = await prisma.whistleblowing.create({
    data: {
      tenantId: tenant.id,
      caseNumber: "VAR-2024-001",
      accessCode: "ABC123DEF456GHIJ",
      category: "WORK_ENVIRONMENT",
      title: "Bekymring for arbeidsmiljø i produksjon",
      description: "Det er observert at sikkerhetsprosedyrer ikke alltid følges i produksjonsområdet, spesielt ved skiftebytte. Flere ansatte jobber uten påkrevd verneutstyr (vernebriller og hørselsvern). Dette skjer hovedsakelig på kveldsskift.",
      occurredAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      location: "Produksjonshall B - Maskinområde",
      involvedPersons: "3-4 personer observert, navn ukjent",
      witnesses: "Andre på kveldsskift har sett det samme",
      isAnonymous: true,
      status: "CLOSED",
      severity: "MEDIUM",
      handledBy: hmsUser.id,
      assignedTo: hmsUser.id,
      investigatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      closedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      outcome: "Gjennomført HMS-opplæring for alle på kveldsskift. Installert skilting ved alle maskiner. Ekstra kontroller de neste 4 ukene. Ingen nye avvik observert.",
      closedReason: "RESOLVED",
    },
  });

  await prisma.whistleblowMessage.createMany({
    data: [
      {
        whistleblowingId: whistleblow1.id,
        sender: "SYSTEM",
        message: `Varsling mottatt med saksnummer ${whistleblow1.caseNumber}. Bruk tilgangskoden din for å følge opp saken.`,
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      },
      {
        whistleblowingId: whistleblow1.id,
        sender: "HANDLER",
        message: "Takk for din varsling. Vi tar dette på alvor og har startet undersøkelse. Du vil få oppdateringer her i løpet av de neste 7 dagene.",
        createdAt: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000),
      },
      {
        whistleblowingId: whistleblow1.id,
        sender: "REPORTER",
        message: "Takk for rask tilbakemelding. Har dere fått gjort noe med dette? Situasjonen er fortsatt uendret per i dag.",
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        whistleblowingId: whistleblow1.id,
        sender: "HANDLER",
        message: "Vi har gjennomført observasjoner og bekrefter dine funn. HMS-opplæring er planlagt for alle på kveldsskift neste uke. Vi vil også installere ekstra sikkerhetsskilting.",
        createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      },
      {
        whistleblowingId: whistleblow1.id,
        sender: "HANDLER",
        message: "Oppdatering: HMS-opplæring gjennomført. Alle ansatte har signert på at de har forstått prosedyrene. Skilting er installert. Vi gjennomfører ekstra kontroller de neste ukene.",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        whistleblowingId: whistleblow1.id,
        sender: "REPORTER",
        message: "Tusen takk! Jeg har sett at det er satt opp ny skilting og situasjonen er mye bedre nå. Alle bruker verneutstyr.",
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
      {
        whistleblowingId: whistleblow1.id,
        sender: "HANDLER",
        message: "Flott å høre! Vi lukker denne saken nå, men du kan alltid sende inn en ny varsling hvis noe skulle dukke opp. Takk for at du brydde deg om sikkerheten!",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  const whistleblow2 = await prisma.whistleblowing.create({
    data: {
      tenantId: tenant.id,
      caseNumber: "VAR-2024-002",
      accessCode: "XYZ789KLM012NOPQ",
      category: "HARASSMENT",
      title: "Upassende kommentarer fra kollega",
      description: "Jeg har over lengre tid opplevd upassende kommentarer av seksuell karakter fra en mannlig kollega. Dette skjer ofte i pauserommet når vi er alene. Jeg føler meg utrygg på jobb.",
      occurredAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      location: "Pauserom, 2. etasje",
      involvedPersons: "1 mannlig kollega, ca. 40 år",
      isAnonymous: true,
      status: "UNDER_INVESTIGATION",
      severity: "HIGH",
      handledBy: adminUser.id,
      assignedTo: adminUser.id,
      acknowledgedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      investigatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.whistleblowMessage.createMany({
    data: [
      {
        whistleblowingId: whistleblow2.id,
        sender: "SYSTEM",
        message: `Varsling mottatt med saksnummer ${whistleblow2.caseNumber}. Bruk tilgangskoden din for å følge opp saken.`,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        whistleblowingId: whistleblow2.id,
        sender: "HANDLER",
        message: "Takk for at du har meldt fra om dette. Vi tar saken svært alvorlig. En uavhengig person vil gjennomføre diskret undersøkelse. Du vil få tilbakemelding innen 5 virkedager. Du er beskyttet mot gjengjeldelse i henhold til arbeidsmiljøloven § 2A.",
        createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      },
      {
        whistleblowingId: whistleblow2.id,
        sender: "HANDLER",
        message: "Oppdatering: Vi har startet undersøkelse. Vi trenger litt mer informasjon for å kunne følge opp saken best mulig. Kan du fortelle oss omtrent når disse hendelsene startet, og hvor ofte de forekommer?",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        whistleblowingId: whistleblow2.id,
        sender: "REPORTER",
        message: "Dette har pågått i omtrent 3 måneder. Det skjer kanskje 2-3 ganger per uke, oftest på tirsdager og torsdager når det er færre folk på jobb.",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        whistleblowingId: whistleblow2.id,
        sender: "HANDLER",
        message: "Takk for tilleggsinformasjonen. Dette hjelper oss veldig. Vi fortsetter undersøkelsen og vil komme tilbake til deg snart med oppdatering.",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  const whistleblow3 = await prisma.whistleblowing.create({
    data: {
      tenantId: tenant.id,
      caseNumber: "VAR-2024-003",
      accessCode: "PQR456STU789VWXY",
      category: "SAFETY",
      title: "Defekt sikkerhetsutstyr på maskin 7",
      description: "Nødstopp-knappen på maskin 7 fungerer ikke. Jeg har testet den flere ganger og den reagerer ikke. Dette er en alvorlig sikkerhetsrisiko.",
      occurredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      location: "Produksjonshall A, maskin 7",
      isAnonymous: false,
      status: "RECEIVED",
      severity: "HIGH",
      handledBy: leaderUser.id,
      assignedTo: leaderUser.id,
      acknowledgedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      identity: {
        create: {
          reporterName: "Ole Hansen",
          reporterEmail: "ole.hansen@example.com",
          reporterPhone: "90000000",
        },
      },
    },
  });

  await prisma.whistleblowMessage.createMany({
    data: [
      {
        whistleblowingId: whistleblow3.id,
        sender: "SYSTEM",
        message: `Varsling mottatt med saksnummer ${whistleblow3.caseNumber}. Bruk tilgangskoden din for å følge opp saken.`,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        whistleblowingId: whistleblow3.id,
        sender: "HANDLER",
        message: "Takk for meldingen, Ole. Vi setter maskin 7 umiddelbart ut av drift inntil nødstoppen er reparert. Vedlikeholdsteamet er varslet og vil sjekke maskinen i dag.",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        whistleblowingId: whistleblow3.id,
        sender: "REPORTER",
        message: "Takk for rask respons! Bra at maskinen blir tatt ut av drift.",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log(`   ✅ 3 varslinger opprettet med til sammen 15 meldinger`);

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
  console.log(`   ✅ ${additionalMeasures.length} ekstra tiltak`);
  console.log(`   📊 2 ledelsens gjennomganger`);
  console.log(`   🤝 2 AMU/VO møter med ${meeting1Decisions.length} beslutninger`);
  console.log(`   🔒 3 varslinger med 15 meldinger`);
  console.log("\n" + "=".repeat(80));
  console.log("\n✨ Test Bedrift AS er nå klar for demo! ✨");
  console.log("\n🔗 Tilgang til varslingssystemet:");
  console.log(`   URL: https://hmsnova.com/varsling/test-bedrift`);
  console.log(`   Tilgangskoder for sporing:`);
  console.log(`   - VAR-2024-001: ABC123DEF456GHIJ (Lukket)`);
  console.log(`   - VAR-2024-002: XYZ789KLM012NOPQ (Under undersøkelse)`);
  console.log(`   - VAR-2024-003: PQR456STU789VWXY (Åpen - nylig meldt)`);
  console.log("\n" + "=".repeat(80) + "\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

