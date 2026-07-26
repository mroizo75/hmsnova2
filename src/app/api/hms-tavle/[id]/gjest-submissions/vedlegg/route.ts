import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { getStorage } from "@/lib/storage";
import { parseGuestAttachments } from "@/features/hms-tavle/lib/gjesteservice-config";

/**
 * GET /api/hms-tavle/[id]/gjest-submissions/vedlegg?submissionId=...&key=...
 *
 * Gjestens vedlegg er sensitive og skal ALDRI være offentlig tilgjengelige.
 * Ruten krever innlogging, tavle-tilgang i egen tenant, og at nøkkelen faktisk
 * tilhører den aktuelle innsendingen. Returnerer en kortvarig signert URL.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return new NextResponse("Ikke autentisert", { status: 401 });
    }

    const perms = getPermissions(session.user.role);
    if (!perms.canViewHmsTavle && !perms.canManageHmsTavle) {
      return new NextResponse("Ingen tilgang", { status: 403 });
    }

    const { id } = await params;
    const searchParams = new URL(req.url).searchParams;
    const submissionId = searchParams.get("submissionId");
    const key = searchParams.get("key");

    if (!submissionId || !key) {
      return new NextResponse("Mangler parametere", { status: 400 });
    }

    const submission = await prisma.tavleGuestSubmission.findFirst({
      where: { id: submissionId, tavleId: id },
      select: {
        attachments: true,
        tavle: { select: { tenantId: true } },
      },
    });

    if (!submission || submission.tavle.tenantId !== session.user.tenantId) {
      return new NextResponse("Ikke funnet", { status: 404 });
    }

    const tilhorerSaken = parseGuestAttachments(submission.attachments).some(
      (attachment) => attachment.key === key
    );
    if (!tilhorerSaken) {
      return new NextResponse("Ikke funnet", { status: 404 });
    }

    const signedUrl = await getStorage().getUrl(key, 300);
    return NextResponse.redirect(signedUrl, { status: 307 });
  } catch {
    return new NextResponse("Vedlegget ble ikke funnet", { status: 404 });
  }
}
