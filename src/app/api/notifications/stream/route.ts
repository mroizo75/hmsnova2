import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createRedisSubscriber, subscribeToNotifications } from "@/lib/redis-pubsub";
import { prisma } from "@/lib/db";

/**
 * Real-time notification streaming via Server-Sent Events (SSE)
 * Bruker Redis pub/sub for å sende notifikasjoner instant når de opprettes
 * Ingen polling - kun events når det skjer endringer!
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const tenantId = session.user.tenantId
    ? (
        await prisma.userTenant.findUnique({
          where: {
            userId_tenantId: {
              userId: session.user.id,
              tenantId: session.user.tenantId,
            },
          },
          select: { tenantId: true },
        })
      )?.tenantId
    : (
        await prisma.userTenant.findFirst({
          where: { userId: session.user.id },
          select: { tenantId: true },
        })
      )?.tenantId;

  if (!tenantId) {
    return new Response("Forbidden", { status: 403 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();

  // Opprett Redis subscriber for denne SSE-tilkoblingen
  const subscriber = createRedisSubscriber();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", userId })}\n\n`)
      );

      let cleanup: (() => void) | null = null;

      if (subscriber) {
        // Subscribe til brukerens notification channel
        cleanup = await subscribeToNotifications(
          subscriber,
          userId,
          (notification) => {
            // Send notifikasjon til klienten via SSE
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(notification)}\n\n`)
              );
              console.log(`📤 [SSE] Sent notification to user ${userId}`);
            } catch (error) {
              console.error(`❌ [SSE] Failed to send notification:`, error);
            }
          },
          tenantId
        );
      } else {
        // Fallback: Redis ikke tilgjengelig
        console.warn(`⚠️ [SSE] Redis pub/sub not available for user ${userId}`);
      }

      // Send heartbeat hvert 30. sekund for å holde forbindelsen åpen
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch (error) {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup når klienten kobler fra
      request.signal.addEventListener("abort", () => {
        console.log(`🔌 [SSE] Client disconnected: ${userId}`);
        clearInterval(heartbeat);
        if (cleanup) cleanup();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

