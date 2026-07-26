import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createErrorResponse, createSuccessResponse, handleApiError, ErrorCodes } from "@/lib/validations/api";
import { z } from "zod";
import { SubcontractorSubmissionType } from "@prisma/client";

const submitSchema = z.object({
  type: z.nativeEnum(SubcontractorSubmissionType),
  submitterName: z.string().min(2),
  company: z.string().optional(),
  submitterEmail: z.string().email().optional().or(z.literal("")),
  title: z.string().min(2),
  description: z.string().min(10),
  attachmentUrls: z.array(z.string().url()).optional().default([]),
  data: z.record(z.string(), z.any()).optional().default({}),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ portalToken: string }> }
) {
  try {
    const { portalToken } = await params;
    const portal = await prisma.subcontractorPortal.findUnique({
      where: { portalToken },
      include: { tavle: { select: { tenantId: true, isPublic: true } } },
    });

    if (!portal || !portal.tavle.isPublic) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, "Portal ikke funnet", 404);
    }

    const body = await req.json();
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) return createErrorResponse(ErrorCodes.VALIDATION_ERROR, parsed.error.issues[0].message, 400);

    const { type } = parsed.data;
    if (type === "AVVIK" && !portal.allowAvvik) return createErrorResponse(ErrorCodes.FORBIDDEN, "Avvik-innsending ikke tillatt", 403);
    if (type === "RUH" && !portal.allowRuh) return createErrorResponse(ErrorCodes.FORBIDDEN, "RUH-innsending ikke tillatt", 403);
    if (type === "SJA" && !portal.allowSja) return createErrorResponse(ErrorCodes.FORBIDDEN, "SJA-innsending ikke tillatt", 403);
    if (type === "PDF_RAPPORT" && !portal.allowPdfUpload) return createErrorResponse(ErrorCodes.FORBIDDEN, "PDF-opplasting ikke tillatt", 403);

    const submission = await prisma.subcontractorSubmission.create({
      data: {
        portalId: portal.id,
        tenantId: portal.tavle.tenantId,
        type,
        submitterName: parsed.data.submitterName,
        company: parsed.data.company,
        submitterEmail: parsed.data.submitterEmail || null,
        attachmentUrls: parsed.data.attachmentUrls as any,
        data: ({
          title: parsed.data.title,
          description: parsed.data.description,
          ...(parsed.data.data ?? {}),
        }) as any,
        status: portal.autoApprove ? "LINKED" : "PENDING",
      },
    });

    return createSuccessResponse({ id: submission.id }, "Innsending mottatt", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
