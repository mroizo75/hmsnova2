import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const tenantId = session.user.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 400 });
  }

  const body = await request.json();

  await prisma.incident.update({
    where: { id, tenantId },
    data: {
      reportedToAuthorityAt: new Date(),
      reportedToAuthorityBy: user.id,
      reportedToAuthorityNote: body.note || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: user.id,
      action: "INCIDENT_REPORTED_TO_AUTHORITY",
      resource: `Incident:${id}`,
      metadata: JSON.stringify({ note: body.note }),
    },
  });

  return NextResponse.json({ success: true });
}
