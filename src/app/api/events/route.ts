import { createSubscriber, CHANNELS } from "@/lib/redis";
import { getRecentEvents } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send recent events first (backfill)
      try {
        const recent = await getRecentEvents(20);
        for (const event of recent.reverse()) {
          const data = {
            eventType: event.event_type,
            severity: event.severity,
            airportIcao: event.airport_icao,
            corridorId: event.corridor_id,
            affectedFlights: event.affected_flights,
            message: event.message,
            metadata: event.metadata,
            detectedAt: new Date(event.detected_at).getTime(),
            resolvedAt: event.resolved_at
              ? new Date(event.resolved_at).getTime()
              : null,
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        }
      } catch {
        // Supabase might not be set up yet
      }

      // Subscribe to Redis for live events
      let subscriber: ReturnType<typeof createSubscriber> | null = null;
      let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

      try {
        subscriber = createSubscriber();
        await subscriber.subscribe(CHANNELS.flightEvents);

        subscriber.on("message", (_channel: string, message: string) => {
          try {
            controller.enqueue(encoder.encode(`data: ${message}\n\n`));
          } catch {
            // Stream might be closed
          }
        });

        // Heartbeat every 30s
        heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch {
            // Stream might be closed
          }
        }, 30_000);
      } catch (err) {
        console.error("[SSE] Redis subscription failed:", err);
        // Still keep the stream alive for heartbeats
        heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch {
            // Stream closed
          }
        }, 30_000);
      }

      // Cleanup function — called when client disconnects
      const cleanup = () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (subscriber) {
          subscriber.unsubscribe().catch(() => {});
          subscriber.quit().catch(() => {});
        }
      };

      // Store cleanup for cancel signal
      (controller as unknown as Record<string, unknown>).__cleanup = cleanup;
    },

    cancel(controller) {
      const cleanup = (controller as unknown as Record<string, unknown>)
        .__cleanup as (() => void) | undefined;
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
