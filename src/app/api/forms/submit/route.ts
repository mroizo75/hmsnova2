import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorage, generateFileKey } from "@/lib/storage";
import {
  generateSequenceNumber,
  getFormSequenceType,
} from "@/lib/sequence";
import { notifyUsersByRoles } from "@/server/actions/notification.actions";
import { analyzeWellbeingSubmission } from "@/server/actions/wellbeing.actions";
import { tenantCanUseGlobalFormTemplate } from "@/lib/form-template-industry";

interface SubmittedInspectionFindingInput {
  fieldId?: string;
  fieldLabel?: string;
  answer?: string;
  title?: string;
  description?: string;
  severity?: number;
  location?: string;
  imageKeys?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const formId = formData.get("formId") as string;
    const tenantId = formData.get("tenantId") as string;
    const userId = formData.get("userId") as string;
    const status = formData.get("status") as string;
    const valuesJson = formData.get("values") as string;
    const signature = formData.get("signature") as string | null;
    const inspectionId = formData.get("inspectionId") as string | null;
    const fieldCommentsJson = formData.get("fieldComments") as string | null;
    const inspectionFindingsJson = formData.get("inspectionFindings") as string | null;

    const values = JSON.parse(valuesJson);
    const storage = getStorage();
    const sessionTenantId = session.user.tenantId;
    if (!sessionTenantId) {
      return NextResponse.json({ error: "Ingen tenant i sesjon" }, { status: 403 });
    }
    if (tenantId !== sessionTenantId) {
      return NextResponse.json({ error: "Ugyldig tenant-kontekst" }, { status: 403 });
    }

