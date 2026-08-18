import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { buildAdvisorContext } from "@/features/hms-ai/lib/advisor-context"
import { generateAIResponse } from "@/lib/ai"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  })
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tenantId =
    (session as any).activeTenantId ?? user.tenants[0]?.tenantId
  if (!tenantId) {
    return NextResponse.json({ error: "Ingen bedrift valgt" }, { status: 400 })
  }

  const body = await req.json()
  const userMessage = body.message?.trim()
  if (!userMessage || typeof userMessage !== "string") {
    return NextResponse.json({ error: "Melding mangler" }, { status: 400 })
  }

  try {
    // Bygg kompakt kontekst fra pre-beregnet data (~2000 tokens)
    const context = await buildAdvisorContext(tenantId)

    const prompt = `Du er en norsk HMS-rådgiver. Du har følgende bedriftsdata:

${context}

Brukerspørsmål: ${userMessage}

Svar kort, konkret og handlingsorientert. Henvis til relevant lov/forskrift.`

    const reply = await generateAIResponse(prompt, "gpt-4o-mini", {
      cacheScope: `advisor:${tenantId}`,
      rateLimitScope: `advisor:${tenantId}`,
    })

    return NextResponse.json({ reply })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Kunne ikke generere svar" },
      { status: 500 },
    )
  }
}
