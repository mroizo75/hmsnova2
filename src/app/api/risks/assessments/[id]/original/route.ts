import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const { id } = await context.params;
  const assessment = await prisma.riskAssessment.findFirst({
    where: { id, tenantId: session.user.tenantId },
    select: { importSourceFileKey: true },
  });
  const key = assessment?.importSourceFileKey;
  const requiredPrefix = `${session.user.tenantId}/risk-assessments/imports/`;
  if (!key || !key.startsWith(requiredPrefix)) {
    return NextResponse.json({ error: "Originalfil ikke funnet" }, { status: 404 });
  }

  const url = await getStorage().getUrl(key, 300);
  return NextResponse.redirect(url);
}
