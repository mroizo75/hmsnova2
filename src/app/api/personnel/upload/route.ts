import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { generatePersonnelFileKey, getStorage } from "@/lib/storage";
import { validateDocumentFile, validateFileSize } from "@/lib/file-validation";
import { PersonnelCategorySchema } from "@/features/personnel/schemas/personnel.schema";
import { PERSONNEL_CATEGORY_LEGAL } from "@/features/personnel/lib/personnel-categories";
import type { PersonnelDocumentCategory } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ code: "UNAUTHORIZED", message: "Ikke autorisert" }, { status: 401 });
    }
    if (!auth.permissions.canUploadPersonnelFile) {
      return NextResponse.json({ code: "FORBIDDEN", message: "Du har ikke tilgang til å laste opp til personalarkivet" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const userId = String(formData.get("userId") ?? "");
    const title = String(formData.get("title") ?? "").trim();
    const categoryResult = PersonnelCategorySchema.safeParse(formData.get("category"));
    const notesRaw = formData.get("notes");
    const retainUntilRaw = formData.get("retainUntil");
    const legalRefRaw = formData.get("legalRef");

    if (!userId) {
      return NextResponse.json({ code: "VALIDATION", message: "Ansatt er påkrevd" }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ code: "VALIDATION", message: "Tittel er påkrevd" }, { status: 400 });
    }
    if (!categoryResult.success) {
      return NextResponse.json({ code: "VALIDATION", message: "Ugyldig dokumentkategori" }, { status: 400 });
    }
    if (!file || typeof file === "string") {
      return NextResponse.json({ code: "VALIDATION", message: "Ingen fil lastet opp" }, { status: 400 });
    }

    const membership = await prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId, tenantId: auth.tenantId } },
    });
    if (!membership) {
      return NextResponse.json({ code: "NOT_FOUND", message: "Ansatt ikke funnet i denne bedriften" }, { status: 404 });
    }

    const sizeValidation = validateFileSize(file.size, 10);
    if (!sizeValidation.isValid) {
      return NextResponse.json({ code: "VALIDATION", message: sizeValidation.error }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileValidation = await validateDocumentFile(fileBuffer);
    if (!fileValidation.isValid) {
      return NextResponse.json({ code: "VALIDATION", message: fileValidation.error }, { status: 400 });
    }

    const category = categoryResult.data as PersonnelDocumentCategory;
    const mime = fileValidation.detectedType || file.type || "application/pdf";
    const fileName = file.name || "dokument.pdf";
    const fileKey = generatePersonnelFileKey(auth.tenantId, userId, category, fileName);

    const retainUntil =
      typeof retainUntilRaw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(retainUntilRaw)
        ? new Date(retainUntilRaw)
        : null;
    const notes = typeof notesRaw === "string" && notesRaw.trim() ? notesRaw.trim() : null;
    const legalRef =
      typeof legalRefRaw === "string" && legalRefRaw.trim()
        ? legalRefRaw.trim()
        : PERSONNEL_CATEGORY_LEGAL[category];

    const storage = getStorage();
    await storage.upload(fileKey, new Blob([fileBuffer], { type: mime }));

    const document = await prisma.personnelDocument.create({
      data: {
        tenantId: auth.tenantId,
        userId,
        category,
        title,
        fileKey,
        fileName,
        mime,
        fileSize: fileBuffer.length,
        legalRef,
        retainUntil,
        notes,
        uploadedById: auth.userId,
      },
    });

    return NextResponse.json({ success: true, id: document.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { code: "INTERNAL", message: "Kunne ikke laste opp fil" },
      { status: 500 },
    );
  }
}
