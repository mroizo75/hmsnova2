import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateSequenceNumber } from "@/lib/sequence";
import { AuditLog } from "@/lib/audit-log";
import { getStorage, generateFileKey } from "@/lib/storage";
import { createNotification, notifyUsersByRole } from "@/server/actions/notification.actions";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    // Hent data fra FormData
    const tenantId = formData.get("tenantId") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const type = formData.get("type") as string;
    const severityStr = formData.get("severity") as string;
    const severity = parseInt(severityStr, 10); // Konverter til number
    const location = formData.get("location") as string;
    const reportedBy = formData.get("reportedBy") as string;
    const date = formData.get("date") as string;
    const injuryType = formData.get("injuryType") as string | null;
    const medicalAttention = formData.get("medicalAttentionRequired") as string | null;
    const lostTime = formData.get("lostTimeMinutes") as string | null;
    const projectId = (formData.get("projectId") as string | null) || null;

    const avviksnummer = await generateSequenceNumber(
      tenantId,
      "AVVIK",
      new Date(date).getFullYear()
    );

    // Opprett avvik
    const incident = await prisma.incident.create({
      data: {
        tenantId,
        avviksnummer,
        title,
        description,
        type: type as any, // Prisma vil validere enum
        severity,
        location,
        occurredAt: new Date(date),
        reportedBy,
        status: "OPEN",
        stage: "REPORTED",
        injuryType,
        medicalAttentionRequired: medicalAttention === "yes",
        lostTimeMinutes: lostTime ? parseInt(lostTime, 10) : undefined,
        projectId,
      },
    });

    // Håndter bildeopplasting
    const images = formData.getAll("images") as File[];
    const storage = getStorage();

    for (const image of images) {
      if (image && image.size > 0) {
        // Last opp bilde til storage
        const fileKey = generateFileKey(tenantId, "incidents", image.name);
        await storage.upload(fileKey, image);

        // Opprett Attachment-record
        await prisma.attachment.create({
          data: {
            tenantId,
            incidentId: incident.id,
            fileKey,
            name: image.name,
            mime: image.type,
            size: image.size,
          },
        });
      }
    }

    // Audit log
    await AuditLog.log(
      tenantId,
      session.user.id,
      "INCIDENT_REPORTED",
      "Incident",
      incident.id,
      {
        title,
        type,
        severity,
        imageCount: images.filter((img) => img && img.size > 0).length,
      }
    );

    // Send bekreftelse til den ansatte som rapporterte
    await createNotification({
      tenantId,
      userId: session.user.id,
      type: "NEW_INCIDENT",
      title: "Avvik mottatt",
      message: `Takk for rapporten! Ditt avvik "${title}" er registrert og vil bli behandlet av HMS-ansvarlig.`,
      link: `/ansatt/avvik`,
    });

    // Send varsling til HMS-ansvarlige
    await notifyUsersByRole(tenantId, "HMS", {
      type: "NEW_INCIDENT",
      title: "Nytt avvik rapportert av ansatt",
      message: `${type}: ${title} - Rapportert av ${reportedBy}`,
      link: `/dashboard/incidents/${incident.id}`,
    });

    return NextResponse.json({ success: true, incident }, { status: 201 });
  } catch (error: any) {
    console.error("Report incident error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

