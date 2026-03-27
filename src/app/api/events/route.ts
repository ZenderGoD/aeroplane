import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Events SSE requires Redis pub/sub — return empty JSON when not configured
  if (!process.env.REDIS_URL) {
    return NextResponse.json({ events: [], message: "Redis not configured" });
  }

  const { createSubscriber, CHANNELS } = await import("@/lib/redis");
  let getRecentEvents: ((n: number) => Promise<Array<Record<string, unknown>>>) | null = null;
  try {
    const db = await import("@/lib/db/queries");
    getRecentEvents = db.getRecentEvents;
  } catch {
    // DB not configured
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send recent events first (backfill)
      if (getRecentEvents) {
        try {
          const recent = await getRecentEvents(20);
          for (const event of recent.reverse()) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            );
          }
        } catch {
          // DB not available
        }
      }

      // Subscribe to Redis for live events
      const subscriber = createSubscriber();
      let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

      if (subscriber) {
        try {
          await subscriber.subscribe(CHANNELS.flightEvents);
          subscriber.on("message", (_channel: string, message: string) => {
            try { controller.enqueue(encoder.encode(`data: ${message}\n\n`)); } catch { /* closed */ }
          });
        } catch {
          // Redis subscription failed
        }
      }

      heartbeatInterval = setInterval(() => {
        try { controller.enqueue(encoder.encode(": heartbeat\n\n")); } catch { /* closed */ }
      }, 30_000);

      const cleanup = () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (subscriber) {
          subscriber.unsubscribe().catch(() => {});
          subscriber.quit().catch(() => {});
        }
      };
      (controller as unknown as Record<string, unknown>).__cleanup = cleanup;
    },
    cancel(controller) {
      const cleanup = (controller as unknown as Record<string, unknown>).__cleanup as (() => void) | undefined;
      if (cleanup) cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
