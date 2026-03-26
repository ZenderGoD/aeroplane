import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { airport, events, turnarounds, corridors } = body;

    const systemPrompt = `You are an airport operations analyst. Given real-time airport data, provide a deep intelligence report. Structure your response with EXACTLY these 4 sections separated by "---":

SITUATION
(2-3 sentences on current operational state — congestion level, notable activity)
---
BASELINE
(1-2 sentences comparing current traffic to historical averages for this time period)
---
WEATHER IMPACT
(1-2 sentences on how current weather is affecting or could affect operations)
---
OUTLOOK
(1-2 sentences on what to expect in the next 30-60 minutes)

Also include a risk assessment on the FIRST line before SITUATION as one of: [NORMAL] [ELEVATED] [HIGH] [CRITICAL]

Be specific with numbers. Keep total under 200 words.`;

    const p = airport.pressure;
    const b = airport.baseline;
    const w = airport.weather;

    const userMessage = `AIRPORT: ${airport.icao} (${airport.name})

PRESSURE: Score=${Math.round(p.pressureScore)}/100
- Inbound: ${p.components.inboundCount}, Outbound: ${p.components.outboundCount}
- Ground: ${p.components.groundCount}, Holding: ${p.components.holdingCount}
- Go-arounds: ${p.components.goAroundCount}

${b ? `BASELINE (this hour):
- Avg arrivals: ${b.avgArrivals?.toFixed(1)}, Current: ${p.components.inboundCount}
- Avg departures: ${b.avgDepartures?.toFixed(1)}, Current: ${p.components.outboundCount}
- Avg pressure: ${b.avgPressure?.toFixed(1)}, Current: ${Math.round(p.pressureScore)}
- Samples: ${b.sampleCount}` : "No baseline data available"}

${w ? `WEATHER at ${w.station}:
- Category: ${w.flightCategory}
- Conditions: ${w.conditions?.join(", ") || "Clear"}
- Wind: ${w.windDirection}° at ${w.windSpeed} kts${w.windGust ? `, gusts ${w.windGust} kts` : ""}
- Visibility: ${w.visibility} SM
- Ceiling: ${w.ceiling ? w.ceiling + " ft" : "Unlimited"}
- Temp: ${w.temperature}°C` : "No weather data"}

${events?.length > 0 ? `EVENTS:\n${events.map((e: { severity: string; message: string }) => `- [${e.severity}] ${e.message}`).join("\n")}` : "No active events"}

TURNAROUNDS: ${turnarounds.activeCount} on ground, ${turnarounds.recentCount} recent${turnarounds.avgTurnaroundMinutes ? `, avg ${Math.round(turnarounds.avgTurnaroundMinutes)}min` : ""}${turnarounds.longestActiveMinutes ? `, longest ${Math.round(turnarounds.longestActiveMinutes)}min` : ""}

${corridors?.length > 0 ? `CORRIDORS:\n${corridors.map((c: { name: string; healthScore: number; status: string; trend: string }) => `- ${c.name}: H=${Math.round(c.healthScore)}, ${c.status}, trend=${c.trend}`).join("\n")}` : ""}`;

    const text = await callOpenRouter(systemPrompt, userMessage, 500, "Flight Tracker - Airport Intel");

    // Parse risk level from first line
    const riskMatch = text.match(/^\[(\w+)\]/);
    const riskLevel = riskMatch ? riskMatch[1].toLowerCase() : "normal";
    const cleanText = text.replace(/^\[\w+\]\s*/, "");

    // Parse sections
    const sections = cleanText.split("---").map((s: string) => s.trim());
    const analysis = {
      situation: sections[0]?.replace(/^SITUATION\s*/i, "").trim() || cleanText,
      comparison: sections[1]?.replace(/^BASELINE\s*/i, "").trim() || "",
      weatherImpact: sections[2]?.replace(/^WEATHER IMPACT\s*/i, "").trim() || "",
      outlook: sections[3]?.replace(/^OUTLOOK\s*/i, "").trim() || "",
    };

    return NextResponse.json({ analysis, riskLevel, generatedAt: Date.now() });
  } catch (error) {
    console.error("Airport intelligence error:", error);
    return NextResponse.json(
      { error: "Failed to generate airport intelligence" },
      { status: 502 }
    );
  }
}
