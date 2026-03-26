import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter, parseJsonResponse } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { riskyFlights, airports, corridors } = body;

    const systemPrompt = `You are a predictive aviation risk analyst. Given current airspace data, identify entities (flights, airports, corridors) that are trending toward trouble. Produce a JSON response with this exact structure:

{
  "assessments": [
    {
      "entity": "callsign or ICAO code",
      "entityType": "flight" | "airport" | "corridor",
      "riskLevel": "low" | "moderate" | "high" | "critical",
      "reason": "1-2 sentence explanation of WHY this entity is at risk",
      "recommendation": "actionable 1-sentence suggestion"
    }
  ],
  "overallRisk": "low" | "moderate" | "elevated" | "high"
}

Return 3-8 assessments, ranked from highest to lowest risk. Focus on entities showing WORSENING trends, not just current state. Consider compound factors (e.g., high pressure + bad weather + corridor congestion = compounding risk). Return ONLY valid JSON.`;

    const flightData = riskyFlights?.length > 0
      ? riskyFlights.slice(0, 15).map((f: { callsign: string; instabilityScore: number; factors: string; anomalies: string[]; altitude: number | null; speed: number | null }) =>
          `${f.callsign}: Instab=${f.instabilityScore}, Factors=[${f.factors}], Anomalies=[${f.anomalies?.join(",")}], ALT=${f.altitude || "?"}ft, SPD=${f.speed || "?"}kts`
        ).join("\n")
      : "No high-risk flights";

    const airportData = airports?.length > 0
      ? airports.map((a: { icao: string; name: string; pressureScore: number; baselineDeviation: number | null; holdingCount: number; goAroundCount: number; activeEventCount: number }) =>
          `${a.icao} (${a.name}): P=${Math.round(a.pressureScore)}, Dev=${a.baselineDeviation?.toFixed(1) || "?"}, HLD=${a.holdingCount}, G/A=${a.goAroundCount}, Events=${a.activeEventCount}`
        ).join("\n")
      : "No stressed airports";

    const corridorData = corridors?.length > 0
      ? corridors.map((c: { name: string; health: number; status: string; trend: number; trendLabel: string; flights: number }) =>
          `${c.name}: H=${Math.round(c.health)}, Status=${c.status}, Trend=${c.trendLabel} (${c.trend > 0 ? "+" : ""}${c.trend.toFixed(1)}), Flights=${c.flights}`
        ).join("\n")
      : "No degrading corridors";

    const userMessage = `CURRENT AIRSPACE RISK DATA:

HIGH-INSTABILITY FLIGHTS:
${flightData}

STRESSED AIRPORTS:
${airportData}

CORRIDOR CONDITIONS:
${corridorData}

Analyze trends and predict which entities are most likely to deteriorate. Return JSON only.`;

    const text = await callOpenRouter(systemPrompt, userMessage, 800, "Flight Tracker - Risk Assessment");

    const result = parseJsonResponse<{
      assessments: Array<{
        entity: string;
        entityType: string;
        riskLevel: string;
        reason: string;
        recommendation: string;
      }>;
      overallRisk: string;
    }>(text);

    return NextResponse.json({
      assessments: result.assessments || [],
      overallRisk: result.overallRisk || "low",
      generatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Risk assessment error:", error);
    return NextResponse.json(
      { error: "Failed to generate risk assessment" },
      { status: 502 }
    );
  }
}
