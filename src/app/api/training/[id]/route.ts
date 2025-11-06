import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Ikke autorisert" },
        { status: 401 }
      );
    }

    const training = await prisma.training.findUnique({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!training) {
      return NextResponse.json(
        { error: "Opplæring ikke funnet" },
        { status: 404 }
      );
    }

    return NextResponse.json(training);
  } catch (error) {
    console.error("Get training error:", error);
    return NextResponse.json(
      { error: "Kunne ikke hente opplæring" },
      { status: 500 }
    );
  }
}

