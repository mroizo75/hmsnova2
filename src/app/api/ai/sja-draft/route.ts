import { NextResponse } from "next/server";

import {
  buildSjaAiPrompt,
  MAX_SJA_AI_IMAGE_BYTES,
  MAX_SJA_AI_IMAGES,
  parseSjaAiResponse,
  redactSjaBriefing,
  sjaAiInputSchema,
} from "@/features/sja/lib/sja-ai";
import {
  AiDisabledError,
  generateAIResponse,
  generateAIResponseWithVision,
} from "@/lib/ai";
import { prisma } from "@/lib/db";
import { validateFileSize, validateImageFile } from "@/lib/file-validation";
import { getIndustryLabel } from "@/lib/industry-packages";
import {
  checkRateLimitPolicy,
  createRateLimitResponse,
} from "@/lib/rate-limit";
import { getAuthContext } from "@/lib/server-authorization";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Ikke autorisert" },
        { status: 401 },
      );
    }
    if (!auth.permissions.canCreateSja) {
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Du har ikke tilgang til å opprette SJA" },
        { status: 403 },
      );
    }

    const rateLimit = await checkRateLimitPolicy({
      policy: "expensiveOperation",
      scope: "ai-sja-draft",
      identifiers: [auth.userId, auth.tenantId],
      failClosed: true,
    });
    if (!rateLimit.success) {
      return createRateLimitResponse(rateLimit);
    }

    const form = await request.formData();
    const input = sjaAiInputSchema.parse({
      briefing: form.get("briefing"),
      workLocation: form.get("workLocation") ?? "",
      weatherConditions: form.get("weatherConditions") ?? "",
      templateHint: form.get("templateHint") ?? "",
      electricalWorkType: form.get("electricalWorkType") ?? "NOT_APPLICABLE",
    });

    const imageFiles = form
      .getAll("images")
      .filter((value): value is File => value instanceof File && value.size > 0);
    if (imageFiles.length > MAX_SJA_AI_IMAGES) {
      return NextResponse.json(
        {
          code: "TOO_MANY_IMAGES",
          message: `Du kan analysere maksimalt ${MAX_SJA_AI_IMAGES} bilder om gangen`,
        },
        { status: 400 },
      );
    }

    const visionImages: Array<{ mime: string; base64: string }> = [];
    for (const image of imageFiles) {
      const size = validateFileSize(image.size, MAX_SJA_AI_IMAGE_BYTES / 1024 / 1024);
      if (!size.isValid) {
        return NextResponse.json(
          { code: "INVALID_IMAGE", message: size.error },
          { status: 400 },
        );
      }

      const buffer = Buffer.from(await image.arrayBuffer());
      const validation = await validateImageFile(buffer);
      if (!validation.isValid || !validation.detectedType) {
        return NextResponse.json(
          { code: "INVALID_IMAGE", message: validation.error || "Ugyldig bilde" },
          { status: 400 },
        );
      }
      visionImages.push({
        mime: validation.detectedType,
        base64: buffer.toString("base64"),
      });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: auth.tenantId },
      select: { industry: true },
    });
    const industry = getIndustryLabel(tenant?.industry || "other");
    const prompt = buildSjaAiPrompt({ ...input, industry });
    const options = {
      cacheScope: `tenant:${auth.tenantId}:sjaDraft`,
      rateLimitScope: `tenant:${auth.tenantId}`,
      budgetScope: `tenant:${auth.tenantId}`,
      tenantId: auth.tenantId,
      bypassCache: true,
      ragQuery: `SJA risikovurdering ${industry} ${redactSjaBriefing(input.briefing).slice(0, 300)}`,
    };
    const response =
      visionImages.length > 0
        ? await generateAIResponseWithVision(prompt, visionImages, "gpt-4o-mini", options)
        : await generateAIResponse(prompt, "gpt-4o-mini", options);
    const draft = parseSjaAiResponse(response, input.electricalWorkType);
    if (!draft) {
      return NextResponse.json(
        { code: "INVALID_AI_RESPONSE", message: "AI returnerte et ugyldig SJA-utkast" },
        { status: 422 },
      );
    }

    return NextResponse.json({ data: draft });
  } catch (error) {
    if (error instanceof AiDisabledError) {
      return NextResponse.json(
        { code: error.code, message: "Aktiver AI-tillegg for å generere SJA-utkast" },
        { status: 403 },
      );
    }

    const message = error instanceof Error ? error.message : "Kunne ikke generere SJA-utkast";
    return NextResponse.json(
      { code: "SJA_DRAFT_FAILED", message },
      { status: 400 },
    );
  }
}
