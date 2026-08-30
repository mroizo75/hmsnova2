import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { getStorage } from "@/lib/storage";
import { canAccessPersonnelFile } from "@/features/personnel/lib/personnel-categories";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ code: "UNAUTHORIZED", message: "Ikke autorisert" }, { status: 401 });
    }

    const document = await prisma.personnelDocument.findFirst({
      where: { id, tenantId: auth.tenantId },
    });
    if (!document) {
      return NextResponse.json({ code: "NOT_FOUND", message: "Dokumentet ble ikke funnet" }, { status: 404 });
    }

    const allowed = canAccessPersonnelFile({
      viewerId: auth.userId,
      employeeId: document.userId,
      canReadOwn: auth.permissions.canReadOwnPersonnelFile,
      canReadAll: auth.permissions.canReadAllPersonnelFiles,
    });
    if (!allowed) {
      return NextResponse.json({ code: "FORBIDDEN", message: "Du har ikke tilgang til dette dokumentet" }, { status: 403 });
    }

    const storage = getStorage();
    const signedUrl = await storage.getUrl(document.fileKey, 3600);
    return NextResponse.redirect(signedUrl);
  } catch {
    return NextResponse.json(
      { code: "INTERNAL", message: "Kunne ikke laste ned dokument" },
      { status: 500 },
    );
  }
}
