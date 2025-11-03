import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorage, generateFileKey } from "@/lib/storage";

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

    const values = JSON.parse(valuesJson);
    const storage = getStorage();

    // Hent skjemaet for å få feltene
    const form = await prisma.formTemplate.findUnique({
      where: { id: formId },
      include: { fields: true },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Opprett submission
    const submission = await prisma.formSubmission.create({
      data: {
        formTemplateId: formId,
        tenantId,
        submittedById: userId,
        status: status as "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED",
        signedAt: signature ? new Date() : null,
        metadata: signature ? JSON.stringify({ signatureData: signature }) : null,
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

    return NextResponse.json({ success: true, submission }, { status: 201 });
  } catch (error: any) {
    console.error("Submit form error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

