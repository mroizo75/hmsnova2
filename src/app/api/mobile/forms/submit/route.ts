import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateSequenceNumber, getFormSequenceType } from "@/lib/sequence";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const body = (await request.json()) as {
      formId?: string;
      values?: Record<string, string>;
    };

    if (!body.formId || typeof body.values !== "object" || body.values === null) {
      return NextResponse.json({ error: "Ugyldig skjemadata" }, { status: 400 });
    }

    const form = await prisma.formTemplate.findFirst({
      where: {
        id: body.formId,
        isActive: true,
        OR: [{ tenantId: session.user.tenantId }, { isGlobal: true, tenantId: null }],
      },
      include: { fields: true },
    });

    if (!form) {
      return NextResponse.json({ error: "Skjema ikke funnet" }, { status: 404 });
    }

    for (const field of form.fields) {
      if (field.fieldType === "SECTION_HEADER" || field.fieldType === "FILE" || field.fieldType === "SIGNATURE") {
        continue;
      }
      if (field.isRequired && !String(body.values[field.id] ?? "").trim()) {
        return NextResponse.json({ error: `${field.label} er påkrevd` }, { status: 400 });
      }
    }

    const sequenceType = getFormSequenceType(form.numberPrefix ?? null);
    const submissionNumber = await generateSequenceNumber(
      session.user.tenantId,
      sequenceType,
      new Date().getFullYear(),
    );

    const submission = await prisma.formSubmission.create({
      data: {
        formTemplateId: form.id,
        tenantId: session.user.tenantId,
        submissionNumber,
        submittedById: session.user.id,
        status: "SUBMITTED",
      },
    });

    for (const field of form.fields) {
      const value = body.values[field.id];
      if (value === undefined || value === null || String(value).trim().length === 0) {
        continue;
      }

      await prisma.formFieldValue.create({
        data: {
          submissionId: submission.id,
          fieldId: field.id,
          value: String(value),
        },
      });
    }

    return NextResponse.json({ success: true, submissionId: submission.id }, { status: 201 });
  } catch (error) {
    console.error("[Mobile Forms Submit] Error:", error);
    return NextResponse.json({ error: "Kunne ikke sende inn skjema" }, { status: 500 });
  }
}
