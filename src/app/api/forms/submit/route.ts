import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorage, generateFileKey } from "@/lib/storage";
import {
  generateSequenceNumber,
  getFormSequenceType,
} from "@/lib/sequence";
import { notifyUsersByRole } from "@/server/actions/notification.actions";
import { analyzeWellbeingSubmission } from "@/server/actions/wellbeing.actions";

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

    // Opprett submission
    const submission = await prisma.formSubmission.create({
      data: {
        formTemplateId: formId,
        tenantId,
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
      await prisma.inspection.update({
        where: { id: inspectionId, tenantId: sessionTenantId },
        data: {
          formSubmissionId: submission.id,
          status: "COMPLETED",
          completedDate: new Date(),
        },
      });
    }

    // Send varsling til HMS-ansvarlige hvis skjemaet sendes inn (ikke kladd)
    if (status === "SUBMITTED" && form.requiresApproval) {
      await notifyUsersByRole(tenantId, "HMS", {
        type: "FORM_SUBMITTED",
        title: "Nytt skjema sendt inn",
        message: `${form.title} - venter på godkjenning`,
        link: `/dashboard/forms/submissions/${submission.id}`,
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

