/**
 * Background intelligence worker.
 * Polls OpenSky, stores data, computes analytics.
 *
 * Run: npm run worker:dev
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { pollOpenSky } from "./poller";
import { HistoryCollector } from "./processors/historyCollector";
import { PressureCalculator } from "./processors/pressureCalculator";
import { TurnaroundTracker } from "./processors/turnaroundTracker";
import { BaselineAggregator } from "./processors/baselineAggregator";
import { EventDetector } from "./processors/eventDetector";
import { CorridorHealthProcessor } from "./processors/corridorHealth";
import { CorridorPredictabilityProcessor } from "./processors/corridorPredictability";
import { redis, ensureRedisConnected, KEYS } from "../src/lib/redis";
import type { Processor } from "./processors/base";

const POLL_INTERVAL = 15_000; // 15 seconds

async function main() {
  console.log("┌──────────────────────────────────────────────┐");
  console.log("│  Aviation Intelligence Worker                │");
  console.log("│  Polling every 15s, processing 7 modules     │");
  console.log("└──────────────────────────────────────────────┘");

  // Connect Redis
  try {
    await ensureRedisConnected();
    console.log("[Worker] Redis connected");
  } catch (err) {
    console.error("[Worker] Redis connection failed:", err);
    console.log("[Worker] Continuing without Redis caching...");
  }

  // Initialize processors
  const processors: Processor[] = [
    new HistoryCollector(),
    new PressureCalculator(),
    new TurnaroundTracker(),
    new BaselineAggregator(),
    new EventDetector(),
    new CorridorHealthProcessor(),
    new CorridorPredictabilityProcessor(),
  ];

  console.log(
    `[Worker] Processors: ${processors.map((p) => p.name).join(", ")}`
  );

  let tickCount = 0;
  const startTime = Date.now();

  async function tick() {
    tickCount++;
    const tickStart = Date.now();

    try {
      // Heartbeat
      if (redis.status === "ready") {
        await redis.set(KEYS.workerHeartbeat, Date.now().toString(), "EX", 60);
      }

      // Poll OpenSky
      const flights = await pollOpenSky();

      if (flights.length > 0) {
        // Run all processors in parallel
        const results = await Promise.allSettled(
          processors.map((p) => p.process(flights, tickCount))
        );

        // Log any processor failures
        results.forEach((result, i) => {
          if (result.status === "rejected") {
            console.error(
              `[Worker] ${processors[i].name} failed:`,
              result.reason
            );
          }
        });
      }

      const elapsed = Date.now() - tickStart;
      const uptime = Math.floor((Date.now() - startTime) / 1000);
      console.log(
        `[Worker] Tick #${tickCount}: ${flights.length} flights, ${elapsed}ms (uptime: ${uptime}s)`
      );
    } catch (err) {
      console.error("[Worker] Tick error:", err);
    }

    // Schedule next tick
    const elapsed = Date.now() - tickStart;
    const delay = Math.max(1000, POLL_INTERVAL - elapsed);
    setTimeout(tick, delay);
  }

  // Start first tick
  tick();

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n[Worker] Shutting down...");
    try {
      if (redis.status === "ready") await redis.quit();
    } catch {
      // ignore
    }
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\n[Worker] Terminated");
    try {
      if (redis.status === "ready") await redis.quit();
    } catch {
      // ignore
    }
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[Worker] Fatal error:", err);
  process.exit(1);
});
