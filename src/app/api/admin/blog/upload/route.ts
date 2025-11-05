import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStorage, generateFileKey } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Ingen fil lastet opp" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Ugyldig filtype. Kun JPEG, PNG, WebP og GIF er tillatt." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Filen er for stor. Maksimal størrelse er 5MB." },
        { status: 400 }
      );
    }

    // Upload to R2
    const storage = getStorage();
    const key = generateFileKey("blog", "images", file.name);
    await storage.upload(key, file);

    // Get public URL
    const url = await storage.getUrl(key, 31536000); // 1 year expiry

    return NextResponse.json({
      url,
      key,
      success: true,
    });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json(
      { error: "Bildeopplasting feilet" },
      { status: 500 }
    );
  }
}
