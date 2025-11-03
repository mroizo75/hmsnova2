import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStorage, generateFileKey } from "@/lib/storage";

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    // Hent data fra FormData
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string | null;
    const address = formData.get("address") as string | null;
    const postalCode = formData.get("postalCode") as string | null;
    const city = formData.get("city") as string | null;
    const avatarFile = formData.get("avatar") as File | null;

    // Håndter avatar-opplasting
    let imageUrl = undefined;
    if (avatarFile && avatarFile.size > 0) {
      const storage = getStorage();
      const fileKey = generateFileKey(
        session.user.tenantId || "system",
        "avatars",
        avatarFile.name
      );
      await storage.upload(fileKey, avatarFile);
      imageUrl = fileKey;
    }

    // Oppdater bruker
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        phone: phone || null,
        address: address || null,
        postalCode: postalCode || null,
        city: city || null,
        ...(imageUrl && { image: imageUrl }),
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

