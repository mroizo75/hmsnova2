import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const courseTemplateSchema = z.object({
  courseKey: z.string().min(1, "Kurskode er påkrevd"),
  title: z.string().min(1, "Kurstittel er påkrevd"),
  description: z.string().nullable().optional(),
  provider: z.string().nullable().optional(),
  isRequired: z.boolean().default(false),
  validityYears: z.preprocess(
    (val) => (val === null || val === undefined || val === "" || val === 0) ? null : Number(val),
    z.number().int().min(1).max(10).nullable(),
  ),
});

const updateCourseTemplateSchema = courseTemplateSchema.extend({
  id: z.string(),
});

// CREATE - Opprett ny kursmal
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const body = await request.json();
    const data = courseTemplateSchema.parse(body);

    // Sjekk om courseKey allerede eksisterer for denne tenanten
    const existing = await prisma.courseTemplate.findUnique({
      where: {
        tenantId_courseKey: {
          tenantId: session.user.tenantId,
          courseKey: data.courseKey,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "En kursmal med denne kurskoden eksisterer allerede" },
        { status: 400 }
      );
    }

    const courseTemplate = await prisma.courseTemplate.create({
      data: {
        ...data,
        tenantId: session.user.tenantId,
        isGlobal: false,
        isActive: true,
      },
    });

    return NextResponse.json(courseTemplate, { status: 201 });
  } catch (error) {
    console.error("Create course template error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Ugyldig input", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Kunne ikke opprette kursmal" },
      { status: 500 }
    );
  }
}

// UPDATE - Oppdater kursmal
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const body = await request.json();
    const data = updateCourseTemplateSchema.parse(body);

    // Sjekk at kursmalen tilhører tenanten
    const existing = await prisma.courseTemplate.findUnique({
      where: { id: data.id },
    });

    if (!existing || existing.tenantId !== session.user.tenantId) {
      return NextResponse.json(
        { error: "Kursmal ikke funnet" },
        { status: 404 }
      );
    }

    const courseTemplate = await prisma.courseTemplate.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        provider: data.provider,
        isRequired: data.isRequired,
        validityYears: data.validityYears,
      },
    });

    return NextResponse.json(courseTemplate);
  } catch (error) {
    console.error("Update course template error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Ugyldig input", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Kunne ikke oppdatere kursmal" },
      { status: 500 }
    );
  }
}

// DELETE - Slett kursmal
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID mangler" }, { status: 400 });
    }

    // Sjekk at kursmalen tilhører tenanten
    const existing = await prisma.courseTemplate.findUnique({
      where: { id },
    });

    if (!existing || existing.tenantId !== session.user.tenantId) {
      return NextResponse.json(
        { error: "Kursmal ikke funnet" },
        { status: 404 }
      );
    }

    // Soft delete - marker som inaktiv
    await prisma.courseTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete course template error:", error);
    return NextResponse.json(
      { error: "Kunne ikke slette kursmal" },
      { status: 500 }
    );
  }
}
