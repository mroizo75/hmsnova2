import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAccountingProvider } from "@/lib/accounting/factory";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ externalId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { externalId } = await params;
  const provider = await getAccountingProvider(session.user.tenantId);
  if (!provider) return new NextResponse(null, { status: 404 });
  const image = await provider.getProductImage(externalId).catch(() => null);
  if (!image) return new NextResponse(null, { status: 404 });
  return new NextResponse(image.bytes, {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
