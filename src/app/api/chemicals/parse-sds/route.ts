import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { parseSDSFile } from "@/lib/sds-parser";

/**
 * API for AI-parsing av sikkerhetsdatablad
 * POST /api/chemicals/parse-sds
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { tenants: true },
    });
    const tenantId = (session as any).activeTenantId ?? user?.tenants[0]?.tenantId;

    const { sdsKey } = await req.json();

    if (!sdsKey) {
      return NextResponse.json({ error: "sdsKey er påkrevd" }, { status: 400 });
    }

    // Hent fil fra storage
    const storage = getStorage();
    const fileBuffer = await storage.get(sdsKey);

    if (!fileBuffer) {
      return NextResponse.json({ error: "Fil ikke funnet" }, { status: 404 });
    }

    // Parse med AI
    const extractedData = await parseSDSFile(fileBuffer, tenantId);

    // Forbered data for frontend
    const responseData = {
      productName: extractedData.productName,
      supplier: extractedData.supplier,
      casNumber: extractedData.casNumber || extractedData.casNumbers?.[0],
      // H-setninger - hvis streng bruk direkte, hvis array join dem
      hazardStatements: typeof extractedData.hazardStatements === 'string'
        ? extractedData.hazardStatements
        : extractedData.hazardStatements?.join(", "),
      // AI returnerer allerede riktige filnavn
      warningPictograms: extractedData.warningPictograms 
        ? JSON.stringify(extractedData.warningPictograms)
        : undefined,
      requiredPPE: extractedData.requiredPPE
        ? JSON.stringify(extractedData.requiredPPE)
        : undefined,
      containsIsocyanates: extractedData.containsIsocyanates,
      isocyanateDetails: extractedData.isocyanateDetails,
      confidence: extractedData.confidence,
      sdsKey,
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error("Parse SDS API error:", error);
    return NextResponse.json(
      { error: error.message || "Kunne ikke parse sikkerhetsdatablad" },
      { status: 500 }
    );
  }
}
