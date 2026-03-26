import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { flight, airport, weather, pressure, events, corridor, instability, anomalies } = body;

    const systemPrompt = `You are an aviation delay analyst. Given real-time flight data, airport conditions, weather, congestion metrics, and detected events, provide a clear, concise explanation of why this flight might be experiencing delays or unusual behavior. Structure your response as:

1. A one-sentence summary verdict
2. Contributing factors (bullet points, 2-4 factors)
3. A brief outlook (will it get better/worse)

Be factual and grounded in the data provided. If no clear delay factors exist, say so. Use plain language that a traveler would understand. Keep the total response under 200 words.`;

    const userMessage = `Flight: ${flight.callsign || flight.icao24}
- Status: ${flight.onGround ? "On Ground" : "Airborne"}
- Altitude: ${flight.baroAltitude ? Math.round(flight.baroAltitude * 3.28084) + " ft" : "N/A"}
- Speed: ${flight.velocity ? Math.round(flight.velocity * 1.94384) + " kts" : "N/A"}
- Vertical Rate: ${flight.verticalRate ? Math.round(flight.verticalRate * 196.85) + " fpm" : "N/A"}
- Heading: ${flight.trueTrack ? Math.round(flight.trueTrack) + "°" : "N/A"}

${airport?.nearest ? `Nearest Airport: ${airport.nearest.airport.name} (${airport.nearest.airport.icao}), ${airport.nearest.distanceNm.toFixed(1)}nm away` : ""}
${airport?.departure ? `Departure: ${airport.departure.airport.name} (${airport.departure.airport.icao})` : ""}

${weather ? `Weather at ${weather.station}:
- Category: ${weather.flightCategory}
- Conditions: ${weather.conditions?.join(", ") || "Clear"}
- Wind: ${weather.windDirection}° at ${weather.windSpeed} kts${weather.windGust ? `, gusts ${weather.windGust} kts` : ""}
- Visibility: ${weather.visibility} SM
- Ceiling: ${weather.ceiling ? weather.ceiling + " ft" : "Unlimited"}` : "No weather data available"}

${pressure ? `Airport Pressure (congestion): ${Math.round(pressure.pressureScore)}/100
- Inbound: ${pressure.components.inboundCount}, Outbound: ${pressure.components.outboundCount}
- Ground: ${pressure.components.groundCount}, Holding: ${pressure.components.holdingCount}
- Go-arounds: ${pressure.components.goAroundCount}` : "No pressure data"}

${events && events.length > 0 ? `Active Events:\n${events.map((e: { message: string; severity: string }) => `- [${e.severity}] ${e.message}`).join("\n")}` : "No active events"}

${corridor ? `Corridor: ${corridor.corridorName} — Status: ${corridor.status}, Health: ${corridor.healthScore}/100, Flights: ${corridor.flightCount}` : ""}

${instability ? `Instability Score: ${instability.score}/100\nFactors: ${instability.factors.map((f: { name: string; detail: string }) => `${f.name} (${f.detail})`).join(", ")}` : ""}

${anomalies && anomalies.length > 0 ? `Anomalies: ${anomalies.map((a: { message: string }) => a.message).join("; ")}` : ""}`;

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Flight Tracker - Delay Explainer",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-lite-preview",
        max_tokens: 400,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenRouter delay-explainer error:", err);
      return NextResponse.json(
        { error: "AI analysis failed" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ explanation: text });
  } catch (error) {
    console.error("Delay explainer error:", error);
    return NextResponse.json(
      { error: "Failed to generate explanation" },
      { status: 500 }
    );
  }
}