    // Hent skjemaet for å få feltene
    const form = await prisma.formTemplate.findUnique({
      where: { id: formId },
      include: { fields: true },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    const canAccessForm =
      form.tenantId === sessionTenantId || (form.isGlobal === true && form.tenantId === null);
    if (!canAccessForm) {
      return NextResponse.json({ error: "Ingen tilgang til skjema" }, { status: 403 });
    }

    if (form.isGlobal && form.tenantId === null) {
      const scopeBypass = formData.get("industryScopeBypass") === "1";
      const tenantForScope = await prisma.tenant.findUnique({
        where: { id: sessionTenantId },
        select: { industry: true },
      });
      if (
        !tenantCanUseGlobalFormTemplate(form, tenantForScope?.industry ?? null, {
          allTemplatesView: scopeBypass,
        })
      ) {
        return NextResponse.json(
          { error: "Skjemaet er ikke tilgjengelig for virksomhetens bransje" },
          { status: 403 }
        );
      }
    }

    const sequenceType = getFormSequenceType(form.numberPrefix ?? null);
    const submissionNumber = await generateSequenceNumber(
      tenantId,
      sequenceType,
      new Date().getFullYear()
    );

    // Anonyme svar for psykososiale skjemaer (ISO 45003, AML § 4-3)
    const isAnonymous =
      form.category === "WELLBEING" || form.allowAnonymousResponses;
    if (!isAnonymous && userId !== session.user.id) {
      return NextResponse.json({ error: "Ugyldig bruker-kontekst" }, { status: 403 });
    }

    // Bygg metadata-objekt
    const metadataObj: Record<string, unknown> = {};
    if (signature) {
      metadataObj.signatureData = signature;
    }
    if (fieldCommentsJson) {
      try {
        metadataObj.fieldComments = JSON.parse(fieldCommentsJson);
      } catch {
        // Ignorer ugyldig JSON
      }
    }

    let selectedProjectId: string | null = null;
    let selectedProjectName: string | null = null;
    const projectField = form.fields.find((field) => field.fieldType === "PROJECT");

    if (projectField) {
      const candidateProjectId = values[projectField.id];
      if (typeof candidateProjectId === "string" && candidateProjectId.trim().length > 0) {
        const project = await prisma.project.findUnique({
          where: { id: candidateProjectId, tenantId: sessionTenantId },
          select: { id: true, name: true },
        });

        if (!project) {
          return NextResponse.json({ error: "Ugyldig prosjektvalg" }, { status: 400 });
        }

        selectedProjectId = project.id;
        selectedProjectName = project.name;
      } else if (status === "SUBMITTED" && projectField.isRequired) {
        return NextResponse.json({ error: "Prosjekt er påkrevd" }, { status: 400 });
      }
    }

    let submittedInspectionFindings: SubmittedInspectionFindingInput[] = [];
    if (inspectionFindingsJson) {
      try {
        const parsed = JSON.parse(inspectionFindingsJson) as unknown;
        if (Array.isArray(parsed)) {
          submittedInspectionFindings = parsed as SubmittedInspectionFindingInput[];
        }
      } catch {
        return NextResponse.json(
          { error: "Ugyldig format for inspeksjonsfunn" },
          { status: 400 }
        );
      }
    }

    // Opprett submission
    const submission = await prisma.formSubmission.create({
      data: {
        formTemplateId: formId,
        tenantId,
        projectId: selectedProjectId,
        submissionNumber,
        submittedById: isAnonymous ? null : userId,
        status: status as "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED",
        signedAt: signature ? new Date() : null,
        metadata: Object.keys(metadataObj).length > 0 ? JSON.stringify(metadataObj) : null,
      },
    });

    // Lagre feltverdier
    for (const field of form.fields) {
      const value = values[field.id];

      if (field.fieldType === "PROJECT") {
        if (selectedProjectName) {
          await prisma.formFieldValue.create({
            data: {
              submissionId: submission.id,
              fieldId: field.id,
              value: selectedProjectName,
            },
          });
        }
        continue;
      }
      
      // Håndter fil-opplasting
      if (field.fieldType === "FILE") {
        const file = formData.get(`file_${field.id}`) as File | null;
        if (file) {
          const fileKey = generateFileKey(tenantId, "form-files", file.name);
          await storage.upload(fileKey, file);
          
          await prisma.formFieldValue.create({
            data: {
              submissionId: submission.id,
              fieldId: field.id,
              fileKey,
            },
          });
          continue;
        }
      }

      // Lagre vanlig verdi
      if (value !== undefined && value !== null && value !== "") {
        await prisma.formFieldValue.create({
          data: {
            submissionId: submission.id,
            fieldId: field.id,
            value: typeof value === "string" ? value : JSON.stringify(value),
          },
        });
      }
    }

    // Koble submission til inspeksjon og sett status COMPLETED
    if (status === "SUBMITTED" && inspectionId) {
      const inspection = await prisma.inspection.findFirst({
        where: { id: inspectionId, tenantId: sessionTenantId },
        select: {
          id: true,
          tenantId: true,
          title: true,
          location: true,
        },
      });
      if (!inspection) {
        return NextResponse.json({ error: "Inspeksjon ikke funnet" }, { status: 404 });
      }

      for (const findingInput of submittedInspectionFindings) {
        const description = (findingInput.description || "").trim();
        if (!description) {
          continue;
        }
        const hasSeverity =
          typeof findingInput.severity === "number" && Number.isFinite(findingInput.severity);
        const severity = hasSeverity ? Math.max(1, Math.min(5, findingInput.severity!)) : 3;
        // Avviket får null når funnet ikke er gradert, slik at leder vurderer det
        const incidentSeverity = hasSeverity ? severity : null;
        const title = (findingInput.title || findingInput.fieldLabel || "Funn fra vernerunde").trim();
        const location = (findingInput.location || "").trim();
        const imageKeys = Array.isArray(findingInput.imageKeys)
          ? findingInput.imageKeys.filter((key): key is string => typeof key === "string")
          : [];

        const finding = await prisma.inspectionFinding.create({
          data: {
            inspectionId: inspection.id,
            title,
            description,
            severity,
            location: location || null,
            imageKeys: imageKeys.length > 0 ? JSON.stringify(imageKeys) : null,
            status: "OPEN",
          },
        });

        const occurredAt = new Date();
        const avviksnummer = await generateSequenceNumber(
          inspection.tenantId,
          "AVVIK",
          occurredAt.getFullYear()
        );
        const inspectionContext = `Kilde: Vernerunde "${inspection.title}"`;
        const fieldContext = findingInput.fieldLabel
          ? `\nSjekkpunkt: ${findingInput.fieldLabel}`
          : "";
        const answerContext = findingInput.answer
          ? `\nSvar i skjema: ${findingInput.answer}`
          : "";
        const incidentDescription = `${inspectionContext}${fieldContext}${answerContext}\n\n${description}`;

        await prisma.incident.create({
          data: {
            tenantId: inspection.tenantId,
            avviksnummer,
            type: "AVVIK",
            title: `[Vernerunde] ${finding.title}`,
            description: incidentDescription,
            severity: incidentSeverity,
            occurredAt,
            reportedBy: session.user.id,
            location: location || inspection.location || null,
          },
        });
      }

      await prisma.inspection.update({
        where: { id: inspection.id },
        data: {
          formSubmissionId: submission.id,
          status: "COMPLETED",
          completedDate: new Date(),
        },
      });
    }

    // Send varsling til lederroller hvis skjemaet sendes inn (ikke kladd)
    if (status === "SUBMITTED" && form.requiresApproval) {
      await notifyUsersByRoles(tenantId, ["ADMIN", "HMS", "LEDER"], {
        type: "FORM_SUBMITTED",
        title: "Nytt skjema sendt inn",
        message: `${form.title} - venter på godkjenning`,
        link: `/dashboard/wellbeing`,
      });
    }

    // AUTOMATISK VURDERING: Hvis dette er et WELLBEING-skjema
    if (status === "SUBMITTED" && form.category === "WELLBEING") {
      try {
        console.log(`🧠 [Wellbeing] Analyserer submission: ${submission.id}`);
        const analysis = await analyzeWellbeingSubmission(submission.id);
        
        console.log(`✅ [Wellbeing] Analyse ferdig:`, {
          overallScore: analysis.overallScore,
          riskLevel: analysis.riskLevel,
          requiresAction: analysis.requiresAction,
          riskId: analysis.riskId,
          measures: analysis.measures.length,
        });

        // Lagre analyse-resultatet i submission metadata
        await prisma.formSubmission.update({
          where: { id: submission.id },
          data: {
            metadata: JSON.stringify({
              ...JSON.parse(submission.metadata || "{}"),
              wellbeingAnalysis: {
                overallScore: analysis.overallScore,
                riskLevel: analysis.riskLevel,
                riskId: analysis.riskId,
                analyzedAt: new Date().toISOString(),
              }
            })
          }
        });
      } catch (error) {
        console.error("❌ [Wellbeing] Analyse feilet:", error);
        // Ikke la analyse-feil stoppe submission
      }
    }

    return NextResponse.json({ success: true, submission }, { status: 201 });
  } catch (error: any) {
    console.error("Submit form error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

