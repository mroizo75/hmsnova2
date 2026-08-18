import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import JSZip from "jszip";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isSuperAdmin: true },
  });

  if (!user?.isSuperAdmin) {
    return NextResponse.json({ error: "Kun superadmin kan eksportere data" }, { status: 403 });
  }

  const { id: tenantId } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      subscription: true,
      users: {
        select: {
          role: true,
          department: true,
          position: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Bedrift ikke funnet" }, { status: 404 });
  }

  const zip = new JSZip();

  zip.file("tenant.json", JSON.stringify({
    name: tenant.name,
    orgNumber: tenant.orgNumber,
    slug: tenant.slug,
    industry: tenant.industry,
    address: tenant.address,
    postalCode: tenant.postalCode,
    city: tenant.city,
    contactEmail: tenant.contactEmail,
    contactPhone: tenant.contactPhone,
    status: tenant.status,
    createdAt: tenant.createdAt,
    subscription: tenant.subscription ? {
      plan: tenant.subscription.plan,
      status: tenant.subscription.status,
      billingInterval: tenant.subscription.billingInterval,
      price: tenant.subscription.price,
    } : null,
  }, null, 2));

  zip.file("users.json", JSON.stringify(
    tenant.users.map((ut) => ({
      name: ut.user.name,
      email: ut.user.email,
      role: ut.role,
      position: ut.position,
      department: ut.department,
      createdAt: ut.user.createdAt,
    })),
    null, 2
  ));

  const incidents = await prisma.incident.findMany({
    where: { tenantId },
    include: {
      measures: { select: { title: true, description: true, status: true, dueAt: true, completedAt: true } },
    },
  });
  zip.file("incidents.json", JSON.stringify(incidents.map((i) => ({
    title: i.title,
    type: i.type,
    description: i.description,
    severity: i.severity,
    status: i.status,
    location: i.location,
    occurredAt: i.occurredAt,
    createdAt: i.createdAt,
    closedAt: i.closedAt,
    rootCause: i.rootCause,
    immediateAction: i.immediateAction,
    measures: i.measures,
  })), null, 2));

  const riskAssessments = await prisma.riskAssessment.findMany({
    where: { tenantId },
    include: { risks: { include: { measures: { select: { title: true, status: true } } } } },
  });
  zip.file("risks.json", JSON.stringify(riskAssessments.map((ra) => ({
    title: ra.title,
    assessmentYear: ra.assessmentYear,
    participants: ra.participants,
    createdAt: ra.createdAt,
    risks: ra.risks.map((r) => ({
      title: r.title,
      context: r.context,
      category: r.category,
      likelihood: r.likelihood,
      consequence: r.consequence,
      score: r.score,
      status: r.status,
      measures: r.measures,
    })),
  })), null, 2));

  const inspections = await prisma.inspection.findMany({
    where: { tenantId },
    include: { findings: true },
  });
  zip.file("inspections.json", JSON.stringify(inspections.map((i) => ({
    title: i.title,
    description: i.description,
    type: i.type,
    status: i.status,
    scheduledDate: i.scheduledDate,
    completedDate: i.completedDate,
    createdAt: i.createdAt,
    findings: i.findings.map((f) => ({
      title: f.title,
      description: f.description,
      severity: f.severity,
      status: f.status,
    })),
  })), null, 2));

  const documents = await prisma.document.findMany({
    where: { tenantId },
    select: {
      title: true,
      kind: true,
      status: true,
      version: true,
      fileKey: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  zip.file("documents.json", JSON.stringify(documents, null, 2));

  const trainings = await prisma.training.findMany({
    where: { tenantId },
    select: {
      title: true,
      description: true,
      courseKey: true,
      provider: true,
      isRequired: true,
      completedAt: true,
      validUntil: true,
      createdAt: true,
    },
  });
  zip.file("training.json", JSON.stringify(trainings, null, 2));

  const measures = await prisma.measure.findMany({
    where: { tenantId },
    select: {
      title: true,
      description: true,
      status: true,
      category: true,
      dueAt: true,
      completedAt: true,
      createdAt: true,
    },
  });
  zip.file("measures.json", JSON.stringify(measures, null, 2));

  const sja = await prisma.sjaAnalysis.findMany({
    where: { tenantId },
    include: { hazards: true },
  });
  zip.file("sja.json", JSON.stringify(sja.map((s) => ({
    title: s.title,
    description: s.description,
    workLocation: s.workLocation,
    status: s.status,
    plannedDate: s.plannedDate,
    createdAt: s.createdAt,
    hazards: s.hazards.map((h) => ({
      activity: h.activity,
      hazard: h.hazard,
      consequence: h.consequence,
      probability: h.probability,
      severity: h.severity,
      measures: h.measures,
    })),
  })), null, 2));

  const goals = await prisma.goal.findMany({
    where: { tenantId },
    select: {
      title: true,
      description: true,
      category: true,
      status: true,
      deadline: true,
      targetValue: true,
      currentValue: true,
      unit: true,
      year: true,
      createdAt: true,
    },
  });
  zip.file("goals.json", JSON.stringify(goals, null, 2));

  const meetings = await prisma.meeting.findMany({
    where: { tenantId },
    include: {
      participants: { select: { externalName: true, role: true, attended: true } },
      decisions: { select: { decisionNumber: true, description: true, status: true } },
    },
  });
  zip.file("meetings.json", JSON.stringify(meetings.map((m) => ({
    title: m.title,
    type: m.type,
    scheduledDate: m.scheduledDate,
    status: m.status,
    agenda: m.agenda,
    summary: m.summary,
    notes: m.notes,
    createdAt: m.createdAt,
    participants: m.participants,
    decisions: m.decisions,
  })), null, 2));

  const chemicals = await prisma.chemical.findMany({
    where: { tenantId },
    select: {
      productName: true,
      supplier: true,
      casNumber: true,
      hazardClass: true,
      hazardStatements: true,
      location: true,
      quantity: true,
      unit: true,
      status: true,
      createdAt: true,
    },
  });
  zip.file("chemicals.json", JSON.stringify(chemicals, null, 2));

  const routines = await prisma.routine.findMany({
    where: { tenantId },
    select: {
      title: true,
      description: true,
      category: true,
      content: true,
      status: true,
      legalReference: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  zip.file("routines.json", JSON.stringify(routines, null, 2));

  const fireDrills = await prisma.fireDrill.findMany({
    where: { tenantId },
    select: {
      title: true,
      drillType: true,
      plannedDate: true,
      location: true,
      objectives: true,
      observations: true,
      status: true,
      completedAt: true,
      createdAt: true,
    },
  });
  zip.file("fire-drills.json", JSON.stringify(fireDrills, null, 2));

  const environment = await prisma.environmentalAspect.findMany({
    where: { tenantId },
    select: {
      title: true,
      description: true,
      category: true,
      severity: true,
      likelihood: true,
      significanceScore: true,
      status: true,
      createdAt: true,
    },
  });
  zip.file("environment.json", JSON.stringify(environment, null, 2));

  const exposures = await prisma.exposureRegister.findMany({
    where: { tenantId },
    select: {
      exposureAgent: true,
      exposureType: true,
      duration: true,
      exposureStartDate: true,
      exposureEndDate: true,
      jobTitle: true,
      workLocation: true,
      createdAt: true,
    },
  });
  zip.file("exposure-register.json", JSON.stringify(exposures, null, 2));

  zip.file("metadata.json", JSON.stringify({
    exportedAt: new Date().toISOString(),
    tenantId: tenant.id,
    tenantName: tenant.name,
    schemaVersion: "1.0",
    format: "GDPR Art. 20 dataportabilitet",
  }, null, 2));

  const zipBuffer = await zip.generateAsync({ type: "uint8array" });

  const safeName = tenant.name.replace(/[^a-zA-Z0-9æøåÆØÅ\s-]/g, "").replace(/\s+/g, "_");
  const filename = `${safeName}_dataeksport_${new Date().toISOString().split("T")[0]}.zip`;

  return new NextResponse(zipBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
