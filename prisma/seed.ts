import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Opprett superadmin bruker
  const superAdminPassword = await bcrypt.hash("superadmin123", 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@hmsnova.com" },
    update: {},
    create: {
      email: "superadmin@hmsnova.com",
      name: "Superadmin",
      password: superAdminPassword,
      isSuperAdmin: true,
      emailVerified: new Date(),
    },
  });

  console.log("✅ Superadmin opprettet:", superAdmin.email);

  // Opprett support bruker
  const supportPassword = await bcrypt.hash("support123", 10);

  const supportUser = await prisma.user.upsert({
    where: { email: "support@hmsnova.com" },
    update: {},
    create: {
      email: "support@hmsnova.com",
      name: "Support Team",
      password: supportPassword,
      isSupport: true,
      emailVerified: new Date(),
    },
  });

  console.log("✅ Support-bruker opprettet:", supportUser.email);

  // Opprett test tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "test-bedrift" },
    update: {},
    create: {
      name: "Test Bedrift AS",
      orgNumber: "123456789",
      slug: "test-bedrift",
      status: "ACTIVE",
      contactEmail: "post@testbedrift.no",
      contactPhone: "12345678",
      address: "Testveien 1",
      city: "Oslo",
      postalCode: "0123",
      subscription: {
        create: {
          plan: "PROFESSIONAL",
          price: 1990,
          billingInterval: "MONTHLY",
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  console.log("✅ Tenant opprettet:", tenant.name);

  // Opprett admin bruker for tenant
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@test.no" },
    update: {
      emailVerified: new Date(), // FIX: Ensure verification even on update
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      email: "admin@test.no",
      name: "Admin Testesen",
      password: hashedPassword,
      emailVerified: new Date(),
      tenants: {
        create: {
          tenantId: tenant.id,
          role: "ADMIN",
        },
      },
    },
  });

  console.log("✅ Admin bruker opprettet:", adminUser.email);

  // Opprett HMS-ansvarlig
  const hmsPassword = await bcrypt.hash("hms123", 10);

  const hms = await prisma.user.upsert({
    where: { email: "hms@test.no" },
    update: {},
    create: {
      email: "hms@test.no",
      name: "HMS-ansvarlig Hansen",
      password: hmsPassword,
      emailVerified: new Date(),
      tenants: {
        create: {
          tenantId: tenant.id,
          role: "HMS",
        },
      },
    },
  });

  console.log("✅ HMS-bruker opprettet:", hms.email);

  // Opprett Leder
  const leaderPassword = await bcrypt.hash("leder123", 10);

  const leader = await prisma.user.upsert({
    where: { email: "leder@test.no" },
    update: {},
    create: {
      email: "leder@test.no",
      name: "Leder Larsen",
      password: leaderPassword,
      emailVerified: new Date(),
      tenants: {
        create: {
          tenantId: tenant.id,
          role: "LEDER",
        },
      },
    },
  });

  console.log("✅ Leder-bruker opprettet:", leader.email);

  // Opprett Verneombud
  const vernPassword = await bcrypt.hash("vern123", 10);

  const vern = await prisma.user.upsert({
    where: { email: "vern@test.no" },
    update: {},
    create: {
      email: "vern@test.no",
      name: "Verneombud Viken",
      password: vernPassword,
      emailVerified: new Date(),
      tenants: {
        create: {
          tenantId: tenant.id,
          role: "VERNEOMBUD",
        },
      },
    },
  });

  console.log("✅ Verneombud-bruker opprettet:", vern.email);

  // Opprett en vanlig ansatt
  const employeePassword = await bcrypt.hash("ansatt123", 10);

  const employee = await prisma.user.upsert({
    where: { email: "ansatt@test.no" },
    update: {},
    create: {
      email: "ansatt@test.no",
      name: "Ansatt Olsen",
      password: employeePassword,
      emailVerified: new Date(),
      tenants: {
        create: {
          tenantId: tenant.id,
          role: "ANSATT",
        },
      },
    },
  });

  console.log("✅ Ansatt-bruker opprettet:", employee.email);

  // Opprett BHT bruker
  const bhtPassword = await bcrypt.hash("bht123", 10);

  const bht = await prisma.user.upsert({
    where: { email: "bht@test.no" },
    update: {},
    create: {
      email: "bht@test.no",
      name: "BHT Bruker",
      password: bhtPassword,
      emailVerified: new Date(),
      tenants: {
        create: {
          tenantId: tenant.id,
          role: "BHT",
        },
      },
    },
  });

  console.log("✅ BHT-bruker opprettet:", bht.email);

  // Opprett Revisor bruker
  const auditorPassword = await bcrypt.hash("revisor123", 10);

  const auditor = await prisma.user.upsert({
    where: { email: "revisor@test.no" },
    update: {},
    create: {
      email: "revisor@test.no",
      name: "Revisor Revidersen",
      password: auditorPassword,
      emailVerified: new Date(),
      tenants: {
        create: {
          tenantId: tenant.id,
          role: "REVISOR",
        },
      },
    },
  });

  console.log("✅ Revisor-bruker opprettet:", auditor.email);

  // Opprett eksempel mål (ISO 9001 - 6.2)
  const goal1 = await prisma.goal.create({
    data: {
      tenantId: tenant.id,
      title: "Redusere arbeidsskader med 50%",
      description: "Mål om å redusere antall arbeidsskader fra 10 til 5 i løpet av året",
      category: "HMS",
      targetValue: 5,
      currentValue: 10,
      unit: "antall",
      baseline: 10,
      year: new Date().getFullYear(),
      startDate: new Date(`${new Date().getFullYear()}-01-01`),
      deadline: new Date(`${new Date().getFullYear()}-12-31`),
      ownerId: adminUser.id,
      status: "ACTIVE",
    },
  });

  console.log("✅ Mål opprettet:", goal1.title);

  // Opprett målinger for mål 1
  const measurement1 = await prisma.kpiMeasurement.create({
    data: {
      goalId: goal1.id,
      tenantId: tenant.id,
      value: 8,
      measurementDate: new Date(`${new Date().getFullYear()}-03-31`),
      measurementType: "MANUAL",
      comment: "Q1-måling: Reduksjon på 2 skader",
      measuredById: adminUser.id,
    },
  });

  const measurement2 = await prisma.kpiMeasurement.create({
    data: {
      goalId: goal1.id,
      tenantId: tenant.id,
      value: 6,
      measurementDate: new Date(`${new Date().getFullYear()}-06-30`),
      measurementType: "MANUAL",
      comment: "Q2-måling: Fortsatt fremgang",
      measuredById: adminUser.id,
    },
  });

  console.log("✅ Målinger opprettet:", measurement1.id, measurement2.id);

  // Oppdater goal1 currentValue til siste måling
  await prisma.goal.update({
    where: { id: goal1.id },
    data: { currentValue: 6 },
  });

  // Opprett flere eksempel mål
  const goal2 = await prisma.goal.create({
    data: {
      tenantId: tenant.id,
      title: "Øke kundetilfredshet til 90%",
      description: "Måle kundetilfredshet gjennom NPS-score",
      category: "CUSTOMER",
      targetValue: 90,
      currentValue: 75,
      unit: "%",
      baseline: 70,
      year: new Date().getFullYear(),
      quarter: 2,
      ownerId: adminUser.id,
      status: "ACTIVE",
    },
  });

  const goal3 = await prisma.goal.create({
    data: {
      tenantId: tenant.id,
      title: "Redusere avfall med 30%",
      description: "Miljømål for reduksjon av avfall",
      category: "ENVIRONMENT",
      targetValue: 70,
      currentValue: 95,
      unit: "kg",
      baseline: 100,
      year: new Date().getFullYear(),
      deadline: new Date(`${new Date().getFullYear()}-12-31`),
      ownerId: employee.id,
      status: "AT_RISK",
    },
  });

  const goal4 = await prisma.goal.create({
    data: {
      tenantId: tenant.id,
      title: "Oppnå ISO 9001 sertifisering",
      description: "Fullføre alle krav for ISO 9001:2015 sertifisering",
      category: "QUALITY",
      targetValue: 100,
      currentValue: 100,
      unit: "%",
      baseline: 0,
      year: new Date().getFullYear() - 1,
      ownerId: adminUser.id,
      status: "ACHIEVED",
    },
  });

  console.log("✅ Flere mål opprettet:", goal2.title, goal3.title, goal4.title);

  // Opprett eksempel faktura
  const invoice = await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      amount: 1990,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: "SENT",
      period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
      description: "HMS Nova Professional - Månedlig abonnement",
    },
  });

  console.log("✅ Faktura opprettet:", invoice.id);

  // Slett eksisterende demo-data for Test Bedrift AS (for å unngå unique constraint errors)
  console.log("🗑️  Rydder opp eksisterende demo-data...");
  await prisma.inspectionFinding.deleteMany({ where: { inspection: { tenantId: tenant.id } } });
  await prisma.inspection.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.auditFinding.deleteMany({ where: { audit: { tenantId: tenant.id } } });
  await prisma.audit.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.whistleblowMessage.deleteMany({ where: { whistleblowing: { tenantId: tenant.id } } });
  await prisma.whistleblowing.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.meetingDecision.deleteMany({ where: { meeting: { tenantId: tenant.id } } });
  await prisma.meetingParticipant.deleteMany({ where: { meeting: { tenantId: tenant.id } } });
  await prisma.meeting.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.managementReview.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.kpiMeasurement.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.training.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.chemical.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.measure.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.incident.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.risk.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.documentVersion.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.document.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.goal.deleteMany({ where: { tenantId: tenant.id } });
  console.log("✅ Eksisterende demo-data slettet");

  // Opprett eksempel dokumenter
  const doc1 = await prisma.document.create({
    data: {
      tenantId: tenant.id,
      title: "HMS-håndbok 2024",
      slug: "hms-handbok-2024",
      fileKey: "demo/hms-handbok.pdf",
      kind: "OTHER",
      version: "1.0",
      status: "APPROVED",
      approvedBy: adminUser.id,
      approvedAt: new Date(),
      nextReviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  const doc2 = await prisma.document.create({
    data: {
      tenantId: tenant.id,
      title: "Beredskapsplan",
      slug: "beredskapsplan",
      fileKey: "demo/beredskapsplan.pdf",
      kind: "PLAN",
      version: "0.5",
      status: "DRAFT",
    },
  });

  console.log("✅ Dokumenter opprettet:", doc1.title, doc2.title);

  // Opprett eksempel risikoer
  const risk1 = await prisma.risk.create({
    data: {
      tenantId: tenant.id,
      title: "Fallulykke fra stillas",
      context: "Risiko for fall fra høyde ved arbeid på stillas. Byggeplass har stillas opp til 15 meter høyde.",
      likelihood: 3,
      consequence: 4,
      score: 12,
      ownerId: hms.id,
      status: "OPEN",
    },
  });

  const risk2 = await prisma.risk.create({
    data: {
      tenantId: tenant.id,
      title: "Eksponering for kjemikalier",
      context: "Risiko ved håndtering av farlige kjemikalier uten verneutstyr i lagerområdet.",
      likelihood: 2,
      consequence: 2,
      score: 4,
      ownerId: hms.id,
      status: "MITIGATING",
    },
  });

  console.log("✅ Risikoer opprettet:", risk1.title, risk2.title);

  // Opprett eksempel hendelser
  const incident1 = await prisma.incident.create({
    data: {
      tenantId: tenant.id,
      type: "SKADE",
      title: "Mindre kuttskade",
      description: "Ansatt fikk kuttskade i finger ved bruk av verktøy",
      severity: 2,
      occurredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      reportedBy: employee.id,
      responsibleId: hms.id,
      location: "Verksted",
      immediateAction: "Førstehjelpsutstyr brukt",
      status: "CLOSED",
      closedBy: hms.id,
      closedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  const incident2 = await prisma.incident.create({
    data: {
      tenantId: tenant.id,
      type: "NESTEN",
      title: "Nesten-ulykke: Fallende gjenstand",
      description: "Verktøy falt ned fra høyde, ingen personer skadet",
      severity: 3,
      occurredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      reportedBy: employee.id,
      responsibleId: hms.id,
      location: "Byggeplass",
      status: "INVESTIGATING",
    },
  });

  console.log("✅ Hendelser opprettet:", incident1.title, incident2.title);

  // Opprett eksempel tiltak
  const measure1 = await prisma.measure.create({
    data: {
      tenantId: tenant.id,
      riskId: risk1.id,
      title: "Installere rekkverk på stillas",
      description: "Montere sikkerhetsutstyr for å forhindre fall",
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      responsibleId: leader.id,
      status: "IN_PROGRESS",
    },
  });

  const measure2 = await prisma.measure.create({
    data: {
      tenantId: tenant.id,
      title: "Gjennomføre HMS-opplæring",
      description: "Obligatorisk HMS-kurs for alle nye ansatte",
      dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      responsibleId: hms.id,
      status: "PENDING",
    },
  });

  console.log("✅ Tiltak opprettet:", measure1.title, measure2.title);

  // Opprett eksempel opplæring
  const training1 = await prisma.training.create({
    data: {
      tenantId: tenant.id,
      userId: employee.id,
      title: "Grunnleggende HMS-kurs",
      description: "Innføring i HMS-rutiner og sikkerhetsprosedyrer",
      courseKey: "hms-grunnkurs",
      provider: "KKS AS",
      completedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      validUntil: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
      isRequired: true,
    },
  });

  const training2 = await prisma.training.create({
    data: {
      tenantId: tenant.id,
      userId: employee.id,
      title: "Arbeid i høyden",
      description: "Sertifisering for arbeid på stillas og lift",
      courseKey: "hoyde-sertifikat",
      provider: "KKS AS",
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isRequired: true,
    },
  });

  console.log("✅ Opplæring opprettet:", training1.title, training2.title);

  // Opprett eksempel stoffkartotek
  const chemical1 = await prisma.chemical.create({
    data: {
      tenantId: tenant.id,
      productName: "Aceton",
      supplier: "Kjemikalier AS",
      casNumber: "67-64-1",
      hazardClass: "Brannfarlig væske (GHS02), Helsefare (GHS07)",
      hazardStatements: "H225: Meget brannfarlig væske og damp\nH319: Gir alvorlig øyeirritasjon\nH336: Kan forårsake døsighet eller svimmelhet",
      warningPictograms: JSON.stringify(["GHS02.svg", "GHS07.svg"]),
      requiredPPE: JSON.stringify(["Vernebriller", "Hansker"]),
      sdsVersion: "2.1",
      sdsDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      nextReviewDate: new Date(Date.now() + 185 * 24 * 60 * 60 * 1000),
      location: "Kjemikalieskap A",
      quantity: 5,
      unit: "liter",
      status: "ACTIVE",
      lastVerifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastVerifiedBy: hms.id,
    },
  });

  const chemical2 = await prisma.chemical.create({
    data: {
      tenantId: tenant.id,
      productName: "Saltsyre 10%",
      supplier: "Lab Supply",
      casNumber: "7647-01-0",
      hazardClass: "Etsende (GHS05), Helsefare (GHS07)",
      hazardStatements: "H290: Kan være etsende for metaller\nH314: Gir alvorlige etseskader på hud og øyne\nH335: Kan forårsake irritasjon av luftveiene",
      warningPictograms: JSON.stringify(["GHS05.svg", "GHS07.svg"]),
      requiredPPE: JSON.stringify(["Vernebriller", "Hansker", "Åndedrettsvern"]),
      sdsVersion: "3.0",
      sdsDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      nextReviewDate: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000),
      location: "Syre-skap B",
      quantity: 2,
      unit: "liter",
      status: "ACTIVE",
      notes: "Oppbevares atskilt fra brennbare materialer",
      lastVerifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastVerifiedBy: hms.id,
    },
  });

  console.log("✅ Kjemikalier opprettet:", chemical1.productName, chemical2.productName);

  // Opprett eksempel vernerunder (Inspections)
  const inspection1 = await prisma.inspection.create({
    data: {
      tenantId: tenant.id,
      title: "Månedlig vernerunde - Desember",
      description: "Rutinemessig vernerunde av alle arbeidsområder",
      type: "VERNERUNDE",
      status: "COMPLETED",
      scheduledDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      completedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      location: "Alle områder",
      conductedBy: vern.id,
      participants: JSON.stringify([vern.id, hms.id]),
    },
  });

  const finding1 = await prisma.inspectionFinding.create({
    data: {
      inspectionId: inspection1.id,
      title: "Manglende merking av nødutgang",
      description: "Nødutgang i lagerområdet mangler tydelig skilting",
      severity: 3,
      location: "Lager - Sektor C",
      status: "OPEN",
      responsibleId: hms.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const finding2 = await prisma.inspectionFinding.create({
    data: {
      inspectionId: inspection1.id,
      title: "Slitt verneutstyr",
      description: "Flere vernebriller har riper og bør skiftes ut",
      severity: 2,
      location: "Verksted",
      status: "RESOLVED",
      responsibleId: hms.id,
      resolvedAt: new Date(),
      resolutionNotes: "Nye vernebriller bestilt og utlevert",
    },
  });

  console.log("✅ Vernerunde opprettet:", inspection1.title, "med", 2, "funn");

  // Opprett eksempel revisjon (Audit)
  const audit1 = await prisma.audit.create({
    data: {
      tenantId: tenant.id,
      title: "ISO 9001 Internrevisjon 2024",
      auditType: "INTERNAL",
      scope: "Alle prosesser i kvalitetsstyringssystemet",
      criteria: "ISO 9001:2015 krav 4-10",
      area: "Kvalitet",
      department: "Alle avdelinger",
      leadAuditorId: auditor.id,
      teamMemberIds: JSON.stringify([hms.id]),
      scheduledDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      status: "COMPLETED",
      summary: "Årlig internrevisjon av kvalitetsstyringssystemet gjennomført",
      conclusion: "Systemet fungerer tilfredsstillende med 2 mindre avvik som må lukkes",
    },
  });

  const auditFinding1 = await prisma.auditFinding.create({
    data: {
      auditId: audit1.id,
      findingType: "MINOR_NC",
      clause: "7.1.5",
      description: "Måleutstyr i lab mangler oppdatert kalibreringslogg",
      evidence: "Observert under inspeksjon av laboratoriet at 3 av 5 måleinstrumenter manglet kalibreringsdokumentasjon for 2024",
      requirement: "ISO 9001:2015 krever at måleutstyr skal kalibreres og dokumenteres regelmessig",
      responsibleId: leader.id,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "OPEN",
    },
  });

  const auditFinding2 = await prisma.auditFinding.create({
    data: {
      auditId: audit1.id,
      findingType: "OBSERVATION",
      clause: "7.4",
      description: "Mulighet for bedre informasjonsflyt mellom avdelinger",
      evidence: "Observert at HMS-informasjon ikke alltid når alle ansatte i tide",
      requirement: "Effektiv kommunikasjon bør sikres i henhold til ISO 9001:2015",
      responsibleId: hms.id,
      status: "RESOLVED",
      correctiveAction: "Implementert ukentlige HMS-nyhetsbrev via e-post",
      closedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      verifiedById: auditor.id,
      verifiedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("✅ Revisjon opprettet:", audit1.title, "med", 2, "funn");

  // Opprett eksempel Ledelsens gjennomgang
  const mgmtReview1 = await prisma.managementReview.create({
    data: {
      tenantId: tenant.id,
      title: "Ledelsens gjennomgang Q4 2024",
      period: "Q4 2024",
      reviewDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      conductedBy: adminUser.id,
      nextReviewDate: new Date(Date.now() + 83 * 24 * 60 * 60 * 1000),
      participants: JSON.stringify([
        { name: adminUser.name, role: "Admin", email: adminUser.email },
        { name: hms.name, role: "HMS-ansvarlig", email: hms.email },
        { name: leader.name, role: "Avdelingsleder", email: leader.email },
      ]),
      conclusions: "Systemet fungerer tilfredsstillende. Noen mindre forbedringer identifisert.",
      decisions: "1. Godkjent budsjett for nytt verneutstyr\n2. Besluttet å gjennomføre ekstra HMS-opplæring\n3. Oppfølging av åpne avvik innen 30 dager",
      actionPlan: JSON.stringify([
        { title: "Bestille nytt verneutstyr", responsible: "HMS", deadline: "2024-12-31" },
        { title: "Planlegge HMS-kurs", responsible: "HR", deadline: "2024-12-15" },
      ]),
      status: "COMPLETED",
      approvedBy: adminUser.id,
      approvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("✅ Ledelsens gjennomgang opprettet:", mgmtReview1.title);

  // Opprett eksempel AMU/VO-møte
  const meeting1 = await prisma.meeting.create({
    data: {
      tenantId: tenant.id,
      title: "AMU-møte desember 2024",
      type: "AMU",
      scheduledDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      location: "Møterom A",
      organizer: leader.id,
      agenda: "1. Sykefravær Q4\n2. HMS-hendelser\n3. Kommende vernerunder\n4. Eventuelt",
      summary: "Møtet ble avholdt med alle tilstede. Sykefraværet har gått ned med 15%.",
      notes: "Alle HMS-hendelser er fulgt opp.",
      status: "COMPLETED",
      startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 120 * 60 * 1000),
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
        userId: hms.id,
        role: "SECRETARY",
        attended: true,
      },
      {
        meetingId: meeting1.id,
        userId: vern.id,
        role: "MEMBER",
        attended: true,
      },
      {
        meetingId: meeting1.id,
        userId: employee.id,
        role: "MEMBER",
        attended: false,
      },
    ],
  });

  const decision1 = await prisma.meetingDecision.create({
    data: {
      meetingId: meeting1.id,
      decisionNumber: "AMU-2024-12-01",
      title: "Anskaffe nye ergonomiske stoler",
      description: "Vedtak om å anskaffe nye ergonomiske stoler til kontoret",
      responsibleId: adminUser.id,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "PENDING",
    },
  });

  const decision2 = await prisma.meetingDecision.create({
    data: {
      meetingId: meeting1.id,
      decisionNumber: "AMU-2024-12-02",
      title: "Planlegge ny vernerunde",
      description: "Planlegge ny vernerunde i uke 3",
      responsibleId: vern.id,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: "IN_PROGRESS",
    },
  });

  console.log("✅ AMU-møte opprettet:", meeting1.title, "med", 4, "deltakere og", 2, "beslutninger");

  // Opprett eksempel anonym varsling
  const whistleblow1 = await prisma.whistleblowing.create({
    data: {
      tenantId: tenant.id,
      caseNumber: "VAR-2024-001",
      accessCode: "ABC123DEF456GHIJ",
      category: "WORK_ENVIRONMENT",
      title: "Bekymring for arbeidsmiljø i Sektor B",
      description: "Det er observert at sikkerhetsprosedyrer ikke alltid følges i produksjonsområdet. Flere ansatte jobber uten påkrevd verneutstyr.",
      occurredAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      location: "Produksjon - Sektor B",
      involvedPersons: "Ukjent - flere personer observert",
      isAnonymous: true,
      status: "UNDER_INVESTIGATION",
      severity: "MEDIUM",
      handledBy: hms.id,
      assignedTo: hms.id,
      acknowledgedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      investigatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.whistleblowMessage.createMany({
    data: [
      {
        whistleblowingId: whistleblow1.id,
        sender: "SYSTEM",
        message: `Varsling mottatt med saksnummer ${whistleblow1.caseNumber}. Bruk tilgangskoden din for å følge opp saken.`,
      },
      {
        whistleblowingId: whistleblow1.id,
        sender: "HANDLER",
        message: "Takk for din varsling. Vi tar dette på alvor og har startet undersøkelse. Du vil få oppdateringer her.",
      },
      {
        whistleblowingId: whistleblow1.id,
        sender: "REPORTER",
        message: "Har dere fått gjort noe med dette? Situasjonen er fortsatt uendret.",
      },
      {
        whistleblowingId: whistleblow1.id,
        sender: "HANDLER",
        message: "Vi har gjennomført observasjoner og vil holde sikkerhetsmøte med alle i neste uke. Verneutstyr vil bli kontrollert.",
      },
    ],
  });

  console.log("✅ Varsling opprettet:", whistleblow1.caseNumber, "med", 4, "meldinger");

  console.log("\n🎉 Seeding fullført!");
  console.log("\n📊 DEMO DATA OPPSUMMERING:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📄 Dokumenter:               2");
  console.log("⚠️  Risikoer:                 2");
  console.log("🚨 Hendelser:                2");
  console.log("✅ Tiltak:                   2");
  console.log("🎯 Mål:                      4");
  console.log("📚 Opplæring:                2");
  console.log("🧪 Kjemikalier:              2");
  console.log("🔍 Vernerunder:              1 (med 2 funn)");
  console.log("📋 Revisjoner:               1 (med 2 funn)");
  console.log("📊 Ledelsens gjennomgang:    1");
  console.log("🤝 AMU-møter:                1 (med 4 deltakere)");
  console.log("🔒 Varslinger:               1 (med 4 meldinger)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n📝 Test pålogginger:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🛡️  Superadmin:     superadmin@hmsnova.com / superadmin123");
  console.log("🎧 Support:        support@hmsnova.com / support123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("👤 Admin:          admin@test.no / admin123");
  console.log("⚡ HMS-ansvarlig:  hms@test.no / hms123");
  console.log("👔 Leder:          leder@test.no / leder123");
  console.log("🛡️  Verneombud:    vern@test.no / vern123");
  console.log("👷 Ansatt:         ansatt@test.no / ansatt123");
  console.log("🏥 BHT:            bht@test.no / bht123");
  console.log("📋 Revisor:        revisor@test.no / revisor123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n🔗 Varslingssiden for Test Bedrift AS:");
  console.log("   https://hmsnova.com/varsling/test-bedrift");
  console.log("   Tilgangskode for sporing: ABC123DEF456GHIJ");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
