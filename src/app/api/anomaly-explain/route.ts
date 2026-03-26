import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flight, anomalies, instability, nearbyAnomalies, airport, corridor } = body;

    const systemPrompt = `You are an aviation safety and operations analyst. Given a flight with detected anomalies, analyze the root cause by connecting weather, airport congestion, corridor conditions, and nearby aircraft behavior. Structure your response as:

ROOT CAUSE: (2-3 sentence hypothesis of why this flight is exhibiting anomalous behavior)
---
FACTORS:
- (contributing factor 1)
- (contributing factor 2)
- (contributing factor 3, etc.)
---
RELATED: (comma-separated callsigns of similarly affected flights, or "None identified")
---
CONFIDENCE: (HIGH/MEDIUM/LOW — based on how much corroborating data exists)
---
WATCH: (1 sentence — what to watch for next)

Focus on environmental and systemic factors (weather, congestion, ATC constraints). Do NOT speculate about pilot error or safety incidents. Be analytical and grounded in the data.`;

    const anomalyList = anomalies?.map((a: { type: string; message: string; severity: string }) =>
      `[${a.severity}] ${a.type}: ${a.message}`
    ).join("\n") || "None";

    const nearbyList = nearbyAnomalies?.length > 0
      ? nearbyAnomalies.map((n: { callsign: string; anomalyTypes: string[]; distance: number }) =>
          `${n.callsign} (${n.distance.toFixed(0)}nm): ${n.anomalyTypes.join(", ")}`
        ).join("\n")
      : "No nearby anomalous aircraft";

    const userMessage = `FLIGHT: ${flight.callsign || flight.icao24}
- Position: ${flight.position?.lat?.toFixed(3)}, ${flight.position?.lon?.toFixed(3)}
- Altitude: ${flight.altitude ? Math.round(flight.altitude) + " ft" : "N/A"}
- Speed: ${flight.speed ? Math.round(flight.speed) + " kts" : "N/A"}
- Vertical Rate: ${flight.verticalRate ? Math.round(flight.verticalRate) + " fpm" : "N/A"}
- Heading: ${flight.heading ? Math.round(flight.heading) + "°" : "N/A"}

ANOMALIES DETECTED:
${anomalyList}

${instability ? `INSTABILITY: ${instability.score}/100\nFactors: ${instability.factors?.map((f: { name: string; detail: string }) => `${f.name} (${f.detail})`).join(", ")}` : ""}

NEARBY ANOMALOUS AIRCRAFT:
${nearbyList}

${airport ? `NEAREST AIRPORT: ${airport.icao} (${airport.name})
${airport.pressure ? `Pressure: ${Math.round(airport.pressure.pressureScore)}/100, Holding: ${airport.pressure.components?.holdingCount || 0}, G/A: ${airport.pressure.components?.goAroundCount || 0}` : "No pressure data"}
${airport.weather ? `Weather: ${airport.weather.flightCategory}, Wind ${airport.weather.windDirection}°@${airport.weather.windSpeed}kts${airport.weather.windGust ? ` G${airport.weather.windGust}` : ""}, Vis ${airport.weather.visibility}SM, Ceiling ${airport.weather.ceiling || "Unlimited"}` : "No weather"}
${airport.activeEvents?.length > 0 ? `Events: ${airport.activeEvents.map((e: { message: string }) => e.message).join("; ")}` : "No events"}` : "No nearby airport data"}

${corridor ? `CORRIDOR: ${corridor.corridorName} — Health=${corridor.healthScore}/100, Status=${corridor.status}` : ""}`;

    const text = await callOpenRouter(systemPrompt, userMessage, 500, "Flight Tracker - Anomaly Explain");

    // Parse sections
    const sections = text.split("---").map((s: string) => s.trim());

    const rootCause = sections[0]?.replace(/^ROOT CAUSE:\s*/i, "").trim() || text;
    const factorsRaw = sections[1]?.replace(/^FACTORS:\s*/i, "").trim() || "";
    const factors = factorsRaw.split("\n").map(f => f.replace(/^-\s*/, "").trim()).filter(Boolean);
    const relatedRaw = sections[2]?.replace(/^RELATED:\s*/i, "").trim() || "";
    const relatedFlights = relatedRaw === "None identified" ? [] : relatedRaw.split(",").map(s => s.trim()).filter(Boolean);
    const confidence = (sections[3]?.replace(/^CONFIDENCE:\s*/i, "").trim().toLowerCase() || "medium") as "high" | "medium" | "low";
    const suggestion = sections[4]?.replace(/^WATCH:\s*/i, "").trim() || "";

    return NextResponse.json({
      rootCause,
      factors,
      relatedFlights,
      confidence,
      suggestion,
    });
  } catch (error) {
    console.error("Anomaly explain error:", error);
    return NextResponse.json(
      { error: "Failed to analyze anomalies" },
      { status: 502 }
    );
  }
}
