import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { events, pressure, corridors, predictability, baselines, turnarounds, flightStats } = body;

    const systemPrompt = `You are an aviation operations intelligence analyst. Generate a concise airspace situation briefing from real-time data. Structure your response with EXACTLY these 4 sections separated by "---":

SUMMARY
(2-3 sentence executive overview of the entire airspace situation)
---
HOTSPOTS
(Which airports need attention and why. List the top 2-3 problem areas with specifics.)
---
CORRIDORS
(Corridor health narrative. Highlight any degrading or disrupted corridors.)
---
OUTLOOK
(Brief projected trajectory. What should operators watch for in the next 30-60 minutes?)

Be data-driven. Reference actual numbers. Use a professional, crisp tone. Keep the total under 300 words.`;

    const eventSummary = events?.length > 0
      ? events.slice(0, 15).map((e: { severity: string; eventType: string; message: string; airportIcao?: string }) =>
          `[${e.severity}] ${e.airportIcao || "N/A"}: ${e.message}`
        ).join("\n")
      : "No active events";

    const pressureSummary = pressure?.length > 0
      ? pressure.slice(0, 10).map((p: { airportIcao: string; airportName: string; pressureScore: number; components: { inboundCount: number; outboundCount: number; holdingCount: number; goAroundCount: number } }) =>
          `${p.airportIcao} (${p.airportName}): P=${Math.round(p.pressureScore)}, IN=${p.components.inboundCount}, OUT=${p.components.outboundCount}, HLD=${p.components.holdingCount}, G/A=${p.components.goAroundCount}`
        ).join("\n")
      : "No pressure data";

    const corridorSummary = corridors?.length > 0
      ? corridors.map((c: { corridorName: string; healthScore: number; status: string; flightCount: number }) =>
          `${c.corridorName}: H=${Math.round(c.healthScore)}, Status=${c.status}, Flights=${c.flightCount}`
        ).join("\n")
      : "No corridor data";

    const predSummary = predictability?.length > 0
      ? predictability.map((p: { corridorId: string; predictabilityScore: number; trendLabel: string }) =>
          `${p.corridorId}: Pred=${Math.round(p.predictabilityScore)}, Trend=${p.trendLabel}`
        ).join("; ")
      : "";

    const baselineSummary = baselines?.length > 0
      ? `${baselines.length} airports baselined`
      : "No baseline data";

    const turnaroundSummary = turnarounds
      ? `Active on ground: ${turnarounds.activeCount}, Recent: ${turnarounds.recentCount}${turnarounds.avgMinutes ? `, Avg: ${Math.round(turnarounds.avgMinutes)}min` : ""}`
      : "No turnaround data";

    const userMessage = `AIRSPACE DATA SNAPSHOT:

Flights: ${flightStats?.total || 0} total (${flightStats?.airborne || 0} airborne, ${flightStats?.onGround || 0} ground), ${flightStats?.anomalyCount || 0} anomalies

EVENTS:
${eventSummary}

AIRPORT PRESSURE:
${pressureSummary}

CORRIDORS:
${corridorSummary}
${predSummary ? `\nPREDICTABILITY: ${predSummary}` : ""}

BASELINES: ${baselineSummary}

TURNAROUNDS: ${turnaroundSummary}`;

    const text = await callOpenRouter(systemPrompt, userMessage, 600, "Flight Tracker - Briefing");

    // Parse sections
    const sections = text.split("---").map((s: string) => s.trim());
    const briefing = {
      summary: sections[0]?.replace(/^SUMMARY\s*/i, "").trim() || text,
      hotspots: sections[1]?.replace(/^HOTSPOTS\s*/i, "").trim() || "",
      corridors: sections[2]?.replace(/^CORRIDORS\s*/i, "").trim() || "",
      outlook: sections[3]?.replace(/^OUTLOOK\s*/i, "").trim() || "",
      generatedAt: Date.now(),
    };

    return NextResponse.json({ briefing });
  } catch (error) {
    console.error("Briefing error:", error);
    return NextResponse.json(
      { error: "Failed to generate briefing" },
      { status: error instanceof Error && error.message.includes("not configured") ? 500 : 502 }
    );
  }
}
