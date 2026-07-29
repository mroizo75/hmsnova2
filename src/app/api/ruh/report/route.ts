import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateSequenceNumber } from "@/lib/sequence";
import { AuditLog } from "@/lib/audit-log";
import { getStorage, generateFileKey } from "@/lib/storage";
import { createNotification, notifyUsersByRole } from "@/server/actions/notification.actions";
import { RuhCategory } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    const tenantId = session.user.tenantId ?? (
      await prisma.userTenant.findFirst({
        where: { userId: session.user.id },
        select: { tenantId: true },
      })
    )?.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Ingen tenant tilgang" }, { status: 403 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { ruhModuleEnabled: true },
    });
    if (tenant && !tenant.ruhModuleEnabled) {
      return NextResponse.json(
        { error: "RUH er ikke i bruk i denne virksomheten. Registrer hendelsen som avvik." },
        { status: 403 }
      );
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const category = formData.get("category") as RuhCategory;
    const location = formData.get("location") as string;
    const reportedBy = formData.get("reportedBy") as string;
    const date = formData.get("date") as string;
    const involvedPersons = formData.get("involvedPersons") as string | null;
    const witnessName = formData.get("witnessName") as string | null;
    const injuryOccurred = formData.get("injuryOccurred") === "true";
    const injuryDescription = formData.get("injuryDescription") as string | null;
    const immediateAction = formData.get("immediateAction") as string | null;
    const suggestedActions = formData.get("suggestedActions") as string | null;
    const ruhContext = formData.get("ruhContext") as string | null;
    const contextDetails = (formData.get("contextDetails") as string | null)?.trim() || null;
    const enrichedDescription = contextDetails
      ? `${description}\n\nKontekstnotat: ${contextDetails}`
      : description;

    const ruhNummer = await generateSequenceNumber(
      tenantId,
      "RUH",
      new Date(date).getFullYear()
    );

    const report = await prisma.ruhReport.create({
      data: {
        tenantId,
        ruhNummer,
        title,
        description: enrichedDescription,
        category,
        location,
        occurredAt: new Date(date),
        reportedBy,
        reportedById: session.user.id,
        involvedPersons,
        witnessName,
        injuryOccurred,
        injuryDescription: injuryOccurred ? injuryDescription : null,
        immediateAction,
        suggestedActions: ruhContext ? [suggestedActions, `Kontekst: ${ruhContext}`].filter(Boolean).join("\n") : suggestedActions,
        status: "SUBMITTED",
      },
    });

    const images = formData.getAll("images") as File[];
    const storage = getStorage();

    for (const image of images) {
      if (image && image.size > 0) {
        const fileKey = generateFileKey(tenantId, "ruh", image.name);
        await storage.upload(fileKey, image);

        await prisma.attachment.create({
          data: {
            tenantId,
            ruhReportId: report.id,
            fileKey,
            name: image.name,
            mime: image.type,
            size: image.size,
          },
        });
      }
    }

    await AuditLog.log(
      tenantId,
      session.user.id,
      "RUH_REPORTED",
      "RuhReport",
      report.id,
      {
        title,
        category,
        imageCount: images.filter((img) => img && img.size > 0).length,
      }
    );

    await createNotification({
      tenantId,
      userId: session.user.id,
      type: "NEW_INCIDENT",
      title: "RUH-rapport mottatt",
      message: `Takk for rapporten! Din RUH "${title}" er registrert og vil bli behandlet av HMS-ansvarlig.`,
      link: `/ansatt/ruh`,
    });

    await notifyUsersByRole(tenantId, "HMS", {
      type: "NEW_INCIDENT",
      title: "Ny RUH-rapport innsendt",
      message: `${category}: ${title} - Rapportert av ${reportedBy}`,
      link: `/dashboard/ruh/${report.id}`,
    });

    return NextResponse.json({ success: true, report }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
